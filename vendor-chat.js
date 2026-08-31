/* ============================================================
   vendor-chat.js — page logic for vendor-chat.html, extracted
   out of the page so the SPA router (router.js) can load and
   (re)run it whenever someone navigates here without a full
   page reload.
   ============================================================ */

    const firebaseConfig = {
        apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
        authDomain: "oryzon-50ea4.firebaseapp.com",
        projectId: "oryzon-50ea4",
        storageBucket: "oryzon-50ea4.firebasestorage.app",
        messagingSenderId: "782106742622",
        appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    const params = new URLSearchParams(window.location.search);
   const vendorId = params.get('vendorId') || params.get('with') || 'default'; 
    const isAdmin = params.get('admin') === '1';
   let storeName = params.get('name') || ""; 

    // Real Oryzon account identity — same pattern as chat-interior.html.
    // A customer must be logged into their real Oryzon account to chat, exactly like
    // messaging a business on Instagram/Facebook requires being logged into your own
    // real account there. This is what makes chat history permanent across any device.
    const myUsername = localStorage.getItem('nexus_user_session');
    if (!myUsername) {
        NexusRouter.navigateTo(`login.html?next=${encodeURIComponent(window.location.href)}`);
    }
    function getChatRoomId(a, b) { return [a, b].sort().join('__'); }
    const chatDocId = getChatRoomId(vendorId, myUsername);

    // Firebase Auth restores the persisted login session from IndexedDB asynchronously —
    // every Firestore read/write below must wait for this to resolve, or request.auth
    // will be null even though the person is really logged in.
    let authReadyResolve;
    const authReady = new Promise(res => { authReadyResolve = res; });
    auth.onAuthStateChanged(user => {
        if (!user) {
            console.warn('No active Firebase Auth session — Firestore writes will fail permission checks.');
        }
        authReadyResolve(user);
    });

    let chatHistory = [];
    let renderedMessages = [];
    let isSending = false;
    let replyingTo = null;
    let editingId = null;
    let pendingMedia = [];
    let mcActiveIndex = 0;
    let botActive = true; // whether the AI bot is currently allowed to auto-reply in this chat

    let mediaRecorder = null, audioChunks = [], isRecording = false, isPaused = false, recSeconds = 0, recTimerHandle = null;
    let finalAudioDataUrl = null;
    let audioCtx = null, analyser = null, waveDataArr = null, waveAnimId = null;
    let recordedStream = null;
    let previewSpeed = 1;
    let isScrubbingCompose = false;
    let currentlyPlayingBubbleId = null;

    // ================= FLOATING AVATAR =================
    function makeDraggable(el) {
        let startX, startY, origX, origY, dragging = false, moved = false;
        el.addEventListener('pointerdown', (e) => {
            dragging = true; moved = false;
            startX = e.clientX; startY = e.clientY;
            const rect = el.getBoundingClientRect();
            origX = rect.left; origY = rect.top;
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
            let nx = Math.max(4, Math.min(window.innerWidth - el.offsetWidth - 4, origX + dx));
            let ny = Math.max(4, Math.min(window.innerHeight - el.offsetHeight - 4, origY + dy));
            el.style.left = nx + 'px'; el.style.top = ny + 'px';
        });
        el.addEventListener('pointerup', () => {
            dragging = false;
            const rect = el.getBoundingClientRect();
            localStorage.setItem('il_avatar_pos_' + vendorId, JSON.stringify({ x: rect.left, y: rect.top }));
            if (!moved) handleAvatarTap();
        });
    }
    function restoreAvatarPosition() {
        const el = document.getElementById('floatingAvatar');
        const saved = localStorage.getItem('il_avatar_pos_' + vendorId);
        if (saved) {
            try { const { x, y } = JSON.parse(saved); el.style.left = x + 'px'; el.style.top = y + 'px'; return; } catch(e) {}
        }
        el.style.left = '10px';
        el.style.top = '10px';
    }
    function handleAvatarTap() {
        if (isAdmin) document.getElementById('avatarUploadInput').click();
        else NexusRouter.navigateTo(`me.html?user=${vendorId}`);
    }
    function bindAvatarUploadListener() {
        document.getElementById('avatarUploadInput').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            document.getElementById('avatarCircle').innerHTML = `<img src="${e.target.result}">`;
            try { await db.collection('vendors').doc(vendorId).set({ photoURL: e.target.result }, { merge: true }); showToast('Profile photo updated'); }
            catch(err) { showToast('Could not save photo'); }
        };
        reader.readAsDataURL(file);
    });
    }

    async function loadVendorAvatarAndStatus() {
        try {
            const doc = await db.collection('vendors').doc(vendorId).get();
            const d = doc.exists ? doc.data() : {};
            if (d.photoURL) document.getElementById('avatarCircle').innerHTML = `<img src="${d.photoURL}">`;
            if (d.name) { storeName = d.name; }
            updateStatusDot(d.lastActive);
        } catch(e) { console.warn('vendor status load failed', e); }
    }
    function updateStatusDot(lastActive) {
        const dot = document.getElementById('avatarStatusDot');
        const online = lastActive && (Date.now() - lastActive < 90000);
        dot.classList.toggle('online', !!online);
        dot.classList.toggle('offline', !online);
    }
    let vcStatusIntervalId = null;
    function startVendorStatusPolling() {
        if (vcStatusIntervalId) { clearInterval(vcStatusIntervalId); vcStatusIntervalId = null; }
        if (isAdmin) {
            vcStatusIntervalId = setInterval(() => { db.collection('vendors').doc(vendorId).set({ lastActive: Date.now() }, { merge: true }).catch(()=>{}); }, 20000);
            db.collection('vendors').doc(vendorId).set({ lastActive: Date.now() }, { merge: true }).catch(()=>{});
        } else {
            vcStatusIntervalId = setInterval(async () => {
                try { const doc = await db.collection('vendors').doc(vendorId).get(); updateStatusDot(doc.exists ? doc.data().lastActive : null); } catch(e) {}
            }, 30000);
        }
    }

    // ================= BOT ACTIVE/PAUSED TOGGLE (admin only) =================
    function updateBotToggleUI() {
        if (!isAdmin) return;
        document.getElementById('botToggleBar').classList.add('visible');
        document.getElementById('botToggleDot').className = `bot-toggle-dot ${botActive ? 'on' : 'off'}`;
        document.getElementById('botToggleText').textContent = `Bot: ${botActive ? 'Active' : 'Paused'}`;
    }
    async function toggleBot(e) {
        if (e) e.preventDefault();
        botActive = !botActive;
        try {
            await db.collection('vendorChats').doc(chatDocId).set({ botActive }, { merge: true });
        } catch(err) {}
        updateBotToggleUI();
        showToast(botActive ? 'Bot ya farka' : 'Bot ya tsaya — kai ne kake magana yanzu');
    }
    async function loadBotStatus() {
        try {
            const chatDoc = await db.collection('vendorChats').doc(chatDocId).get();
            botActive = !chatDoc.exists || chatDoc.data().botActive !== false;
        } catch(e) { botActive = true; }
        updateBotToggleUI();
    }

    // ================= WELCOME SPLASH =================
    function playWelcomeSplash() {
        const splash = document.getElementById('welcomeSplash');
        document.getElementById('splashTitle').textContent = storeName ? `Welcome to ${storeName}` : 'Welcome to our page';
        splash.style.display = 'flex';
        splash.classList.remove('hide');
        splash.classList.add('show');
        setTimeout(() => {
            splash.classList.add('hide');
            setTimeout(() => { splash.style.display = 'none'; splash.classList.remove('show'); }, 600);
        }, 1600);
    }

    // ================= FIRESTORE CHAT =================
    async function loadMessagesFromFirestore() {
        try {
            const snap = await db.collection('vendorChats').doc(chatDocId).collection('messages').orderBy('time','asc').get();
            const msgs = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            return msgs;
        } catch (e) { console.error('Firestore load error', e); return []; }
    }
    function localId() { return 'm' + Date.now() + Math.random().toString(36).slice(2,8); }

    async function saveMessageToFirestore(m) {
        try {
            // customerId ana rubuta shi KAWAI daga bangaren customer (ba admin/vendor ba),
            // domin idan vendor ya buɗe wannan chat ɗin, myUsername nasa zai zama account
            // ɗin VENDOR, ba na customer ba — merge:true yana kiyaye tsohon customerId
            // idan wannan write ɗin bai kunshi shi ba.
            const chatMeta = { vendorId, lastActive: Date.now() };
            if (!isAdmin) chatMeta.customerId = myUsername;
            await db.collection('vendorChats').doc(chatDocId).set(chatMeta, { merge: true });
            const ref = await db.collection('vendorChats').doc(chatDocId).collection('messages').add(m);
            return ref.id;
        } catch (e) {
            console.error('Firestore save error', e);
            showToast('⚠️ Sync failed: ' + (e.code || e.message || 'unknown'));
            return 'local' + Date.now() + Math.random().toString(36).slice(2,6);
        }
    }
    async function updateMessageInFirestore(id, patch) {
        try { await db.collection('vendorChats').doc(chatDocId).collection('messages').doc(id).update(patch); } catch(e) {}
    }
    async function deleteMessageInFirestore(id) {
        try { await db.collection('vendorChats').doc(chatDocId).collection('messages').doc(id).delete(); } catch(e) {}
    }
async function clearChatMessages() {
        try {
            const snap = await db.collection('vendorChats').doc(chatDocId).collection('messages').get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        } catch(e) { console.warn('clear chat failed', e); }
}
    async function beginSession() {
        playWelcomeSplash();
        if (params.get('reset') === '1') { await clearChatMessages(); }
        const saved = await loadMessagesFromFirestore();
        if (saved.length > 0) {
            renderedMessages = saved;
            saved.forEach(m => renderMessage(m, false));
            chatHistory = saved.filter(m => m.type === 'text').map(m => ({ role: m.role === 'mine' ? 'user' : 'assistant', content: m.text }));
        } else {
            const greeting = {
                role: 'theirs', type: 'text',
                text: `Welcome to ${storeName} 👑 I'm here to help you find exactly what you're looking for. What can I show you today?`,
                time: Date.now()
            };
            const id = await saveMessageToFirestore(greeting);
            greeting.id = id;
            renderedMessages.push(greeting);
            renderMessage(greeting, true);
        }
        await loadBotStatus();

        // Idan aka zo daga store-front.html/products-page.html tare da wani
        // pre-filled message (misali "Is this still available?"), a tura shi
        // nan take a matsayin sakon customer — TARE DA hoton product ɗin da
        // aka tagged (kamar tsarin pick()) domin vendor ya san akan wane kaya
        // ake magana — sannan a share localStorage domin kada ya sake tura ta.
        const pendingMsg = localStorage.getItem('vc_msg');
        const pendingImg = localStorage.getItem('vc_img');
        if (pendingMsg && !isAdmin) {
            if (pendingImg) {
                const m = { role: 'mine', type: 'image', media: pendingImg, caption: pendingMsg, time: Date.now() };
                const id = await saveMessageToFirestore(m);
                m.id = id;
                renderedMessages.push(m);
                renderMessage(m, true);
                if (botActive) await triggerAIReply(pendingMsg, [{ type: 'image_url', image_url: { url: pendingImg } }]);
            } else {
                const input = document.getElementById('userInput');
                input.value = pendingMsg;
                await sendMessage();
            }
            localStorage.removeItem('vc_msg');
            localStorage.removeItem('vc_name');
            localStorage.removeItem('vc_price');
            localStorage.removeItem('vc_img');
            localStorage.removeItem('vc_sent');

            // Splash screen dinmu na daukar ~2.2s kafin ya boye gaba daya;
            // idan chat din bai cika bayyana ba tukuna, scrollTop na farko
            // baya daidai. Mun sake scroll bayan splash ya kare domin
            // tabbatar da cewa sabon message ya bayyana a kasan page.
            setTimeout(() => {
                const chat = document.getElementById('chat');
                if (chat) chat.scrollTop = chat.scrollHeight;
            }, 2300);
        }
    }

    // ================= TOAST =================
    function showToast(msg) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._hideTimer);
        t._hideTimer = setTimeout(() => t.classList.remove('show'), 1800);
    }

    // ================= RENDERING =================
    function timeStr(ts) { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML; }
    function findMsg(id) { return renderedMessages.find(m => m.id === id); }
    function rebuildChatHistory() {
        chatHistory = renderedMessages.filter(m => m.type === 'text').map(m => ({ role: m.role === 'mine' ? 'user' : 'assistant', content: m.text }));
    }

    function renderImageGrid(mediaArr) {
        const n = mediaArr.length;
        const cls = n === 1 ? 'n1' : n === 2 ? 'n2' : n === 3 ? 'n3' : 'n4plus';
        const shown = cls === 'n4plus' ? mediaArr.slice(0, 4) : mediaArr;
        const extra = n > 4 ? n - 4 : 0;
        return `<div class="img-grid ${cls}">${shown.map((item, i) => {
            const isLast = extra > 0 && i === 3;
            const el = item.type === 'video' ? `<video src="${item.url}"></video>` : `<img src="${item.url}">`;
            return `<div class="gi">${el}${isLast ? `<div class="more-overlay">+${extra}</div>` : ''}</div>`;
        }).join('')}</div>`;
    }

    function bubbleInner(m) {
        let quote = '';
        if (m.replyTo) quote = `<div class="reply-quote"><span class="rq-who">${m.replyTo.role === 'mine' ? 'You' : storeName}</span>${escapeHtml(m.replyTo.snippet)}</div>`;
        const spacerHtml = `<span class="time-spacer">${m.edited ? 'edited ' : ''}${timeStr(m.time)}</span>`;
        let body = '';
        if (m.type === 'imageGroup') body = renderImageGrid(m.mediaArr);
        else if (m.type === 'image') body = `<img class="chat-img" src="${m.media}">`;
        else if (m.type === 'video') body = `<video class="chat-video" src="${m.media}" controls></video>`;
        else if (m.type === 'voice') body = `<div class="voice-note" data-vn-id="${m.id}">
            <div class="vn-play-btn" id="vn-btn-${m.id}" onclick="toggleBubbleAudio('${m.id}')"><i class="fa-solid fa-play" id="vn-icon-${m.id}"></i></div>
            <div class="vn-track" onpointerdown="startBubbleScrub(event,'${m.id}')">
                <div class="vn-track-line"><div class="vn-fill" id="vn-fill-${m.id}"></div><div class="vn-dot" id="vn-dot-${m.id}"></div></div>
            </div>
            <span class="vn-time" id="vn-time-${m.id}">0:00</span>
            <audio id="vn-audio-${m.id}" src="${m.media}" preload="metadata" style="display:none" oncontextmenu="return false"></audio>
        </div>`;
        else body = escapeHtml(m.text) + spacerHtml;
        if (m.caption) body += `<div style="margin-top:6px;">${escapeHtml(m.caption)}${spacerHtml}</div>`;
        return quote + body;
    }

    function renderMessage(m, animate) {
        const chat = document.getElementById('chat');
        const row = document.createElement('div');
        row.className = `msg-row ${m.role === 'mine' ? 'mine' : 'theirs'}${m.type === 'voice' ? ' voice-row' : ''}`;
        row.id = `row-${m.id}`;
        row.dataset.id = m.id;
        if (!animate) row.style.animation = 'none';
        const bubbleClass = m.role === 'mine' ? 'u-bubble' : 'v-bubble';
        const isMedia = ['image','video','voice','imageGroup'].includes(m.type);
        const isVoice = m.type === 'voice';
        row.innerHTML = `<div class="bubble ${bubbleClass}${isMedia ? ' media-bubble' : ''}${isVoice ? ' voice-bubble' : ''}">${bubbleInner(m)}<span class="msg-time-inline">${m.edited ? '<span class="edited-tag">edited</span>' : ''}${timeStr(m.time)}</span></div>`;
        const bubbleEl = row.querySelector('.bubble');
        attachLongPress(bubbleEl, m.id);
        chat.appendChild(row);
        chat.scrollTop = chat.scrollHeight;
        if (m.type === 'voice') wireBubbleAudio(m.id);
    }

    function showTyping() {
        const chat = document.getElementById('chat');
        const row = document.createElement('div');
        row.className = 'msg-row theirs';
        row.id = 'typing-row';
        row.innerHTML = `<div class="bubble v-bubble typing-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
        chat.appendChild(row);
        chat.scrollTop = chat.scrollHeight;
    }
    function hideTyping() { const r = document.getElementById('typing-row'); if (r) r.remove(); }

    // ================= LONG PRESS CONTEXT MENU =================
    function attachLongPress(el, id) {
        let timer = null;
        const start = (e) => { timer = setTimeout(() => openCtxMenu(id, el), 420); };
        const cancel = () => clearTimeout(timer);
        el.addEventListener('touchstart', start, { passive: true });
        el.addEventListener('touchend', cancel);
        el.addEventListener('touchmove', cancel);
        el.addEventListener('contextmenu', (e) => e.preventDefault());
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', cancel);
        el.addEventListener('mouseleave', cancel);
    }
    function openCtxMenu(id, el) {
        const m = findMsg(id);
        if (!m) return;
        if (navigator.vibrate) navigator.vibrate(12);
        el.classList.add('selected-for-menu');
        const menu = document.getElementById('ctxMenu');
        let items = `<div class="ctx-item" onclick="ctxReply('${id}')"><i class="fa-solid fa-reply"></i> Reply</div>`;
        items += `<div class="ctx-item" onclick="ctxCopy('${id}')"><i class="fa-regular fa-copy"></i> Copy</div>
            <div class="ctx-item" onclick="ctxShare('${id}')"><i class="fa-solid fa-share-nodes"></i> Share</div>`;
        if (m.role === 'mine' && m.type === 'text') items += `<div class="ctx-item" onclick="ctxEdit('${id}')"><i class="fa-solid fa-pen"></i> Edit</div>`;
        items += `<div class="ctx-item danger" onclick="ctxDelete('${id}')"><i class="fa-solid fa-trash"></i> Delete</div>`;
        menu.innerHTML = items;
        const rect = el.getBoundingClientRect();
        menu.style.top = Math.min(rect.bottom + 6, window.innerHeight - 220) + 'px';
        menu.style.left = (m.role === 'mine' ? Math.max(rect.right - 180, 10) : rect.left) + 'px';
        menu.classList.add('show');
        document.getElementById('ctxBackdrop').classList.add('show');
        menu._targetEl = el;
    }
    function closeCtxMenu() {
        const menu = document.getElementById('ctxMenu');
        if (menu._targetEl) menu._targetEl.classList.remove('selected-for-menu');
        menu.classList.remove('show');
        document.getElementById('ctxBackdrop').classList.remove('show');
    }
    function snippetOf(m) {
        if (m.type === 'text') return m.text.slice(0, 60);
        if (m.type === 'image') return '📷 Photo';
        if (m.type === 'video') return '🎬 Video';
        if (m.type === 'voice') return '🎤 Voice note';
        return '';
    }
    function ctxReply(id) {
        const m = findMsg(id); closeCtxMenu();
        replyingTo = { id: m.id, role: m.role, snippet: snippetOf(m) };
        document.getElementById('cbLabel').textContent = `Replying to ${m.role === 'mine' ? 'You' : storeName}`;
        document.getElementById('cbText').textContent = replyingTo.snippet;
        document.getElementById('contextBar').classList.add('show');
        document.getElementById('userInput').focus();
    }
    function ctxCopy(id) {
        const m = findMsg(id); closeCtxMenu();
        navigator.clipboard.writeText(m.type === 'text' ? m.text : snippetOf(m)).then(()=>showToast('Copied'));
    }
    function ctxShare(id) {
        const m = findMsg(id); closeCtxMenu();
        const text = m.type === 'text' ? m.text : snippetOf(m);
        if (navigator.share) navigator.share({ text }).catch(()=>{});
        else navigator.clipboard.writeText(text).then(()=>showToast('Copied'));
    }
    function ctxEdit(id) {
        const m = findMsg(id); closeCtxMenu();
        if (m.type !== 'text') return;
        editingId = id;
        document.getElementById('cbLabel').textContent = 'Editing message';
        document.getElementById('cbText').textContent = m.text;
        document.getElementById('contextBar').classList.add('show');
        const input = document.getElementById('userInput');
        input.value = m.text;
        toggleInputUI(input);
        input.focus();
    }
    function ctxDelete(id) {
        closeCtxMenu();
        if (!confirm('Delete this message?')) return;
        renderedMessages = renderedMessages.filter(m => m.id !== id);
        const row = document.getElementById(`row-${id}`);
        if (row) row.remove();
        deleteMessageInFirestore(id);
    }
    function cancelContextBar() {
        const wasEditing = editingId;
        replyingTo = null; editingId = null;
        document.getElementById('contextBar').classList.remove('show');
        if (wasEditing) { const input = document.getElementById('userInput'); input.value = ''; toggleInputUI(input); }
    }

    // ================= PRODUCT SLIDER =================
    let productCatalog = []; // [{name, img, price}]

    async function loadFirestoreProducts() {
        const track = document.getElementById('product-slider');
        try {
            let snapshot;
            if (vendorId && vendorId !== 'default') {
                snapshot = await db.collection('products').where('vendorId', '==', vendorId).get();
                if (snapshot.empty) snapshot = await db.collection('products').where('vendor', '==', vendorId).get();
                if (snapshot.empty) snapshot = await db.collection('products').where('sellerId', '==', vendorId).get();
            } else {
                snapshot = await db.collection('products').limit(10).get();
            }
            let list = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                const imgUrl = d.image || d.img || d.imageUrl || '';
                const name = d.name || d.title || 'Product';
                if (imgUrl) list.push({ img: imgUrl, name, price: d.price || '?' });
            });
            productCatalog = list;
            if (list.length > 0) {
                track.innerHTML = [...list, ...list].map(p => `
                    <div class="slide-card" onclick="pick('${p.name.replace(/'/g,"\\'")}','${p.img}')">
                        <img src="${p.img}" onerror="this.parentElement.style.display='none'">
                        <div class="tag">${p.name}</div>
                    </div>`).join('');
            }
        } catch(err) { console.error('Firebase error:', err); }
    }

    async function pick(name, img) {
        const caption = `Tell me more about ${name}, and how I can place an order.`;
        const m = { role: 'mine', type: 'image', media: img, caption, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);
        if (botActive) await triggerAIReply(caption, [{ type: 'image_url', image_url: { url: img } }]);
    }

    // ================= INPUT BAR =================
    function toggleInputUI(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
        updateActionIcon();
    }
    function openCamera() { document.getElementById('cameraInput').click(); }

    // ---------- full-screen media compose ----------
    function handleMediaSelect(input) {
        const files = Array.from(input.files || []);
        if (!files.length) return;
        pendingMedia = [];
        let remaining = files.length;
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                pendingMedia.push({ type: file.type.startsWith('video') ? 'video' : 'image', dataUrl: e.target.result, mime: file.type, rotation: 0 });
                remaining--;
                if (remaining === 0) openMediaCompose();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    }
    function openMediaCompose() {
        mcActiveIndex = 0;
        document.getElementById('mcCaption').value = '';
        renderMediaComposeViewport();
        renderMediaComposeThumbs();
        document.getElementById('mediaCompose').classList.add('show');
    }
    function renderMediaComposeViewport() {
        const item = pendingMedia[mcActiveIndex];
        const vp = document.getElementById('mcViewport');
        vp.innerHTML = item.type === 'video'
            ? `<video src="${item.dataUrl}" controls style="transform: rotate(${item.rotation}deg)"></video>`
            : `<img src="${item.dataUrl}" style="transform: rotate(${item.rotation}deg)">`;
    }
    function renderMediaComposeThumbs() {
        const strip = document.getElementById('mcThumbs');
        if (pendingMedia.length < 2) { strip.innerHTML = ''; return; }
        strip.innerHTML = pendingMedia.map((m, i) => `
            <div class="mc-thumb ${i === mcActiveIndex ? 'active' : ''}" onclick="setMcActive(${i})">
                ${m.type === 'video' ? `<video src="${m.dataUrl}"></video>` : `<img src="${m.dataUrl}">`}
            </div>`).join('');
    }
    function setMcActive(i) { mcActiveIndex = i; renderMediaComposeViewport(); renderMediaComposeThumbs(); }
    function rotateActiveMedia() {
        pendingMedia[mcActiveIndex].rotation = (pendingMedia[mcActiveIndex].rotation + 90) % 360;
        renderMediaComposeViewport();
    }
    function cancelMediaCompose() {
        pendingMedia = [];
        document.getElementById('mediaCompose').classList.remove('show');
    }
    function rotateImageDataUrl(dataUrl, degrees) {
        return new Promise((resolve) => {
            if (!degrees) { resolve(dataUrl); return; }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const swap = degrees % 180 !== 0;
                canvas.width = swap ? img.height : img.width;
                canvas.height = swap ? img.width : img.height;
                const ctx = canvas.getContext('2d');
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.rotate(degrees * Math.PI / 180);
                ctx.drawImage(img, -img.width/2, -img.height/2);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataUrl;
        });
    }
    async function sendMediaCompose() {
        if (!pendingMedia.length) return;
        const caption = document.getElementById('mcCaption').value.trim();
        const items = [...pendingMedia];
        cancelMediaCompose();

        const finalItems = [];
        for (const it of items) {
            let finalUrl = it.dataUrl;
            if (it.type === 'image' && it.rotation) finalUrl = await rotateImageDataUrl(it.dataUrl, it.rotation);
            finalItems.push({ type: it.type, url: finalUrl });
        }
        const imageContentParts = finalItems.filter(i => i.type === 'image').map(i => ({ type: 'image_url', image_url: { url: i.url } }));

        let m;
        if (finalItems.length === 1) {
            m = { role: isAdmin ? 'theirs' : 'mine', type: finalItems[0].type, media: finalItems[0].url, time: Date.now(), caption: caption || null };
        } else {
            m = { role: isAdmin ? 'theirs' : 'mine', type: 'imageGroup', mediaArr: finalItems, time: Date.now(), caption: caption || null };
        }
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (isAdmin) {
            // Vendor sent media directly to customer — pause bot, no AI call
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();
            return;
        }

        if (!botActive) return; // bot paused, vendor is handling this chat manually

        const videoNote = finalItems.some(i => i.type === 'video') ? "[Customer also sent a video attachment]" : "";
        await triggerAIReply(caption || videoNote || "Please take a look at what I sent.", imageContentParts);
    }

    // ================= VOICE COMPOSE — WhatsApp-style recording/pause/scrub/send =================
    function formatTime(sec) {
        sec = Math.max(0, Math.floor(sec || 0));
        const mm = Math.floor(sec/60), ss = sec%60;
        return `${mm}:${ss.toString().padStart(2,'0')}`;
    }
    function buildWaveBars() {
        document.getElementById('vcWave').innerHTML = Array.from({length: 24}).map(() => `<span></span>`).join('');
    }
    function startWaveVisualizer(stream) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        waveDataArr = new Uint8Array(analyser.frequencyBinCount);
        const bars = document.querySelectorAll('#vcWave span');
        function draw() {
            if (!isRecording || isPaused) return;
            analyser.getByteFrequencyData(waveDataArr);
            bars.forEach((bar, i) => { bar.style.height = Math.max(12, (waveDataArr[i % waveDataArr.length] / 255) * 100) + '%'; });
            waveAnimId = requestAnimationFrame(draw);
        }
        draw();
    }
    function stopWaveVisualizer() {
        if (waveAnimId) cancelAnimationFrame(waveAnimId);
        if (audioCtx) { audioCtx.close().catch(()=>{}); audioCtx = null; }
    }

    function showRecordingRow() {
        document.getElementById('vcTopRowRecording').style.display = 'flex';
        document.getElementById('vcTopRowPreview').style.display = 'none';
        document.getElementById('vcPauseIcon').className = 'fa-solid fa-pause';
        document.getElementById('vcPauseLabel').textContent = 'Pause';
    }
    function showPreviewRow() {
        document.getElementById('vcTopRowRecording').style.display = 'none';
        document.getElementById('vcTopRowPreview').style.display = 'flex';
        document.getElementById('vcPauseIcon').className = 'fa-solid fa-microphone';
        document.getElementById('vcPauseLabel').textContent = 'Resume';
        document.getElementById('vcPreviewTime').textContent = formatTime(recSeconds);
        document.getElementById('vcTrackFill').style.width = '0%';
        document.getElementById('vcTrackDot').style.left = '0%';
        document.getElementById('vcScrubPlayIcon').className = 'fa-solid fa-play vc-scrub-play';
    }

    function updateActionIcon() {
        const input = document.getElementById('userInput');
        const icon = document.getElementById('actionIcon');
        if (isRecording) { icon.className = 'fa-solid fa-paper-plane'; return; }
        icon.className = input.value.trim() !== '' ? 'fa-solid fa-paper-plane' : 'fa-solid fa-microphone';
    }

    async function toggleRecording() {
        if (isRecording) return; // already composing a voice note
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recordedStream = stream;
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = () => {
                stopWaveVisualizer();
                stream.getTracks().forEach(t => t.stop());
                if (mediaRecorder._cancelled) return;
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onload = () => {
                    finalAudioDataUrl = reader.result;
                    if (mediaRecorder._pendingSend) finalizeSendVoice();
                };
                reader.readAsDataURL(blob);
            };
            mediaRecorder.start();
            isRecording = true; isPaused = false; recSeconds = 0;
            previewSpeed = 1;
            document.getElementById('vcSpeedBadge').textContent = '1x';
            buildWaveBars();
            startWaveVisualizer(stream);
            showRecordingRow();
            document.getElementById('voiceCompose').classList.add('show');
            updateActionIcon();
            recTimerHandle = setInterval(() => {
                if (isPaused) return;
                recSeconds++;
                document.getElementById('vcTimer').textContent = formatTime(recSeconds);
            }, 1000);
        } catch(e) { showToast('Microphone access denied'); }
    }

    function togglePauseResume() {
        if (!isRecording) return;
        if (!isPaused) {
            // PAUSE — build a preview from what's recorded so far
            isPaused = true;
            mediaRecorder.pause();
            stopWaveVisualizer();
            try { mediaRecorder.requestData(); } catch(e) {}
            setTimeout(() => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const previewAudio = document.getElementById('vcPreviewAudio');
                previewAudio.src = url;
                previewAudio.playbackRate = previewSpeed;
                showPreviewRow();
            }, 120);
        } else {
            // RESUME recording
            isPaused = false;
            const previewAudio = document.getElementById('vcPreviewAudio');
            previewAudio.pause();
            mediaRecorder.resume();
            startWaveVisualizer(recordedStream);
            showRecordingRow();
        }
    }

    function togglePreviewPlayback() {
        const previewAudio = document.getElementById('vcPreviewAudio');
        const icon = document.getElementById('vcScrubPlayIcon');
        if (previewAudio.paused) {
            previewAudio.play();
            icon.className = 'fa-solid fa-pause vc-scrub-play';
        } else {
            previewAudio.pause();
            icon.className = 'fa-solid fa-play vc-scrub-play';
        }
    }
    function bindPreviewAudioListeners() {
        const previewAudio = document.getElementById('vcPreviewAudio');
        if (!previewAudio) return;
        previewAudio.addEventListener('timeupdate', () => {
            if (!previewAudio.duration || isScrubbingCompose) return;
            const pct = (previewAudio.currentTime / previewAudio.duration) * 100;
            document.getElementById('vcTrackFill').style.width = pct + '%';
            document.getElementById('vcTrackDot').style.left = pct + '%';
            document.getElementById('vcPreviewTime').textContent = formatTime(previewAudio.currentTime);
        });
        previewAudio.addEventListener('ended', () => {
            document.getElementById('vcScrubPlayIcon').className = 'fa-solid fa-play vc-scrub-play';
            document.getElementById('vcPreviewTime').textContent = formatTime(recSeconds);
        });
    }
    function scrubComposeToClientX(clientX) {
        const track = document.getElementById('vcTrack');
        const rect = track.getBoundingClientRect();
        let pct = (clientX - rect.left) / rect.width;
        pct = Math.max(0, Math.min(1, pct));
        const previewAudio = document.getElementById('vcPreviewAudio');
        if (previewAudio.duration) previewAudio.currentTime = pct * previewAudio.duration;
        document.getElementById('vcTrackFill').style.width = (pct*100) + '%';
        document.getElementById('vcTrackDot').style.left = (pct*100) + '%';
    }
    function startScrub(e) {
        if (!isPaused) return;
        isScrubbingCompose = true;
        scrubComposeToClientX(e.clientX);
        const move = (ev) => scrubComposeToClientX(ev.clientX);
        const up = () => {
            isScrubbingCompose = false;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }
    function cycleSpeed() {
        const speeds = [1, 1.5, 2];
        const idx = speeds.indexOf(previewSpeed);
        previewSpeed = speeds[(idx + 1) % speeds.length];
        document.getElementById('vcSpeedBadge').textContent = previewSpeed + 'x';
        document.getElementById('vcPreviewAudio').playbackRate = previewSpeed;
    }

    function cancelRecording() {
        if (!isRecording) return;
        isRecording = false; isPaused = false; clearInterval(recTimerHandle);
        stopWaveVisualizer();
        const previewAudio = document.getElementById('vcPreviewAudio');
        previewAudio.pause(); previewAudio.src = '';
        mediaRecorder._cancelled = true;
        try { mediaRecorder.stop(); } catch(e) {}
        document.getElementById('voiceCompose').classList.remove('show');
        updateActionIcon();
    }

    function sendVoiceCompose() {
        if (!isRecording) return;
        document.getElementById('voiceCompose').classList.remove('show');
        const wasPaused = isPaused;
        isRecording = false; isPaused = false; clearInterval(recTimerHandle);
        stopWaveVisualizer();
        const previewAudio = document.getElementById('vcPreviewAudio');
        previewAudio.pause(); previewAudio.src = '';
        mediaRecorder._pendingSend = true;
        if (wasPaused) {
            // recorder is already paused/stopped state-wise — just stop to flush final blob
            try { mediaRecorder.stop(); } catch(e) { finalizeSendVoice(); }
        } else {
            try { mediaRecorder.stop(); } catch(e) { finalizeSendVoice(); }
        }
        updateActionIcon();
    }

    async function finalizeSendVoice() {
        if (!finalAudioDataUrl) return;
        const dataUrl = finalAudioDataUrl;
        finalAudioDataUrl = null;
        const m = { role: isAdmin ? 'theirs' : 'mine', type: 'voice', media: dataUrl, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (isAdmin) {
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();
            return;
        }
        if (!botActive) return;
        await triggerAIReply("I just sent a voice note. Since you can't listen to audio yet, kindly ask me to type out what I need.", []);
    }

    function handleAction() {
        if (isRecording) { sendVoiceCompose(); return; }
        const icon = document.getElementById('actionIcon');
        if (icon.classList.contains('fa-paper-plane')) sendMessage(); else toggleRecording();
    }

    // ================= CUSTOM PLAYER FOR SENT VOICE BUBBLES (no native menu, WhatsApp-style) =================
    function wireBubbleAudio(id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio || audio.dataset.wired) return;
        audio.dataset.wired = '1';
        audio.addEventListener('loadedmetadata', () => {
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (timeEl && audio.duration && isFinite(audio.duration)) timeEl.textContent = formatTime(audio.duration);
        });
        audio.addEventListener('timeupdate', () => {
            if (!audio.duration || !isFinite(audio.duration)) return;
            const pct = (audio.currentTime / audio.duration) * 100;
            const fill = document.getElementById(`vn-fill-${id}`);
            const dot = document.getElementById(`vn-dot-${id}`);
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (fill) fill.style.width = pct + '%';
            if (dot) dot.style.left = pct + '%';
            if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
        });
        audio.addEventListener('ended', () => {
            const icon = document.getElementById(`vn-icon-${id}`);
            if (icon) icon.className = 'fa-solid fa-play';
            const timeEl = document.getElementById(`vn-time-${id}`);
            if (timeEl && audio.duration) timeEl.textContent = formatTime(audio.duration);
            if (currentlyPlayingBubbleId === id) currentlyPlayingBubbleId = null;
        });
    }
    function toggleBubbleAudio(id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio) return;
        // pause whichever bubble is currently playing (WhatsApp-style single playback)
        if (currentlyPlayingBubbleId && currentlyPlayingBubbleId !== id) {
            const prevAudio = document.getElementById(`vn-audio-${currentlyPlayingBubbleId}`);
            const prevIcon = document.getElementById(`vn-icon-${currentlyPlayingBubbleId}`);
            if (prevAudio) prevAudio.pause();
            if (prevIcon) prevIcon.className = 'fa-solid fa-play';
        }
        const icon = document.getElementById(`vn-icon-${id}`);
        if (audio.paused) {
            audio.play();
            if (icon) icon.className = 'fa-solid fa-pause';
            currentlyPlayingBubbleId = id;
        } else {
            audio.pause();
            if (icon) icon.className = 'fa-solid fa-play';
            currentlyPlayingBubbleId = null;
        }
    }
    function startBubbleScrub(e, id) {
        const audio = document.getElementById(`vn-audio-${id}`);
        if (!audio || !audio.duration || !isFinite(audio.duration)) return;
        const track = e.currentTarget;
        const scrubTo = (clientX) => {
            const rect = track.getBoundingClientRect();
            let pct = (clientX - rect.left) / rect.width;
            pct = Math.max(0, Math.min(1, pct));
            audio.currentTime = pct * audio.duration;
        };
        scrubTo(e.clientX);
        const move = (ev) => scrubTo(ev.clientX);
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }

    // ================= SEND TEXT / AI REPLY =================
    async function sendMessage() {
        if (isSending) return;
        const input = document.getElementById('userInput');
        const text = input.value.trim();
        if (!text) return;

        if (editingId) {
            const idx = renderedMessages.findIndex(x => x.id === editingId);
            const m = idx !== -1 ? renderedMessages[idx] : findMsg(editingId);
            if (m) {
                // If a bot reply immediately followed this message, it answered the OLD text —
                // remove it so the bot can respond fresh to the edited version instead.
                const nextMsg = idx !== -1 ? renderedMessages[idx + 1] : null;
                const staleReply = (nextMsg && nextMsg.role === 'theirs' && nextMsg.type === 'text') ? nextMsg : null;
                if (staleReply) {
                    const staleRow = document.getElementById(`row-${staleReply.id}`);
                    if (staleRow) staleRow.remove();
                    deleteMessageInFirestore(staleReply.id);
                }

                m.text = text; m.edited = true;
                const row = document.getElementById(`row-${editingId}`);
                if (row) row.remove();
                renderedMessages = renderedMessages.filter(x => x.id !== editingId && (!staleReply || x.id !== staleReply.id));
                renderedMessages.push(m);
                renderMessage(m, false);
                updateMessageInFirestore(editingId, { text, edited: true });
                rebuildChatHistory();
            }
            editingId = null;
            cancelContextBar();
            input.value = ''; toggleInputUI(input);

            if (botActive) await triggerAIReply(text, []);
            return;
        }

        const replyPayload = replyingTo;
        cancelContextBar();
        input.value = ''; toggleInputUI(input);

        // ---- VENDOR (admin) SENDING DIRECTLY TO CUSTOMER ----
        if (isAdmin) {
            const m = { role: 'theirs', type: 'text', text, time: Date.now(), replyTo: replyPayload };
            const id = await saveMessageToFirestore(m);
            m.id = id;
            renderedMessages.push(m);
            renderMessage(m, true);
            chatHistory.push({ role: 'assistant', content: text });

            // Pause the bot immediately — vendor is now handling this chat
            await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
            botActive = false;
            updateBotToggleUI();

            // Save this as a learning example so the bot improves for next time
            const lastCustomerMsg = [...renderedMessages].reverse().find(x => x.role === 'mine' && x.type === 'text' && x.id !== m.id);
            if (lastCustomerMsg) {
                db.collection('vendors').doc(vendorId).collection('learningExamples').add({
                    customerMsg: lastCustomerMsg.text,
                    vendorReply: text,
                    time: Date.now()
                }).catch(()=>{});
            }
            return;
        }

        // ---- CUSTOMER SENDING TO VENDOR/BOT ----
        const m = { role: 'mine', type: 'text', text, time: Date.now(), replyTo: replyPayload };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);

        if (!botActive) return; // vendor has taken over this chat manually — bot stays silent

        await triggerAIReply(text, []);
    }

    async function triggerAIReply(text, extraImageParts) {
        isSending = true;
        showTyping();

        let productList = "No products listed yet.";
        try {
            const snap = await db.collection('products').limit(30).get();
            let items = [];
            snap.forEach(doc => {
                const d = doc.data();
               const cleanPrice = String(d.price || '?').replace(/₦/g, '').trim();
                items.push(`- ${d.name || d.title || 'Item'}: ₦${cleanPrice} | ${d.description || d.desc || ''}`); 
            });
            if (items.length > 0) productList = items.join('\n');
        } catch(e) {}

        // ---- VENDOR-SPECIFIC BUSINESS PROFILE ----
        let vendorInfo = "";
        let businessType = "shago na gama-gari";
        try {
            const vDoc = await db.collection('vendors').doc(vendorId).get();
            if (vDoc.exists) {
                const v = vDoc.data();
                businessType = v.businessType || businessType;
                vendorInfo = `
IRIN KASUWANCIN: ${businessType}
SA'O'IN AIKI: ${v.businessHours || 'Ba a saita ba'}
MANUFOFIN DAWO DA KAYA/SERVICE: ${v.returnPolicy || 'Babu dawowa sai an tabbatar da lahani'}
WURI: ${v.location || 'Ba a bayar ba'}
HANYAR BIYAN KUDI: ${v.paymentMethods || 'Bank transfer / Cash on delivery'}
FAQ NA MUSAMMAN:
${(v.customFAQs || []).map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}
TONE/HALIN VENDOR: ${v.toneInstructions || 'Mai kirki, natsuwa, kai tsaye'}`;
            }
        } catch(e) {}

        // ---- LEARN FROM VENDOR'S OWN PAST TAKEOVER REPLIES ----
        let learningExamples = "";
        try {
            const learnSnap = await db.collection('vendors').doc(vendorId).collection('learningExamples')
                .orderBy('time', 'desc').limit(5).get();
            const examples = [];
            learnSnap.forEach(doc => {
                const d = doc.data();
                examples.push(`Customer: "${d.customerMsg}"\nVendor ya amsa: "${d.vendorReply}"`);
            });
            if (examples.length) {
                learningExamples = `\n\nGA YADDA VENDOR KANSA YAKE AMSAWA A IRIN WANNAN YANAYI — KA KWAIKWAYI WANNAN SALON:\n${examples.join('\n\n')}`;
            }
        } catch(e) {}

        const systemPrompt = `Kai ne "Ali", business agent na "${storeName}" — wani ${businessType}. Kai NE mutum, ba robot ba — kana magana kai tsaye da customer kamar yadda gwanin sayarwa a WhatsApp ke yi: da hankali, da natsuwa, da kwarin gwiwa, kuma ba tare da yin roƙo ba.

DOKA TA FI KOWACCE MUHIMMANCI (KADA KA TABA KETARE WANNAN, KO DA TAMBAYA TA YI TSAWO KO TA GAURAYA YARE): Kai KANA JIN HAUSA DA TURANCI DUKA SOSAI DA KYAU, 100%. AN HANA KA GABA DAYA daga fitar da wadannan jimloli ko kwatankwacinsu KO DA A WANI YanaYI: "I don't understand Hausa", "ba na jin Hausa", "I'm working on it", "ina koyon harshen", "I'll message you when I can speak Hausa", ko duk wata magana da ke nuna rashin fahimtar wani yare. IDAN CUSTOMER YA RUBUTA SAKO MAI GAURAYA HARSHE (misali Hausa da Turanci a jumla daya), KA AMSA DA HAUSA TSAFTATACCE koyaushe sai in DUKKAN sakon customer Turanci ne kacal babu ko kalma daya ta Hausa a ciki. Ka amsa kai tsaye kan ainihin abin da customer ya tambaya, koda tambayar tana da sassa da yawa ko doguwa ce — ka rusa ta zuwa amsoshi a takaice daya bayan daya, KADA KA GUJE WA AMSAWA.

MUHIMMAN DOKOKI:
1. HARSHE: KANA JIN HAUSA SOSAI DA KYAU — kada ka taɓa cewa "ba ka jin Hausa" ko "ba ka fahimta ba" game da kowane yare da customer ya yi amfani da shi. Ka gano yarukan da customer yake amfani da shi sannan KA AMSA DA WANNAN YARE DAIDAI. Idan Hausa ce, ka rubuta Hausa TSAFTATACCE, ba fassarar Turanci ba. Idan Turanci ce, ka rubuta Turanci mai inganci.
2. KASANCE MAI SAURI, TAKAITACCE: gajerun jimla, kai tsaye kan batu, kamar rubutun WhatsApp.
3. MUHIMMI SOSAI — KA SANI GA DUKKAN KAYAYYAKI KAWAI DAGA WANNAN JERIN, KADA KA ƘIRƘIRA KOMAI:
${productList}
- Kada ka taɓa cewa "muna da shi" sai idan SUNAN KAYAN yana bayyane KAI TSAYE a cikin jerin da ke sama.
- Kada ka ƙirƙiri farashi, launi, girma (size), ko nau'in kaya (misali "cotton", "lace", "shadda") da BABU SHI a rubuce a jerin — ko da customer ya ambaci wannan kalmar a tambayarsa.
- Idan customer ya tambayi wani abu da BAI BAYYANA A SARARI ba a jerin (misali wani launi ko nau'i na musamman), ka amsa da gaskiya: "Ba mu da wannan a yanzu, amma ga abin da muke da shi: [jera abin da AKWAI a jerin]" — KADA KA CE EE MUNA DA SHI face in yana can a zahiri.
4. IDAN AN AIKA HOTO: ka duba hoton da kyau, ka bayyana abinda kake gani, ka danganta shi da kayayyakinka idan akwai kama a jerin.
5. IDAN CUSTOMER YA TAMBAYI GANIN HOTON KAYA (misali "ina son ganin panties dinku", "what do you have", "hotuna"), KADA KA TURA HOTO NAN TAKE — ka amsa da bayanin kayan a rubuce sannan ka TAMBAYE SHI a fili: "Kana son na tura maka hotuna?"
6. KAR KA TABA TURA HOTO SAI CUSTOMER YA TABBATAR A SARARI (misali ya ce "ee", "eh", "go ahead", "tura", "yes") BAYAN KA TAMBAYE SHI. Idan bai bada izini ba tukuna, KAR KA SAKA [TURA_HOTO] KWATA-KWATA.
7. IDAN CUSTOMER YA TABBATAR (bayan ka tambaya, ya ce ee/go ahead/tura), a KARSHEN sakonka, ka RUBUTA layi na daban KAI TSAYE haka: [TURA_HOTO: Sunan Kaya Daidai Kamar Yadda Yake A Jerin]. Kar ka rubuta wani abu bayan wannan tag din.
8. KASANCE MAI RUFE SAYARWA: bayan bayanin kaya, KA TAMBAYE customer kai tsaye idan yana son ya yi oda.
9. DON KAMMALA ODA: ka tambaya (1) cikakken suna, (2) lambar waya, (3) adireshi, (4) yawan kaya — TAMBAYA DAYA A LOKACI.
10. Ka kasance mai kirki, mai godiya, kuma mai kwarin gwiwa. Kada ka taba fadin karya game da samuwar kaya.
11. IDAN CUSTOMER: (a) ya nemi magana da mutum a fili, (b) yana korafi/fushi, (c) yana neman rangwamen farashi fiye da abin da ka iya bayarwa, (d) tambayarsa ta wuce iyakar abin da ka sani — KADA KA CI GABA DA AMSAWA. A maimakon haka, ka rubuta KAWAI: "Zan tuntubi shugaban shago don taimaka maka nan take." sannan a KARSHEN sakonka ka rubuta layi na daban: [ESCALATE]

MUHIMMI: Kai KAWAI wakilin "${storeName}" ne, wani ${businessType}. Kada ka taɓa yin magana kamar wani nau'in kasuwanci daban — misali idan wannan shago ne na turare, kar ka yi magana kamar kana sayar da na'urorin gida; idan wannan chef ne, kar ka yi magana kamar kana sayar da kaya, sai dai ka karɓi oda na abinci; idan wannan mechanic ne, kai tsaye ka mayar da hankali kan yin booking/tantance matsalar mota, ba tallace-tallacen kaya ba.
${vendorInfo}${learningExamples}`;

        let userContent = [];
        if (extraImageParts && extraImageParts.length) userContent.push(...extraImageParts);
        if (text) userContent.push({ type: 'text', text });
        chatHistory.push({ role: 'user', content: userContent.length === 1 && userContent[0].type === 'text' ? text : userContent });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000);
            const res = await fetch('https://oryzon-backend-ed1q.onrender.com/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    systemPrompt,
                    messages: chatHistory
                })
            });

            clearTimeout(timeoutId);
            const data = await res.json();
            let reply = data.choices?.[0]?.message?.content;
            if (!reply) {
                console.error('API Error:', data.error?.message || JSON.stringify(data).slice(0,200));
                reply = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
                    }
            // ---- fitar da [TURA_HOTO: ...] tag din kafin nuna wa customer ----
            let imageRequest = null;
            const tagMatch = reply.match(/\[TURA_HOTO:\s*(.+?)\]/i);
            if (tagMatch) {
                imageRequest = tagMatch[1].trim();
                reply = reply.replace(/\[TURA_HOTO:.+?\]/i, '').trim();
            }

            // ---- fitar da [ESCALATE] tag din ----
            const escalateMatch = reply.match(/\[ESCALATE\]/i);
            if (escalateMatch) {
                reply = reply.replace(/\[ESCALATE\]/i, '').trim();
            }

            chatHistory.push({ role: 'assistant', content: reply });

            hideTyping();
            const bm = { role: 'theirs', type: 'text', text: reply, time: Date.now() };
            const id = await saveMessageToFirestore(bm);
            bm.id = id;
            renderedMessages.push(bm);
            renderMessage(bm, true);

            if (imageRequest) {
                const sent = await sendSpecificProductImage(imageRequest);
                if (!sent) {
                    const fallbackMsg = { role: 'theirs', type: 'text', text: "Sorry, I couldn't pull up that photo right now — let me know if you'd like to see something else from what we have in stock.", time: Date.now() };
                    const fid = await saveMessageToFirestore(fallbackMsg);
                    fallbackMsg.id = fid;
                    renderedMessages.push(fallbackMsg);
                    renderMessage(fallbackMsg, true);
                }
            }

            if (escalateMatch) {
                await db.collection('vendorChats').doc(chatDocId).set({ botActive: false }, { merge: true });
                botActive = false;
                updateBotToggleUI();
                fetch('https://oryzon-backend-ed1q.onrender.com/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: vendorId,
                        title: '⚠️ Customer yana bukatar ka',
                        body: text.slice(0, 80),
                        data: { url: window.location.href }
                    })
                }).catch(()=>{});
            }
        } catch(e) {
            hideTyping();
            console.error('AI request failed:', e.name, e.message);
            const errMsg = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
            const bm = { role: 'theirs', type: 'text', text: errMsg, time: Date.now() };
            renderedMessages.push(bm);
            renderMessage(bm, true);
    }
        isSending = false;
    }

    async function sendSpecificProductImage(productName) {
        if (!productCatalog.length) {
            console.warn('sendSpecificProductImage: product catalog is empty, requested:', productName);
            return false;
        }
        const match = productCatalog.find(p => p.name.toLowerCase().includes(productName.toLowerCase()))
            || productCatalog.find(p => productName.toLowerCase().includes(p.name.toLowerCase()));
        if (!match) {
            console.warn('sendSpecificProductImage: no matching product found for:', productName, '— available:', productCatalog.map(p => p.name));
            return false;
        }
        const m = { role: 'theirs', type: 'image', media: match.img, caption: `${match.name} — ₦${match.price}`, time: Date.now() };
        const id = await saveMessageToFirestore(m);
        m.id = id;
        renderedMessages.push(m);
        renderMessage(m, true);
        return true;
            }

    // ================= INIT =================
    async function bootVendorChat() {
        bindAvatarUploadListener();
        bindPreviewAudioListeners();
        startVendorStatusPolling();
        await authReady;
        loadFirestoreProducts();
        makeDraggable(document.getElementById('floatingAvatar'));
        restoreAvatarPosition();
        await loadVendorAvatarAndStatus();
        beginSession();
    }

    function destroyVendorChat() {
        if (vcStatusIntervalId) { clearInterval(vcStatusIntervalId); vcStatusIntervalId = null; }
        if (recTimerHandle) { clearInterval(recTimerHandle); recTimerHandle = null; }
        if (waveAnimId) { cancelAnimationFrame(waveAnimId); waveAnimId = null; }
        if (recordedStream) { try { recordedStream.getTracks().forEach(t => t.stop()); } catch(e) {} recordedStream = null; }
    }

    if (window.NexusRouter) {
        NexusRouter.registerPage('vendor-chat.html', {
            init: bootVendorChat,
            destroy: destroyVendorChat
        });
    }

    /* Boot once for this script's own load — see the matching comment in
       shop.js for why the readyState check is needed. */
    if (document.readyState !== 'complete') {
        bootVendorChat();
    }
