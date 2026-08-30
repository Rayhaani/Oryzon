/* ============================================================
   CHATS.JS — dedicated page script na chats.html, SPA-ready.
   ------------------------------------------------------------
   An fitar da wannan daga tsohon inline <script> guda 4 da suka
   kasance a cikin chats.html (babban script + 3 module IIFE:
   status/updates engine, story-matrix/viewer engine, new-message
   contacts module). An canza dukkan DOMContentLoaded/top-level
   immediate calls zuwa runOnChatsInit(fn), domin su sake gudana
   a KOWANE SPA re-entry zuwa chats.html, ba sau daya kacal ba.

   Ana loda wannan file KAFIN ana kiran initChatsPage() — ko dai
   ta hanyar <script src="chats.js"> na al'ada (full/native load),
   ko ta router.js PAGE_SCRIPTS['chats.html'] (SPA navigation).
   ============================================================ */

        // ------------------------------------------------------------------
        // FIREBASE / GLOBALS BOOTSTRAP — SPA-safe.
        //
        // chats.html na iya budewa ta hanyoyi biyu:
        //   1) Kai-tsaye/native (mutum ya buɗe chats.html kai-tsaye, ko ya
        //      yi refresh) — a nan BABU nexus-core.js da aka loda, don haka
        //      babu db/BACKEND_URL/firebaseConfig da suka wanzu tukuna, sai
        //      MU KANMU mu kirkire su.
        //   2) SPA navigation daga social.html/services.html — waɗannan
        //      pages sun RIGA sun loda nexus-core.js a <head>, wanda YA
        //      RIGA ya ayyana 'const BACKEND_URL', 'const firebaseConfig',
        //      da 'const db' a matsayin GLOBAL bindings (Script Scope).
        //
        // Idan a yanayi (2) mu MA muka yi 'const db = ...' a nan, JavaScript
        // zai jefa "Identifier 'db' has already been declared" — kuma wannan
        // KUSKURE NE NA PARSE-TIME wanda zai KASHE DUK chats.js gaba ɗaya,
        // ko da an rufe shi cikin 'if'. Saboda haka a NAN BA MU TABA amfani
        // da const/let/var domin 'db'/'BACKEND_URL'/'firebaseConfig' a wannan
        // matakin ba — sai kawai `typeof x === 'undefined'` (wanda shine
        // KAƊAI hanyar bincike amincin JS, ba ya jefa error) + assignment
        // kan `window.x` (wanda ba shi da alaƙa da lexical declaration, don
        // haka ba ya karo da nexus-core.js ko da wanne bangare ya fara).
        // ------------------------------------------------------------------
        if (typeof BACKEND_URL === 'undefined') {
            window.BACKEND_URL = 'https://oryzon-backend-ed1q.onrender.com'; // Backblaze upload endpoint — ana amfani da wannan a updates/status modules
        }

        if (typeof db === 'undefined') {
            const __chatsFirebaseConfig = {
                apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
                authDomain: "oryzon-50ea4.firebaseapp.com",
                databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
                projectId: "oryzon-50ea4",
                storageBucket: "oryzon-50ea4.firebasestorage.app",
                messagingSenderId: "782106742622",
                appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
                measurementId: "G-K5085DLL2W"
            };
            if (!firebase.apps.length) { firebase.initializeApp(__chatsFirebaseConfig); }
            window.db = firebase.firestore();
        }

        if (typeof myId === 'undefined') {
            // nexus-core.js yana amfani da sunan 'currentUser' (daidai
            // darajarsu ne, daga localStorage guda) — babu haɗuwa da 'myId'
            // a yanzu, amma an bar wannan guard domin aminci a nan gaba.
            window.myId = localStorage.getItem("nexus_user_session");
        }

        // ------------------------------------------------------------------
        // INIT CALLBACK REGISTRY — kowane abinda a baya yake DOMContentLoaded
        // ko top-level immediate call yanzu ana rajistar shi anan ta hanyar
        // runOnChatsInit(fn), sannan initChatsPage() (a ƙarshen wannan file)
        // ke gudanar da su duka — KOWANE LOKACI mutum ya shigo chats.html,
        // ko na farko (native/full load) ko kuma SPA re-entry.
        // ------------------------------------------------------------------
        const __chatsInitCallbacks = [];
        function runOnChatsInit(fn) { __chatsInitCallbacks.push(fn); }

        // Groups na gaskiya — karanta ta users/{myId}/myGroups (index da
        // group.html ke rubutawa a lokacin JOIN), ba wata collectionGroup
        // query mai bude membership na DUK groups a database ba. Muna
        // fetch kowanne group doc daga ID din da ke cikin index din domin
        // mu samu sunansa/hoto na yanzu (live), ba tsohon data da aka
        // ajiye ba a lokacin join.
        async function renderMyGroups() {
            if (!myId || typeof db === 'undefined') return;
            try {
                const groupIds = await getMyMembershipIds('members');
                const container = document.getElementById('groups');
                if (!container || !groupIds.length) return;
                const groupDocs = await Promise.all(groupIds.map(id => db.collection('groups').doc(id).get()));
                groupDocs.filter(g => g.exists).forEach(g => {
                    const data = g.data();
                    const gid = g.id;
                    const row = document.createElement('a');
                    row.href = `group.html?group=${encodeURIComponent(gid)}`;
                    row.setAttribute('data-spa-link', `group.html?group=${encodeURIComponent(gid)}`);
                    row.className = 'chat-item';
                    row.innerHTML = `
                        <div class="profile-stack" data-avatar-kind="group" data-avatar-key="${gid}" data-chat-href="group.html?group=${gid}" data-info-href="group.html?group=${gid}" onclick="handleAvatarTap(event)">
                            <img src="${data.avatarUrl || 'https://via.placeholder.com/46/00F2FF/000?text=' + encodeURIComponent((data.name || 'G')[0])}" class="user-img" style="border-radius: 12px;">
                        </div>
                        <div class="chat-details">
                            <div class="chat-header"><span class="name">${data.name || 'Group'}</span><span class="time">${formatChatTime(tsToMillis(data.createdAt))}</span></div>
                            <p class="preview-text">${data.privacy === 'private' ? 'Private group' : 'Public group'} · ${(data.memberCount || 0)} members</p>
                        </div>`;
                    container.insertBefore(row, container.firstChild);
                });
            } catch (err) {
                console.error('renderMyGroups error:', err);
            }
        }
       runOnChatsInit(renderMyGroups);

        async function renderMyPages() {
            if (!myId || typeof db === 'undefined') return;
            try {
                const pageIds = await getMyMembershipIds('followers');
                const container = document.querySelector('#pages .pages-vertical-list');
                if (!container || !pageIds.length) return;
                const pageDocs = await Promise.all(pageIds.map(id => db.collection('pages').doc(id).get()));
                pageDocs.filter(p => p.exists).forEach(p => {
                    const data = p.data();
                    const pid = p.id;
                    const row = document.createElement('div');
                    row.className = 'page-list-item';
                    row.onclick = () => {
                        const url = `pages.html?page=${encodeURIComponent(pid)}`;
                        if (window.NexusRouter && typeof window.NexusRouter.navigateTo === 'function') {
                            window.NexusRouter.navigateTo(url);
                        } else {
                            window.location.href = url;
                        }
                    };
                    row.innerHTML = `
                        <div class="page-info-block">
                            <img src="${data.avatarUrl || 'https://via.placeholder.com/50/111?text=' + encodeURIComponent(data.initials || 'P')}" class="page-avatar" data-avatar-kind="page" data-avatar-key="${pid}" data-chat-href="pages.html?page=${pid}" data-info-href="pages.html?page=${pid}" onclick="handleAvatarTap(event)">
                            <div class="page-text-meta">
                                <h3>${data.name || 'Page'}</h3>
                                <p>${data.description || ((data.followerCount || 0) + ' followers')}</p>
                            </div>
                        </div>
                        <div class="page-action-view">${formatChatTime(tsToMillis(data.createdAt))}</div>`;
                    container.insertBefore(row, container.firstChild);
                });
            } catch (err) {
                console.error('renderMyPages error:', err);
            }
        }
        runOnChatsInit(renderMyPages);

        async function renderMyChannels() {
            if (!myId || typeof db === 'undefined') return;
            try {
                const channelIds = await getMyMembershipIds('subscribers');
                const container = document.querySelector('#channels .pages-vertical-list');
                if (!container || !channelIds.length) return;
                const channelDocs = await Promise.all(channelIds.map(id => db.collection('channels').doc(id).get()));
                channelDocs.filter(c => c.exists).forEach(c => {
                    const data = c.data();
                    const cid = c.id;
                    const row = document.createElement('div');
                    row.className = 'page-list-item';
                    row.onclick = () => { window.location.href = `channels.html?channel=${encodeURIComponent(cid)}`; };
                    row.innerHTML = `
                        <div class="page-info-block">
                            <img src="${data.avatarUrl || 'https://via.placeholder.com/50/00F2FF/000?text=' + encodeURIComponent(data.initials || 'C')}" class="page-avatar" data-avatar-kind="channel" data-avatar-key="${cid}" data-chat-href="channels.html?channel=${cid}" data-info-href="channels.html?channel=${cid}" onclick="handleAvatarTap(event)">
                            <div class="page-text-meta">
                                <h3>${data.name || 'Channel'}</h3>
                                <p>${data.description || ((data.subscriberCount || 0) + ' subscribers')}</p>
                            </div>
                        </div>
                       <div class="page-action-view">${formatChatTime(tsToMillis(data.createdAt))}</div>`;  
                    container.insertBefore(row, container.firstChild);
                });
            } catch (err) {
                console.error('renderMyChannels error:', err);
            }
        }
        runOnChatsInit(renderMyChannels);

        if (!myId) window.location.href = 'login.html';
        // Jiran Firebase Auth ya farfaɗo session kafin a yi query
        let authReadyResolve;
        const authReadyPromise = new Promise((resolve) => { authReadyResolve = resolve; });
        firebase.auth().onAuthStateChanged((user) => { authReadyResolve(user); });

        let selectedNodes = [];
        let identifiedContacts = new Set(); 
        let currentPortalMode = "menu"; 

        function formatChatTime(ts) {
    if (!ts) return "";
    const now = new Date();
    const msgDate = new Date(ts);
    const diffMin = (now - msgDate) / 60000;

    if (diffMin < 1) return "Now";

    if (now.toDateString() === msgDate.toDateString()) {
        let hours = msgDate.getHours();
        const minutes = msgDate.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12; hours = hours ? hours : 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    // Kwatanta midnight-to-midnight domin daidaiton kirga kwanaki
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMsgDate = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    const daysDiff = Math.round((startOfToday - startOfMsgDate) / 86400000);

    if (daysDiff === 1) return "Yesterday";

    // Daga kwana 2 zuwa kwana 6 da suka wuce: nuna sunan ranar (Monday, Tuesday, da sauransu)
    // Ba mu wuce kwana 6 ba domin idan mun kai kwana 7, ranar za ta zagayo ta zama
    // daidai da ranar yau, wanda zai rikita mutane.
    if (daysDiff >= 2 && daysDiff <= 6) {
        return msgDate.toLocaleDateString('en-US', { weekday: 'long' });
    }

    const dd = msgDate.getDate().toString().padStart(2, '0');
    const mm = (msgDate.getMonth() + 1).toString().padStart(2, '0');
    return `${dd}/${mm}/${msgDate.getFullYear()}`;
        }

function refreshAllChatTimes() {
    document.querySelectorAll('.time[data-ts]').forEach(el => {
        const ts = parseInt(el.getAttribute('data-ts'), 10);
        if (ts) el.textContent = formatChatTime(ts);
    });
}
let refreshChatTimesInterval = setInterval(refreshAllChatTimes, 30000);

        function b64decodeBytes(str) {
            const binary = atob(str);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }
        let myE2EPrivateKeyPromise = null;
        function getMyE2EPrivateKey() {
            if (myE2EPrivateKeyPromise) return myE2EPrivateKeyPromise;
            myE2EPrivateKeyPromise = (async () => {
                const storedPriv = localStorage.getItem('nexus_e2e_priv_' + myId);
                if (!storedPriv) return null;
                const privJwk = JSON.parse(storedPriv);
                return crypto.subtle.importKey('jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']);
            })();
            return myE2EPrivateKeyPromise;
        }
        const e2eSharedKeyCache = {};
        function getSharedKeyWithPeer(peerId) {
            if (e2eSharedKeyCache[peerId]) return e2eSharedKeyCache[peerId];
            const p = (async () => {
                try {
                    const myPrivateKey = await getMyE2EPrivateKey();
                    if (!myPrivateKey) return null;
                    const peerDoc = await db.collection('users').doc(peerId).get();
                    const peerData = peerDoc.data();
                    if (!peerData || !peerData.e2ePublicKey) return null;
                    const peerPubKey = await crypto.subtle.importKey('jwk', peerData.e2ePublicKey, { name: 'ECDH', namedCurve: 'P-256' }, true, []);
                    return await crypto.subtle.deriveKey(
                        { name: 'ECDH', public: peerPubKey }, myPrivateKey,
                        { name: 'AES-GCM', length: 256 }, false, ['decrypt']
                    );
                } catch (e) { console.error('getSharedKeyWithPeer error:', e); return null; }
            })();
            e2eSharedKeyCache[peerId] = p;
            return p;
        }
        async function decryptLastMessagePreview(peerId, encData) {
            try {
                const key = await getSharedKeyWithPeer(peerId);
                if (!key) return null;
                const iv = b64decodeBytes(encData.iv);
                const ctBytes = b64decodeBytes(encData.ciphertext);
                const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ctBytes);
                const jsonStr = new TextDecoder().decode(ptBuf);
                try { return JSON.parse(jsonStr).text || jsonStr; }
                catch (e) { return jsonStr; }
            } catch (e) { console.error('decryptLastMessagePreview error:', e); return null; }
        }

        async function loadChats() {
            const container = document.getElementById('chats-list-container');
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading...</p>';

            await authReadyPromise;
            if (!firebase.auth().currentUser) {
                container.innerHTML = '<p style="text-align:center; padding:30px; color:#ff4444; font-size:13px;">Ba a tabbatar da shiga ba. Sake login.</p>';
                return;
            }

            try {
                const snapshot = await db.collection("personalChats").get({ source: 'server' });
        container.innerHTML = '';
                let hasChats = false;
                let unreadSenderCount = 0;
                identifiedContacts.clear(); 

                snapshot.forEach(doc => {
                    const chatId = doc.id;
                    if (!chatId.includes(myId)) return;

                    const parts = chatId.split('__');
                    if (parts.length < 2) return; 
                    const rawUser = parts[0] === myId ? parts[1] : parts[0];
                    if (!rawUser || rawUser === myId) return;
                    
                    identifiedContacts.add(rawUser);
                        
                    const initialName = rawUser.charAt(0).toUpperCase() + rawUser.slice(1);
                    const data = doc.data();
                    const lastMsg = data.lastMessage || "Tap to open chat";
                    
                    const lastTime = formatChatTime(data.lastMessageTime);
                    
                    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${rawUser}`;
                    hasChats = true;
                    
                    console.log('DEBUG CHAT ROW →', rawUser, '| FULL DATA=', JSON.stringify(data));
                    const unreadNum = data.unreadCount && data.unreadCount[myId] > 0 ? data.unreadCount[myId] : 0;
                    const unreadLabel = unreadNum > 99 ? '99+' : unreadNum;
                    if (unreadNum > 0) unreadSenderCount++;

                    const personalChatHref = `chat-interior.html?with=${encodeURIComponent(rawUser)}&avatar=${encodeURIComponent(avatarUrl)}`;
                    container.insertAdjacentHTML('beforeend', `
                        <a href="${personalChatHref}" class="chat-item" id="chat-link-${rawUser}">
                            <div class="profile-stack" id="stack-${rawUser}" data-online="false"
                                 data-avatar-kind="personal" data-avatar-key="${rawUser}"
                                 data-chat-href="${personalChatHref}"
                                 data-info-href="me.html?user=${encodeURIComponent(rawUser)}"
                                 onclick="handleAvatarTap(event)">
                                <img src="${avatarUrl}" id="avatar-${rawUser}" class="user-img">
                            </div>
                            <div class="chat-details">
                                <span class="name" id="name-${rawUser}">${initialName}</span>
                               <p class="preview-text" id="preview-${rawUser}">${lastMsg}</p>
                            </div>
                            <div class="chat-meta">
                                <span class="time" data-ts="${data.lastMessageTime || ''}">${lastTime}</span>
                                ${unreadNum > 0 ? `<span class="wa-unread-badge">${unreadLabel}</span>` : ''}
                            </div>
                        </a>
                   `);

                    if (data.lastMessageEnc && data.lastMessageEnc.ciphertext) {
                        decryptLastMessagePreview(rawUser, data.lastMessageEnc).then(decrypted => {
                            if (decrypted) {
                                const el = document.getElementById(`preview-${rawUser}`);
                                if (el) el.textContent = decrypted.length > 60 ? decrypted.substring(0, 60) + '…' : decrypted;
                            }
                        });
                    }

                    db.collection('users').doc(rawUser).get().then(userDoc => { 
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            const fullName = userData.fullName || userData.name || userData.username;
                            if (fullName) {
                                const nameSpan = document.getElementById(`name-${rawUser}`);
                                if (nameSpan) {
                                    nameSpan.textContent = fullName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                }
                                const overlayNameSpan = document.getElementById(`overlay-name-${rawUser}`);
                                if (overlayNameSpan) {
                                    overlayNameSpan.textContent = fullName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                                }
                            }
                            const stackEl = document.getElementById(`stack-${rawUser}`);
                            if (userData.userProfilePic) {
                                const img = document.getElementById(`avatar-${rawUser}`);
                                if (img) img.src = userData.userProfilePic;
                                
                                const overlayImg = document.getElementById(`overlay-avatar-${rawUser}`);
                                if (overlayImg) overlayImg.src = userData.userProfilePic;

                                if (stackEl) stackEl.setAttribute('data-chat-href', `chat-interior.html?with=${encodeURIComponent(rawUser)}&avatar=${encodeURIComponent(userData.userProfilePic)}`);
                            }
                            if (stackEl) stackEl.setAttribute('data-online', userData.isOnline === true ? 'true' : 'false');
                        }
                    });
                    
                });

                if (!hasChats) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No messages yet</p>';
                }

                injectRealFirebaseContacts();
                updateSmartBtnBadge('personal', unreadSenderCount);
            } catch(err) {
                console.error("Chat load error:", err);
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading chats</p>';
            }
        }

     function injectRealFirebaseContacts() {
            const listBody = document.getElementById('carpet-contacts-list');
            const searchEl = document.getElementById('gioSearchInput');
            const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
            let list = friendsDataCache.slice();
            if (q) list = list.filter(f => f.fullName.toLowerCase().includes(q));

            listBody.innerHTML = '';

            if (friendsDataCache.length === 0) {
                listBody.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No friends yet — when you and someone follow each other, they\'ll show up here automatically.</p>';
                return;
            }
            if (list.length === 0) {
                listBody.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No contacts match this search</p>';
                return;
            }

            // Ainihin friendRowHtml() layout (.friend-row-flex / .chat-item /
            // .profile-stack / .chat-details / .preview-text) — daidai
            // yadda Friends tab ke nunawa, kawai an kara ƙaramin checkmark
            // badge domin selection maimakon cikakken row highlight.
            list.forEach(f => {
                const contactUsername = f.otherUser;
                const isSelected = selectedNodes.includes(contactUsername);
                const statusLine = lastSeenLabel(f.isOnline, f.lastSeenMillis, f.isDeleted, f.isDeactivated);

                listBody.insertAdjacentHTML('beforeend', `
                    <div class="friend-row-flex" data-contact="${contactUsername}" onclick="toggleNodeSelection(this, '${contactUsername}')">
                        <div class="chat-item" style="flex:1;">
                            <div class="profile-stack" style="position:relative;">
                                <img src="${f.avatarUrl}" id="overlay-avatar-${contactUsername}" class="user-img">
                                <div class="gio-check-badge" style="display:${isSelected ? 'flex' : 'none'};">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            </div>
                            <div class="chat-details">
                                <span class="name" id="overlay-name-${contactUsername}">${f.fullName}</span>
                                <p class="preview-text" style="margin:0;">${statusLine}</p>
                            </div>
                        </div>
                    </div>
                `);
            });
        } 
        function filterInviteContacts(query) {
            injectRealFirebaseContacts();
        }

        async function openGroupInviteOverlay(mode) {
            if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
            currentPortalMode = mode;
            selectedNodes = [];
            const titles = { group: 'New Group', page: 'New Page', channel: 'New Channel' };
            document.getElementById('gioTitle').textContent = titles[mode] || 'New';
            document.getElementById('gioSearchInput').value = '';
            document.getElementById('groupInviteOverlay').classList.add('gio-open');
            if (!friendsDataCache.length && typeof loadFriendsList === 'function') await loadFriendsList();
            injectRealFirebaseContacts();
            renderSelectedChips();
        }

        function closeGroupInviteOverlay() {
            document.getElementById('groupInviteOverlay').classList.remove('gio-open');
        }  

       function toggleNodeSelection(element, contact) {
            if(navigator.vibrate) navigator.vibrate(12);
            const badge = element.querySelector('.gio-check-badge');
            if (selectedNodes.includes(contact)) {
                selectedNodes = selectedNodes.filter(id => id !== contact);
                if (badge) badge.style.display = 'none';
            } else {
                selectedNodes.push(contact);
                if (badge) badge.style.display = 'flex';
            }
            renderSelectedChips();
        }

        function removeSelectedNode(contact) {
            if(navigator.vibrate) navigator.vibrate(10);
            selectedNodes = selectedNodes.filter(id => id !== contact);
            document.querySelectorAll('.friend-row-flex').forEach(node => {
                if (node.getAttribute('data-contact') === contact) {
                    const badge = node.querySelector('.gio-check-badge');
                    if (badge) badge.style.display = 'none';
                }
            });
            renderSelectedChips();
        } 

       function renderSelectedChips() {
            const row = document.getElementById('selectedChipsRow');
            const btn = document.getElementById('portalSubmitActionButton');
            const subtitle = document.getElementById('gioSubtitle');
            if (!row) return;
            if (selectedNodes.length === 0) {
                row.style.display = 'none';
                row.innerHTML = '';
            } else {
                row.style.display = 'flex';
                row.innerHTML = selectedNodes.map(u => {
                    const avatarEl = document.getElementById(`overlay-avatar-${u}`);
                    const src = avatarEl ? avatarEl.src : `https://api.dicebear.com/7.x/bottts/svg?seed=${u}`;
                    const friend = friendsDataCache.find(f => f.otherUser === u);
                    const label = friend ? friend.fullName : (u.charAt(0).toUpperCase() + u.slice(1));
                    return `<span class="selected-chip" onclick="removeSelectedNode('${u}')"><img src="${src}"><span>${label}</span></span>`;
                }).join('');
            }
            if (subtitle) {
                subtitle.textContent = selectedNodes.length
                    ? `${selectedNodes.length} of ${friendsDataCache.length} selected`
                    : 'Who would you like to add?';
            }
            if (btn) {
                btn.style.opacity = selectedNodes.length ? '1' : '0.4';
                btn.style.pointerEvents = selectedNodes.length ? 'auto' : 'none';
            }
        } 
        function openCarpetPortal() {
            if(navigator.vibrate) navigator.vibrate([15, 10, 15]);
            backToPortalMenu(); 
            document.getElementById('carpetPortal').classList.add('unrolled');
        }

        
      document.addEventListener('click', function(e) {
    const portal = document.getElementById('carpetPortal');
    if (!portal) return; // an bar chats.html zuwa wata page ta SPA — babu abinda za a yi
    const plusBtn = e.target.closest('[onclick="openCarpetPortal()"]');
    if (!portal.contains(e.target) && !plusBtn) {
        closeCarpetPortal();
    }
});
        
        
        function closeCarpetPortal() {
            document.getElementById('carpetPortal').classList.remove('unrolled');
        }

       function triggerOptionAction(action) {
            if(navigator.vibrate) navigator.vibrate(15);
            
            if (action === 'status') {
                closeCarpetPortal();
                openStoryViewer('my-status');
                return;
            }

            closeCarpetPortal();
            openGroupInviteOverlay(action);
        } 

        function backToPortalMenu() {
            if(navigator.vibrate) navigator.vibrate(10);
            currentPortalMode = "menu";
            selectedNodes = [];
            document.querySelectorAll('.cyber-contact-node').forEach(node => node.classList.remove('selected'));
            renderSelectedChips();
            
            document.getElementById('portalMainMenuOptions').style.display = 'flex';
            document.getElementById('portalContactsSubView').style.display = 'none';
            document.getElementById('portalBackBtn').style.display = 'none';
            document.getElementById('portalMainHeadline').textContent = "";
        }

        // Wannan array din yana zama a memory kadai (babu sessionStorage
        // bukata yanzu) tunda create-overlay din yanzu suna a wannan page
        // guda daya da groupInviteOverlay — Phase 2/3 (page/channel) za su
        // sake amfani da wannan array guda daya.
        let pendingInvites = [];

        function initializeGroupFromOverlay() {
            if(selectedNodes.length === 0) return alert("Zaɓi aƙalla mutum ɗaya kafin ka ci gaba.");
            pendingInvites = selectedNodes.map(username => {
                const avatarEl = document.getElementById(`overlay-avatar-${username}`);
                return { username, avatarUrl: avatarEl ? avatarEl.src : '' };
            });
            closeGroupInviteOverlay();
           if (currentPortalMode === 'group') {
                openGroupCreateOverlay();
            } else if (currentPortalMode === 'page') {
                openPageCreateOverlay();
            } else if (currentPortalMode === 'channel') {
                openChannelCreateOverlay();
            } 
    }

        // ================================================================
        // GROUP CREATE OVERLAY — Phase 1 logic (daga group-create.html,
        // an daidaita don amfani da 'db', 'myId', 'authReadyPromise' da
        // suka riga sun wanzu a babban script na chats.html).
        // ================================================================
        let gcoSelectedPrivacy = 'public';
        let gcoSlugCheckToken = 0;

        function openGroupCreateOverlay() {
            document.getElementById('gcoName').value = '';
            document.getElementById('gcoDesc').value = '';
            gcoSelectedPrivacy = 'public';
            document.getElementById('gcoRadioPublic').classList.add('checked');
            document.getElementById('gcoRadioPrivate').classList.remove('checked');
            gcoUpdateCounts();
            document.getElementById('gcoSlugPreview').textContent = '';
            document.getElementById('gcoSlugPreview').className = 'slug-preview';
            gcoClearError();
            const btn = document.getElementById('gcoCreateBtn');
            btn.textContent = 'Create Group';
            btn.classList.add('disabled');
            gcoRenderPendingInvites();
            document.getElementById('groupCreateOverlay').classList.add('gco-open');
        }

        function closeGroupCreateOverlay() {
            document.getElementById('groupCreateOverlay').classList.remove('gco-open');
        }

        function gcoRenderPendingInvites() {
            const label = document.getElementById('gcoInviteSectionLabel');
            const list = document.getElementById('gcoPendingInvitesList');
            if (!pendingInvites.length) { label.style.display = 'none'; list.style.display = 'none'; return; }
            label.style.display = 'block';
            list.style.display = 'flex';
            list.innerHTML = pendingInvites.map(inv => `
                <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border-radius:20px;padding:4px 10px 4px 4px;font-size:12.5px;">
                    <img src="${inv.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + inv.username}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">
                    <span>${inv.username}</span>
                </div>
            `).join('');
        }

        function gcoSetPrivacy(type) {
            gcoSelectedPrivacy = type;
            document.getElementById('gcoRadioPublic').classList.toggle('checked', type === 'public');
            document.getElementById('gcoRadioPrivate').classList.toggle('checked', type === 'private');
        }

        function slugify(name) {
            return name.toLowerCase().trim()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 40);
        }

        function gcoUpdateCounts() {
            document.getElementById('gcoNameCount').textContent = document.getElementById('gcoName').value.length;
            document.getElementById('gcoDescCount').textContent = document.getElementById('gcoDesc').value.length;
        }

        function gcoOnNameInput() {
            gcoUpdateCounts();
            const name = document.getElementById('gcoName').value.trim();
            const btn = document.getElementById('gcoCreateBtn');
            const preview = document.getElementById('gcoSlugPreview');

            if (!name) {
                btn.classList.add('disabled');
                preview.textContent = '';
                preview.className = 'slug-preview';
                return;
            }

            const slug = slugify(name) || 'group';
            preview.className = 'slug-preview';
            preview.innerHTML = '<span class="slug-spinner"></span> nexus.app/g/' + slug;
            btn.classList.add('disabled');

            const myToken = ++gcoSlugCheckToken;
            clearTimeout(window._gcoSlugDebounce);
            window._gcoSlugDebounce = setTimeout(async () => {
                try {
                    const doc = await db.collection('groups').doc(slug).get();
                    if (myToken !== gcoSlugCheckToken) return;
                    if (doc.exists) {
                        preview.className = 'slug-preview taken';
                        preview.textContent = 'nexus.app/g/' + slug + ' — already taken, a number will be added automatically';
                    } else {
                        preview.className = 'slug-preview available';
                        preview.textContent = 'nexus.app/g/' + slug + ' — available';
                    }
                    btn.classList.remove('disabled');
                } catch (e) {
                    if (myToken !== gcoSlugCheckToken) return;
                    preview.className = 'slug-preview';
                    preview.textContent = '';
                    btn.classList.remove('disabled');
                }
            }, 400);
        }

        function gcoShowError(msg) {
            const banner = document.getElementById('gcoErrorBanner');
            banner.textContent = msg;
            banner.classList.add('show');
        }
        function gcoClearError() { document.getElementById('gcoErrorBanner').classList.remove('show'); }

        async function gcoFindAvailableSlug(baseSlug) {
            let slug = baseSlug;
            let attempt = 0;
            while (attempt < 8) {
                const doc = await db.collection('groups').doc(slug).get();
                if (!doc.exists) return slug;
                attempt++;
                slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
            }
            return baseSlug + '-' + Date.now().toString(36);
        }

        async function gcoCreateGroup() {
            gcoClearError();
            const name = document.getElementById('gcoName').value.trim();
            const desc = document.getElementById('gcoDesc').value.trim();
            if (!name) return;
            if (!myId) { gcoShowError('You need to be signed in to create a group.'); return; }

            const btn = document.getElementById('gcoCreateBtn');
            btn.classList.add('disabled');
            btn.textContent = 'Creating...';

            try {
                const authUser = await authReadyPromise;
                if (!authUser) { gcoShowError('You need to be signed in to create a group.'); btn.textContent = 'Create Group'; btn.classList.remove('disabled'); return; }

                const baseSlug = slugify(name) || 'group';
                const finalSlug = await gcoFindAvailableSlug(baseSlug);
                const initials = name.trim().slice(0, 2).toUpperCase();

                await db.collection('groups').doc(finalSlug).set({
                    name: name,
                    initials: initials,
                    description: desc,
                    privacy: gcoSelectedPrivacy,
                    link: 'nexus.app/g/' + finalSlug,
                    memberCount: 1 + pendingInvites.length,
                    creatorUsername: myId,
                    adminUsernames: [myId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('groups').doc(finalSlug).collection('members').doc(myId).set({
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    role: 'owner'
                });

                await db.collection('users').doc(myId).collection('myGroups').doc(finalSlug)
                    .set({ joinedAt: firebase.firestore.FieldValue.serverTimestamp() });

                await Promise.all(pendingInvites.map(async inv => {
                    await db.collection('groups').doc(finalSlug).collection('members').doc(inv.username).set({
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        role: 'member'
                    });
                    await db.collection('users').doc(inv.username).collection('myGroups').doc(finalSlug)
                        .set({ joinedAt: firebase.firestore.FieldValue.serverTimestamp() });
                }));

                pendingInvites = [];
                const newGroupUrl = 'group.html?group=' + encodeURIComponent(finalSlug);
                if (window.NexusRouter && typeof window.NexusRouter.navigateTo === 'function') {
                    window.NexusRouter.navigateTo(newGroupUrl);
                } else {
                    window.location.href = newGroupUrl;
                }
            } catch (e) {
                console.error('Create group error:', e);
                btn.textContent = 'Create Group';
                btn.classList.remove('disabled');
                if (e && e.code === 'permission-denied') {
                    gcoShowError('Firestore denied this — your Security Rules need to allow writes to /groups/{id} for signed-in users.');
                } else {
                    gcoShowError('Could not create the group — please try again.');
                }
            }
        }

        // ================================================================
        // PAGE CREATE OVERLAY — Phase 2 logic (daga page-create.html).
        // ================================================================
        const PCO_CATEGORIES = ['General', 'Business', 'Community', 'Entertainment', 'News & Media', 'Education', 'Religion', 'Health'];
        let pcoSelectedCategory = 'General';
        let pcoSlugCheckToken = 0;

        function openPageCreateOverlay() {
            document.getElementById('pcoName').value = '';
            document.getElementById('pcoDesc').value = '';
            pcoSelectedCategory = 'General';
            document.getElementById('pcoCategoryScroll').innerHTML = PCO_CATEGORIES.map(c =>
                `<div class="category-chip ${c === pcoSelectedCategory ? 'selected' : ''}" data-cat="${c}" onclick="pcoSetCategory('${c}')">${c}</div>`
            ).join('');
            pcoUpdateCounts();
            document.getElementById('pcoSlugPreview').textContent = '';
            document.getElementById('pcoSlugPreview').className = 'slug-preview';
            pcoClearError();
            const btn = document.getElementById('pcoCreateBtn');
            btn.textContent = 'Create Page';
            btn.classList.add('disabled');
            pcoRenderPendingInvites();
            document.getElementById('pageCreateOverlay').classList.add('pco-open');
        }

        function closePageCreateOverlay() {
            document.getElementById('pageCreateOverlay').classList.remove('pco-open');
        }

        function pcoSetCategory(cat) {
            pcoSelectedCategory = cat;
            document.querySelectorAll('#pcoCategoryScroll .category-chip').forEach(el => el.classList.toggle('selected', el.dataset.cat === cat));
        }

        function pcoRenderPendingInvites() {
            const label = document.getElementById('pcoInviteSectionLabel');
            const list = document.getElementById('pcoPendingInvitesList');
            if (!pendingInvites.length) { label.style.display = 'none'; list.style.display = 'none'; return; }
            label.style.display = 'block';
            list.style.display = 'flex';
            list.innerHTML = pendingInvites.map(inv => `
                <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border-radius:20px;padding:4px 10px 4px 4px;font-size:12.5px;">
                    <img src="${inv.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + inv.username}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">
                    <span>${inv.username}</span>
                </div>
            `).join('');
        }

        function pcoUpdateCounts() {
            document.getElementById('pcoNameCount').textContent = document.getElementById('pcoName').value.length;
            document.getElementById('pcoDescCount').textContent = document.getElementById('pcoDesc').value.length;
        }

        function pcoOnNameInput() {
            pcoUpdateCounts();
            const name = document.getElementById('pcoName').value.trim();
            const btn = document.getElementById('pcoCreateBtn');
            const preview = document.getElementById('pcoSlugPreview');

            if (!name) {
                btn.classList.add('disabled');
                preview.textContent = '';
                preview.className = 'slug-preview';
                return;
            }

            const slug = slugify(name) || 'page';
            preview.className = 'slug-preview';
            preview.innerHTML = '<span class="slug-spinner"></span> nexus.app/p/' + slug;
            btn.classList.add('disabled');

            const myToken = ++pcoSlugCheckToken;
            clearTimeout(window._pcoSlugDebounce);
            window._pcoSlugDebounce = setTimeout(async () => {
                try {
                    const doc = await db.collection('pages').doc(slug).get();
                    if (myToken !== pcoSlugCheckToken) return;
                    if (doc.exists) {
                        preview.className = 'slug-preview taken';
                        preview.textContent = 'nexus.app/p/' + slug + ' — already taken, a number will be added automatically';
                    } else {
                        preview.className = 'slug-preview available';
                        preview.textContent = 'nexus.app/p/' + slug + ' — available';
                    }
                    btn.classList.remove('disabled');
                } catch (e) {
                    if (myToken !== pcoSlugCheckToken) return;
                    preview.className = 'slug-preview';
                    preview.textContent = '';
                    btn.classList.remove('disabled');
                }
            }, 400);
        }

        function pcoShowError(msg) {
            const banner = document.getElementById('pcoErrorBanner');
            banner.textContent = msg;
            banner.classList.add('show');
        }
        function pcoClearError() { document.getElementById('pcoErrorBanner').classList.remove('show'); }

        async function pcoFindAvailableSlug(baseSlug) {
            let slug = baseSlug;
            let attempt = 0;
            while (attempt < 8) {
                const doc = await db.collection('pages').doc(slug).get();
                if (!doc.exists) return slug;
                attempt++;
                slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
            }
            return baseSlug + '-' + Date.now().toString(36);
        }

        async function pcoCreatePage() {
            pcoClearError();
            const name = document.getElementById('pcoName').value.trim();
            const desc = document.getElementById('pcoDesc').value.trim();
            if (!name) return;
            if (!myId) { pcoShowError('You need to be signed in to create a page.'); return; }

            const btn = document.getElementById('pcoCreateBtn');
            btn.classList.add('disabled');
            btn.textContent = 'Creating...';

            try {
                const authUser = await authReadyPromise;
                if (!authUser) { pcoShowError('You need to be signed in to create a page.'); btn.textContent = 'Create Page'; btn.classList.remove('disabled'); return; }

                const baseSlug = slugify(name) || 'page';
                const finalSlug = await pcoFindAvailableSlug(baseSlug);
                const initials = name.trim().slice(0, 2).toUpperCase();

                await db.collection('pages').doc(finalSlug).set({
                    name: name,
                    initials: initials,
                    description: desc,
                    category: pcoSelectedCategory,
                    link: 'nexus.app/p/' + finalSlug,
                    followerCount: 1 + pendingInvites.length,
                    verified: false,
                    creatorUsername: myId,
                    adminUsernames: [myId],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('pages').doc(finalSlug).collection('followers').doc(myId).set({
                    followedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('users').doc(myId).collection('myPages').doc(finalSlug)
                    .set({ followedAt: firebase.firestore.FieldValue.serverTimestamp() });

                await Promise.all(pendingInvites.map(async inv => {
                    await db.collection('pages').doc(finalSlug).collection('followers').doc(inv.username).set({
                        followedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await db.collection('users').doc(inv.username).collection('myPages').doc(finalSlug)
                        .set({ followedAt: firebase.firestore.FieldValue.serverTimestamp() });
                }));

                pendingInvites = [];
                const newPageUrl = 'pages.html?page=' + encodeURIComponent(finalSlug);
                if (window.NexusRouter && typeof window.NexusRouter.navigateTo === 'function') {
                    window.NexusRouter.navigateTo(newPageUrl);
                } else {
                    window.location.href = newPageUrl;
                }
            } catch (e) {
                console.error('Create page error:', e);
                btn.textContent = 'Create Page';
                btn.classList.remove('disabled');
                if (e && e.code === 'permission-denied') {
                    pcoShowError('Firestore denied this — your Security Rules need to allow writes to /pages/{id} for signed-in users.');
                } else {
                    pcoShowError('Could not create the page — please try again.');
                }
            }
        }

        // ================================================================
        // CHANNEL CREATE OVERLAY — Phase 3 logic (daga create-channel.html).
        // ================================================================
        const CCO_CATEGORIES = ['General', 'Technology', 'Business', 'Fashion', 'Entertainment', 'Sports', 'News', 'Education', 'Lifestyle'];
        let ccoSelectedCategory = 'General';
        let ccoSelectedPrivacy = 'public';
        let ccoSlugCheckToken = 0;

        function openChannelCreateOverlay() {
            document.getElementById('ccoName').value = '';
            document.getElementById('ccoDesc').value = '';
            ccoSelectedCategory = 'General';
            ccoSelectedPrivacy = 'public';
            document.getElementById('ccoCategoryScroll').innerHTML = CCO_CATEGORIES.map(c =>
                `<div class="category-chip ${c === ccoSelectedCategory ? 'selected' : ''}" data-cat="${c}" onclick="ccoSetCategory('${c}')">${c}</div>`
            ).join('');
            document.getElementById('ccoRadioPublic').classList.add('checked');
            document.getElementById('ccoRadioPrivate').classList.remove('checked');
            ccoUpdateCounts();
            document.getElementById('ccoSlugPreview').textContent = '';
            document.getElementById('ccoSlugPreview').className = 'slug-preview';
            ccoClearError();
            const btn = document.getElementById('ccoCreateBtn');
            btn.textContent = 'Create Channel';
            btn.classList.add('disabled');
            ccoRenderPendingInvites();
            document.getElementById('channelCreateOverlay').classList.add('cco-open');
        }

        function closeChannelCreateOverlay() {
            document.getElementById('channelCreateOverlay').classList.remove('cco-open');
        }

        function ccoSetCategory(cat) {
            ccoSelectedCategory = cat;
            document.querySelectorAll('#ccoCategoryScroll .category-chip').forEach(el => el.classList.toggle('selected', el.dataset.cat === cat));
        }

        function ccoSetPrivacy(type) {
            ccoSelectedPrivacy = type;
            document.getElementById('ccoRadioPublic').classList.toggle('checked', type === 'public');
            document.getElementById('ccoRadioPrivate').classList.toggle('checked', type === 'private');
        }

        function ccoRenderPendingInvites() {
            const label = document.getElementById('ccoInviteSectionLabel');
            const list = document.getElementById('ccoPendingInvitesList');
            if (!pendingInvites.length) { label.style.display = 'none'; list.style.display = 'none'; return; }
            label.style.display = 'block';
            list.style.display = 'flex';
            list.innerHTML = pendingInvites.map(inv => `
                <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border-radius:20px;padding:4px 10px 4px 4px;font-size:12.5px;">
                    <img src="${inv.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + inv.username}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;">
                    <span>${inv.username}</span>
                </div>
            `).join('');
        }

        function ccoUpdateCounts() {
            document.getElementById('ccoNameCount').textContent = document.getElementById('ccoName').value.length;
            document.getElementById('ccoDescCount').textContent = document.getElementById('ccoDesc').value.length;
        }

        function ccoOnNameInput() {
            ccoUpdateCounts();
            const name = document.getElementById('ccoName').value.trim();
            const btn = document.getElementById('ccoCreateBtn');
            const preview = document.getElementById('ccoSlugPreview');

            if (!name) {
                btn.classList.add('disabled');
                preview.textContent = '';
                preview.className = 'slug-preview';
                return;
            }

            const slug = slugify(name) || 'channel';
            preview.className = 'slug-preview';
            preview.innerHTML = '<span class="slug-spinner"></span> nexus.app/c/' + slug;
            btn.classList.add('disabled');

            const myToken = ++ccoSlugCheckToken;
            clearTimeout(window._ccoSlugDebounce);
            window._ccoSlugDebounce = setTimeout(async () => {
                try {
                    const doc = await db.collection('channels').doc(slug).get();
                    if (myToken !== ccoSlugCheckToken) return;
                    if (doc.exists) {
                        preview.className = 'slug-preview taken';
                        preview.textContent = 'nexus.app/c/' + slug + ' — already taken, a number will be added automatically';
                    } else {
                        preview.className = 'slug-preview available';
                        preview.textContent = 'nexus.app/c/' + slug + ' — available';
                    }
                    btn.classList.remove('disabled');
                } catch (e) {
                    if (myToken !== ccoSlugCheckToken) return;
                    preview.className = 'slug-preview';
                    preview.textContent = '';
                    btn.classList.remove('disabled');
                }
            }, 400);
        }

        function ccoShowError(msg) {
            const banner = document.getElementById('ccoErrorBanner');
            banner.textContent = msg;
            banner.classList.add('show');
        }
        function ccoClearError() { document.getElementById('ccoErrorBanner').classList.remove('show'); }

        async function ccoFindAvailableSlug(baseSlug) {
            let slug = baseSlug;
            let attempt = 0;
            while (attempt < 8) {
                const doc = await db.collection('channels').doc(slug).get();
                if (!doc.exists) return slug;
                attempt++;
                slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
            }
            return baseSlug + '-' + Date.now().toString(36);
        }

        async function ccoCreateChannel() {
            ccoClearError();
            const name = document.getElementById('ccoName').value.trim();
            const desc = document.getElementById('ccoDesc').value.trim();
            if (!name) return;
            if (!myId) { ccoShowError('You need to be signed in to create a channel.'); return; }

            const btn = document.getElementById('ccoCreateBtn');
            btn.classList.add('disabled');
            btn.textContent = 'Creating...';

            try {
                const authUser = await authReadyPromise;
                if (!authUser) { ccoShowError('You need to be signed in to create a channel.'); btn.textContent = 'Create Channel'; btn.classList.remove('disabled'); return; }

                const baseSlug = slugify(name) || 'channel';
                const finalSlug = await ccoFindAvailableSlug(baseSlug);
                const initials = name.trim().slice(0, 2).toUpperCase();

                await db.collection('channels').doc(finalSlug).set({
                    name: name,
                    initials: initials,
                    description: desc,
                    category: ccoSelectedCategory,
                    privacy: ccoSelectedPrivacy,
                    link: 'nexus.app/c/' + finalSlug,
                    subscriberCount: 1 + pendingInvites.length,
                    verified: false,
                    creatorUsername: myId,
                    adminUsernames: [myId],
                    tiers: [
                        { id: 'free', name: 'Free', price: 0, desc: 'Regular posts, polls and reactions.' },
                        { id: 'plus', name: name + ' Plus', price: 5, desc: 'Early access, exclusive drops, no ads. $5/month' },
                        { id: 'vip', name: name + ' VIP', price: 15, desc: 'Everything in Plus, plus priority support. $15/month' }
                    ],
                    duoPartner: { active: false, name: '' },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('channels').doc(finalSlug).collection('subscribers').doc(myId).set({
                    subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    muted: false
                });

                await db.collection('users').doc(myId).collection('mySubscriptions').doc(finalSlug)
                    .set({ subscribedAt: firebase.firestore.FieldValue.serverTimestamp() });

                await Promise.all(pendingInvites.map(async inv => {
                    await db.collection('channels').doc(finalSlug).collection('subscribers').doc(inv.username).set({
                        subscribedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        muted: false
                    });
                    await db.collection('users').doc(inv.username).collection('mySubscriptions').doc(finalSlug)
                        .set({ subscribedAt: firebase.firestore.FieldValue.serverTimestamp() });
                }));

                pendingInvites = [];
                window.location.href = 'channels.html?channel=' + encodeURIComponent(finalSlug);
            } catch (e) {
                console.error('Create channel error:', e);
                btn.textContent = 'Create Channel';
                btn.classList.remove('disabled');
                if (e && e.code === 'permission-denied') {
                    ccoShowError('Firestore denied this — your Security Rules need to allow writes to /channels/{id} for signed-in users.');
                } else {
                    ccoShowError('Could not create the channel — please try again.');
                }
            }
        }

        function toggleIntegratedSearch(show) {
            const box = document.getElementById('integratedSearch');
            if(show) {
                box.classList.add('active');
                document.getElementById('mainSearchInput').focus();
            } else {
                box.classList.remove('active');
                document.getElementById('mainSearchInput').value = '';
                performGlobalSearch('');
            }
        }

       // Badge (jan circle) a saman kowane tab.
        const nexusUnreadState = { personal: false, groups: false, channels: false, pages: false, updates: false };
        function refreshChatFooterDot() {
            const hasAny = Object.values(nexusUnreadState).some(Boolean);
            if (window.updateChatFooterBadge) window.updateChatFooterBadge(hasAny);
        }
        function updateSmartBtnBadge(tabId, count) {
            const badge = document.getElementById(`badge-${tabId}`);
            if (badge) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.toggle('show', count > 0);
            }
            if (tabId in nexusUnreadState) {
                nexusUnreadState[tabId] = count > 0;
                refreshChatFooterDot();
            }
        } 

        /* =====================================================================
           GROUPS / PAGES / CHANNELS — BADGE BACKEND NA GASKIYA
           Kowane collection yana da mallaka/membership subcollection kansa:
             groups/{id}/members/{username}      -> groups/{id}/messages
             pages/{slug}/followers/{username}    -> posts (filtered pageId)
             channels/{id}/subscribers/{username} -> channels/{id}/posts
           Babu wani "lastViewed" da ya rigaya wanzu a ko'ina, don haka an
           kirkiri SABON, mai tsafta path: users/{myId}/lastViewed/{key}
           (ba ya taba wani tsohon collection/field).
        ===================================================================== */

        async function getMyMembershipIds(collectionGroupName) {
            // Yanzu ba mu bincike DUKKAN membership docs a database ba kuma
            // (collectionGroup query, wanda ke bude membership na DUK groups/
            // pages/channels ga kowa) — a maimakon haka muna karanta index din
            // da aka fan-out zuwa users/{myId}/{...} a lokacin JOIN/SUBSCRIBE/
            // FOLLOW (duba group.html, channels.html, pages.html). Wannan shine
            // kadai data dinmu ke bukatar karantawa, kuma tuni muna da izini a
            // kansa (users/{myId} shine namu).
            const subMap = { members: 'myGroups', subscribers: 'mySubscriptions', followers: 'myPages' };
            const sub = subMap[collectionGroupName];
            if (!sub) return [];
            try {
                const snap = await db.collection('users').doc(myId).collection(sub).get();
                return snap.docs.map(d => d.id);
            } catch (err) {
                console.error(`getMyMembershipIds(${collectionGroupName}) error:`, err);
                return [];
            }
        }

        async function getLastViewed(key) {
            try {
                const doc = await db.collection('users').doc(myId).collection('lastViewed').doc(key).get();
                return doc.exists ? tsToMillis(doc.data().timestamp) : 0;
            } catch (err) { return 0; }
        }

        async function setLastViewed(key) {
            try {
                await db.collection('users').doc(myId).collection('lastViewed').doc(key)
                    .set({ timestamp: Date.now() }, { merge: true });
            } catch (err) { console.error('setLastViewed error:', err); }
        }

        async function computeGroupsBadge() {
            const groupIds = await getMyMembershipIds('members');
            if (!groupIds.length) { updateSmartBtnBadge('groups', 0); return; }
            let unreadGroups = 0;
            await Promise.all(groupIds.map(async (gid) => {
                const lastViewed = await getLastViewed(`group_${gid}`);
                try {
                    const snap = await db.collection('groups').doc(gid).collection('messages')
                        .where('timestamp', '>', lastViewed).limit(1).get();
                    if (!snap.empty) unreadGroups++;
                } catch (err) { /* group yana iya rasa messages tukuna, don haka mu wuce */ }
            }));
            updateSmartBtnBadge('groups', unreadGroups);
        }

        async function computeChannelsBadge() {
            const channelIds = await getMyMembershipIds('subscribers');
            if (!channelIds.length) { updateSmartBtnBadge('channels', 0); return; }
            let unreadChannels = 0;
            await Promise.all(channelIds.map(async (cid) => {
                const lastViewed = await getLastViewed(`channel_${cid}`);
                try {
                    const snap = await db.collection('channels').doc(cid).collection('posts')
                        .where('timestamp', '>', lastViewed).limit(1).get();
                    if (!snap.empty) unreadChannels++;
                } catch (err) { }
            }));
            updateSmartBtnBadge('channels', unreadChannels);
        }

        async function computePagesBadge() {
            const pageIds = await getMyMembershipIds('followers');
            if (!pageIds.length) { updateSmartBtnBadge('pages', 0); return; }
            const lastViewedMap = {};
            await Promise.all(pageIds.map(async (pid) => { lastViewedMap[pid] = await getLastViewed(`page_${pid}`); }));

            // Firestore 'in' yana daukar iyaka 10 kawai a kowace query — mu raba
            // zuwa kananan kungiyoyi (chunks) idan pages sun wuce 10.
            const unreadPageIds = new Set();
            for (let i = 0; i < pageIds.length; i += 10) {
                const chunk = pageIds.slice(i, i + 10);
                try {
                    const snap = await db.collection('posts').where('pageId', 'in', chunk).get();
                    snap.forEach(doc => {
                        const d = doc.data();
                        const pid = d.pageId;
                        if (tsToMillis(d.timestamp) > (lastViewedMap[pid] || 0)) unreadPageIds.add(pid);
                    });
                } catch (err) { console.error('computePagesBadge chunk error:', err); }
            }
            updateSmartBtnBadge('pages', unreadPageIds.size);
        }

        // Ana kiran wannan idan mutum ya danna tab din Groups/Pages/Channels —
        // yana yiwa DUKKAN abubuwan wannan nau'in "an gani" (mark as read),
        // sannan ya share badge din nan take.
        async function markTabAsRead(tabId) {
            let ids = [], keyPrefix = '';
            if (tabId === 'groups') { ids = await getMyMembershipIds('members'); keyPrefix = 'group_'; }
            else if (tabId === 'channels') { ids = await getMyMembershipIds('subscribers'); keyPrefix = 'channel_'; }
            else if (tabId === 'pages') { ids = await getMyMembershipIds('followers'); keyPrefix = 'page_'; }
            else return;
            await Promise.all(ids.map(id => setLastViewed(`${keyPrefix}${id}`)));
            updateSmartBtnBadge(tabId, 0);
        }

        // Ana kiran wadannan uku nan take bayan login domin badge din su
        // bayyana ko da mutum bai bude tab din ba tukuna.
        runOnChatsInit(() => {
            authReadyPromise.then((user) => {
                if (!user) return;
                computeGroupsBadge();
                computePagesBadge();
                computeChannelsBadge();
            });
        });

        function getActiveTabId() {
            if (document.getElementById('updatesOverlay').classList.contains('active')) return 'updates';
            const activeView = document.querySelector('.tab-view.active');
            return activeView ? activeView.id : 'personal';
        }

        const SEARCH_PLACEHOLDERS = {
            personal: 'Search chats...', groups: 'Search groups...', pages: 'Search pages...',
            channels: 'Search channels...', updates: 'Search updates...', friends: 'Search friends...'
        };

        function updateSearchPlaceholder() {
            const tab = getActiveTabId();
            let label = SEARCH_PLACEHOLDERS[tab] || 'Search...';
            if (tab === 'friends') {
                const sub = (typeof currentFriendsSubtab !== 'undefined') ? currentFriendsSubtab : 'friends';
                const subLabels = { friends: 'friends', followers: 'followers', following: 'following', suggested: 'suggestions' };
                label = `Search ${subLabels[sub] || 'friends'}...`;
            }
            const input = document.getElementById('searchInput');
            if (input) input.placeholder = label;
        }

        // SABON: search din yana bincike a ainihin tab (da sub-tab, idan
        // Friends ne) da yake AIKI a yanzu kai-tsaye — idan mutum ya
        // sauya tab (ko sub-tab) yayin da search yake bude, sai ya sake
        // gudu nan take a kan SABON wurin, ba tsohon ba.
        function performGlobalSearch(query) {
            const tab = getActiveTabId();
            const q = query.toLowerCase();

            if (tab === 'personal' || tab === 'groups') {
                document.querySelectorAll(`#${tab} .chat-item`).forEach(item => {
                    const nameEl = item.querySelector('.name');
                    const name = nameEl ? nameEl.innerText.toLowerCase() : '';
                    item.style.display = name.includes(q) ? 'flex' : 'none';
                });
            } else if (tab === 'pages' || tab === 'channels') {
                document.querySelectorAll(`#${tab} .page-list-item`).forEach(item => {
                    const nameEl = item.querySelector('h3');
                    const name = nameEl ? nameEl.innerText.toLowerCase() : '';
                    item.style.display = name.includes(q) ? 'flex' : 'none';
                });
            } else if (tab === 'updates') {
                filterUpdatesBySearch(query);
            } else if (tab === 'friends') {
                const sub = (typeof currentFriendsSubtab !== 'undefined') ? currentFriendsSubtab : 'friends';
                const panel = document.getElementById(`friendsSubtabPanel-${sub}`);
                if (!panel) return;
                if (sub === 'friends') {
                    panel.querySelectorAll('.friend-row-flex').forEach(row => {
                        const name = row.dataset.friendName || '';
                        row.style.display = name.includes(q) ? 'flex' : 'none';
                    });
                } else {
                    panel.querySelectorAll('.chat-item').forEach(item => {
                        const nameEl = item.querySelector('.name');
                        const name = nameEl ? nameEl.innerText.toLowerCase() : '';
                        item.style.display = name.includes(q) ? 'flex' : 'none';
                    });
                }
            }
        }

    function switchTab(element, tabId) {
    document.querySelectorAll('.smart-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    localStorage.setItem('nexus_active_tab', tabId);
    const searchBar = document.getElementById('searchBarContainer');
    const searchWasOpen = searchBar && searchBar.classList.contains('active');

    // Updates yanzu overlay ne na cikin gida — babu navigation, babu loading,
    // yana bude nan take daidai kamar sauran tabs.
    if (tabId === 'updates') {
        document.querySelector('.view-container').style.display = 'none';
        document.getElementById('updatesOverlay').classList.add('active');
        document.getElementById('mainHeaderTitle').textContent = 'Updates';
        if (window.refreshNexusStatusReel) window.refreshNexusStatusReel();
        if (searchWasOpen) { updateSearchPlaceholder(); performGlobalSearch(document.getElementById('searchInput').value); }
        return;
    }
    document.querySelector('.view-container').style.display = '';
    document.getElementById('updatesOverlay').classList.remove('active');
    document.getElementById('mainHeaderTitle').textContent = 'Chats'; 
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'groups' || tabId === 'pages' || tabId === 'channels') markTabAsRead(tabId);

    if (searchWasOpen) { updateSearchPlaceholder(); performGlobalSearch(document.getElementById('searchInput').value); }

    // Constellation-view icon a header kawai ya kamata ya bayyana a tab na Friends → subtab Friends
    const netToggle = document.getElementById('globalNetworkViewToggle');
    if (netToggle) netToggle.style.display = (tabId === 'friends' && currentFriendsSubtab === 'friends') ? 'inline-flex' : 'none';
    const filterWrap = document.getElementById('friendStatusFilterWrap');
    if (filterWrap) filterWrap.style.display = (tabId === 'friends' && currentFriendsSubtab === 'friends') ? 'flex' : 'none';
    if (tabId !== 'friends') {
        const netView = document.getElementById('networkViewContainer');
        const listView = document.getElementById('friendsListView');
        if (netView && netView.classList.contains('active')) {
            netView.classList.remove('active');
            listView.style.display = 'block';
            if (netToggle) netToggle.classList.remove('active-view');
        }
    }
        }

        function openStoryViewer(userId) {
            if (window.openStatusOverlay) window.openStatusOverlay(userId);
        }

        // Mayar da mutum zuwa tab din da yake AIKI a kai (Groups/Pages/Channels/
        // Friends) a KOWANE page load ko refresh — ba kawai bayan wani babban
        // navigation flow ba — ta amfani da 'nexus_active_tab' da switchTab()
        // ke ajiyewa duk lokacin da aka canza tab.
        runOnChatsInit(() => {
            const savedTab = localStorage.getItem('nexus_active_tab');
            if (savedTab && savedTab !== 'personal') {
                const btn = document.querySelector(`.smart-btn[onclick*="'${savedTab}'"]`);
                if (btn) switchTab(btn, savedTab);
            }
            document.documentElement.classList.remove('tab-restore-pending');
        });
        // ============================================================
        // AVATAR TAP BEHAVIOR — shared by Personal, Friends, Groups,
        // Pages and Channels avatars.
        //   Kowane dannawa a kan avatar, ko wane irin nau'i ne, yana
        //   bude wannan karamin popup din daya (avatarPhotoBackdrop).
        //   Abinda ke canjawa shine kadai CONTENT na footer dinsa, wanda
        //   renderApvCapBar() ke kayyadewa bisa ga: nau'in avatar, ko
        //   yana da status/highlights a halin yanzu, da ko group din a
        //   rufe yake (archived).
        // ============================================================

        function userHasActiveStatus(userId) {
            if (!userId || typeof db === 'undefined') return Promise.resolve(false);
            const cutoff = Date.now() - (typeof STATUS_LIFETIME_MS !== 'undefined' ? STATUS_LIFETIME_MS : 24 * 60 * 60 * 1000);
            return db.collection('statusData')
                .where('userId', '==', userId)
                .where('timestamp', '>', cutoff)
                .get()
                .then(snap => snap.docs.some(d => (typeof isVisibleToMe === 'function') ? isVisibleToMe({ id: d.id, ...d.data() }) : true))
                .catch(() => false);
        }

        // Sabon convention (babu wanda ya wanzu a baya): saka
        // { archived: true } a kan documenti na 'groups/{groupKey}' domin
        // a rufe group din — apvMessageBtn zai zama gray/disabled nan take.
        function isGroupArchived(groupKey) {
            if (!groupKey || typeof db === 'undefined') return Promise.resolve(false);
            return db.collection('groups').doc(groupKey).get()
                .then(doc => !!(doc.exists && doc.data().archived === true))
                .catch(() => false);
        }

        function handleAvatarTap(event) {
            event.preventDefault();
            event.stopPropagation();
            const el = event.currentTarget;
            const kind = el.dataset.avatarKind;
            const key = el.dataset.avatarKey;
            const chatHref = el.dataset.chatHref || '';
            const infoHref = el.dataset.infoHref || '';
            const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
            const avatarUrl = imgEl ? imgEl.src : '';
            const container = el.closest('.chat-item, .page-list-item, .friend-row-flex') || el.parentElement;
            let name = '';
            const nameEl = container ? container.querySelector('.name, h3') : null;
            if (nameEl) name = nameEl.textContent.trim();

            openAvatarPhotoViewer(name, avatarUrl, { kind, key, chatHref, infoHref });
        }

        let apvCurrentTarget = null;

        function openAvatarPhotoViewer(name, avatarUrl, target) {
            document.getElementById('apvName').textContent = name || '';
            document.getElementById('apvImage').src = avatarUrl || '';
            apvCurrentTarget = target || null;
            document.getElementById('avatarPhotoBackdrop').classList.add('open');
            renderApvCapBar(target || {});
        }

        function closeAvatarPhotoViewer() {
            document.getElementById('avatarPhotoBackdrop').classList.remove('open');
            exitApvMiniStatus();
            closeApvHighlights();
        }

        function apvMessageAction() {
            closeAvatarPhotoViewer();
            if (apvCurrentTarget && apvCurrentTarget.chatHref) {
                const sep = apvCurrentTarget.chatHref.includes('?') ? '&' : '?';
                // 'autofocus=1' shine siginar da chat-interior.html/pages/
                // channels chat interface ke bukata domin ta bude keyboard
                // dinta kai tsaye a kan typing bar (kamar hoto na 2).
                const url = apvCurrentTarget.chatHref + sep + 'autofocus=1';
                // group.html da pages.html kadai ke SPA-ready a yanzu —
                // sauran (channel/friend) na ci gaba da full reload kamar da.
                const spaReady = apvCurrentTarget.kind === 'group' || apvCurrentTarget.kind === 'page';
                if (spaReady && window.NexusRouter && typeof window.NexusRouter.navigateTo === 'function') {
                    window.NexusRouter.navigateTo(url);
                } else {
                    window.location.href = url;
                }
            }
        }
        function apvInfoAction() {
            closeAvatarPhotoViewer();
            if (apvCurrentTarget && apvCurrentTarget.infoHref) {
                const spaReady = apvCurrentTarget.kind === 'group' || apvCurrentTarget.kind === 'page';
                if (spaReady && window.NexusRouter && typeof window.NexusRouter.navigateTo === 'function') {
                    window.NexusRouter.navigateTo(apvCurrentTarget.infoHref);
                } else {
                    window.location.href = apvCurrentTarget.infoHref;
                }
            }
        }

        // ------------------------------------------------------------
        // ICON MARKUP (feather-style, daidai da salon apv-close/apv-
        // action-btn na asali — babu wata sabuwar library da aka kara).
        // ------------------------------------------------------------
        const APV_ICON = {
            message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
            voice:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
            video:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
            info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
            status:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>'
        };
        function apvCapHTML(id, iconKey, onclick, disabled) {
            return `<div class="apv-cap${disabled ? ' disabled' : ''}" id="${id}" onclick="${disabled ? '' : onclick}">${APV_ICON[iconKey]}</div>`;
        }
        function apvCapSoloHTML(id, iconKey, label, onclick) {
            return `<div class="apv-cap-solo"><div class="apv-cap" id="${id}" onclick="${onclick}">${APV_ICON[iconKey]}<span>${label}</span></div></div>`;
        }

        // ------------------------------------------------------------
        // renderApvCapBar(target) — babban injin da ke kayyade
        // abinda ke cikin footer din popup, bisa ga bukatunka guda 3-4:
        //
        //   personal/friend, BABU status  → pill daya, icons 4 kadai
        //     (message, voice, video, info), babu title, ta cika bar
        //     gaba daya.
        //   personal/friend, DA status    → pill 4-icons (hagu) + solo
        //     pill "View status" (dama), kamar hoto na 1.
        //   group, BABU highlights        → pill 3-icons (babu video)
        //     ta cika bar gaba daya.
        //   group, DA highlights          → pill 3-icons (hagu) + solo
        //     "View highlights" (dama). Idan group archived, message
        //     button ya zama grey/disabled.
        //   page/channel, BABU highlights → pill 3-icons ta cika bar.
        //   page/channel, DA highlights   → pill 3-icons + solo
        //     "View highlights".
        // ------------------------------------------------------------
        function renderApvCapBar(target) {
            const bar = document.getElementById('apvCapBar');
            const kind = target.kind;
            const key = target.key;
            bar.innerHTML = '<div class="apv-cap-group" id="apvCapGroup"></div>';

            if (kind === 'group' || kind === 'page' || kind === 'channel') {
                Promise.all([
                    kind === 'group' ? isGroupArchived(key) : Promise.resolve(false),
                    entityHasHighlights(key)
                ]).then(([archived, hasHighlights]) => {
                    const group = document.getElementById('apvCapGroup');
                    if (!group) return;
                    group.innerHTML =
                        apvCapHTML('apvMessageBtn', 'message', "apvMessageAction()", archived) +
                        apvCapHTML('apvVoiceBtn', 'voice', "apvVoiceAction()") +
                        apvCapHTML('apvInfoBtn', 'info', "apvInfoAction()");
                    if (hasHighlights) {
                        bar.insertAdjacentHTML('beforeend', apvCapSoloHTML('apvHighlightsBtn', 'status', 'View highlights', `openApvHighlights('${key}')`));
                    }
                });
                return;
            }

            // personal / friend
            userHasActiveStatus(key).then(hasStatus => {
                const group = document.getElementById('apvCapGroup');
                if (!group) return;
                group.innerHTML =
                    apvCapHTML('apvMessageBtn', 'message', "apvMessageAction()") +
                    apvCapHTML('apvVoiceBtn', 'voice', "apvVoiceAction()") +
                    apvCapHTML('apvVideoBtn', 'video', "apvVideoAction()") +
                    apvCapHTML('apvInfoBtn', 'info', "apvInfoAction()");
                if (hasStatus) {
                    bar.insertAdjacentHTML('beforeend', apvCapSoloHTML('apvStatusBtn', 'status', 'View status', `enterApvMiniStatus('${key}')`));
                }
            });
        }

        // Voice/Video call — babu wani sabon call-engine da aka bayar
        // mana yin aiki dashi tukuna, don haka a yanzu suna zuwa ne kai
        // tsaye zuwa chatHref din (kamar message) domin kada su zama
        // matattun buttons; da zaran an gina call system, a maida wadannan
        // biyu su kira shi maimakon wannan.
        function apvVoiceAction() { apvMessageAction(); }
        function apvVideoAction() { apvMessageAction(); }

        // ============================================================
        // STATUS MINI-EMBED (point 3) — amfani da AINIHIN #statusOverlay
        // guda daya (ba a kwafe wani code ba), ana matsar da girmanta
        // kadai zuwa girman .apv-image-wrap ta hanyar inline style. Duk
        // wani gyaran gaba da za a yi wa status engine din ya shafi wannan
        // wuri kai tsaye tunda daya ne ainihin element din.
        // ============================================================
        function enterApvMiniStatus(userKey) {
            if (!window.openStatusOverlay) return;
            window.openStatusOverlay(userKey);
            requestAnimationFrame(() => {
                const so = document.getElementById('statusOverlay');
                const mc = document.getElementById('matrixContainer');
                const wrap = document.querySelector('#avatarPhotoBackdrop .apv-image-wrap');
                if (!so || !wrap) return;
                const r = wrap.getBoundingClientRect();
                so.classList.add('apv-mini');
                so.style.top = r.top + 'px';
                so.style.left = r.left + 'px';
                so.style.width = r.width + 'px';
                so.style.height = r.height + 'px';
                if (mc) mc.style.borderRadius = '18px 18px 0 0';
            });
        }
        // Tap a kan media yayin da progress bar din yake gudana (mini
        // mode) → ya bude su full page, daidai kamar dai an dauke shi
        // daga updates.html.
        function expandApvMiniStatus() {
            const so = document.getElementById('statusOverlay');
            const mc = document.getElementById('matrixContainer');
            if (!so) return;
            so.classList.remove('apv-mini');
            so.style.top = so.style.left = so.style.width = so.style.height = '';
            if (mc) mc.style.borderRadius = '';
            document.getElementById('avatarPhotoBackdrop').classList.remove('open');
        }
        // Rufe popup ba tare da wani status yana mini ba (idan yana mini,
        // sai a rufe status din gaba daya tare da shi — babu tsallakewa).
        function exitApvMiniStatus() {
            const so = document.getElementById('statusOverlay');
            if (so && so.classList.contains('apv-mini')) {
                so.classList.remove('apv-mini');
                so.style.top = so.style.left = so.style.width = so.style.height = '';
                const mc = document.getElementById('matrixContainer');
                if (mc) mc.style.borderRadius = '';
                if (window.closeStatusOverlay) window.closeStatusOverlay();
            }
        }
        // Capture-phase: idan mini ne, dannawa a kan grid-left/grid-right
        // baya nufin "next/prev slide" — yana nufin "expand to fullscreen".
        window.addEventListener('click', function (e) {
            if (['grid-left', 'grid-right'].includes(e.target.className)) {
                const so = document.getElementById('statusOverlay');
                if (so && so.classList.contains('apv-mini')) {
                    e.stopImmediatePropagation();
                    expandApvMiniStatus();
                }
            }
        }, true);

        // ============================================================
        // HIGHLIGHTS MINI-VIEWER (point 4) — Groups / Pages / Channels.
        // Sabon feature gaba daya: babu Firestore schema da ya wanzu a
        // baya, don haka an kirkiri collection 'entityHighlights', doc id
        // = avatarKey, field: items: [{ mediaUrl, caption }, ...]. Idan
        // babu doc/items, "View highlights" ba ya bayyana kwata-kwata.
        // ============================================================
        function entityHasHighlights(key) {
            if (!key || typeof db === 'undefined') return Promise.resolve(false);
            return db.collection('entityHighlights').doc(key).get()
                .then(doc => !!(doc.exists && Array.isArray(doc.data().items) && doc.data().items.length))
                .catch(() => false);
        }

        let apvHl = { key: null, items: [], index: 0, timer: null };
        const APV_HL_SLIDE_MS = 4000;

        function openApvHighlights(key) {
            if (typeof db === 'undefined') return;
            db.collection('entityHighlights').doc(key).get().then(doc => {
                const items = (doc.exists && doc.data().items) || [];
                if (!items.length) return;
                apvHl = { key, items, index: 0, timer: null };
                positionApvHighlightsMini();
                renderApvHighlightProgress();
                renderApvHighlightSlide();
                document.getElementById('apvHighlightsOverlay').classList.add('active');
            });
        }
        function positionApvHighlightsMini() {
            const ov = document.getElementById('apvHighlightsOverlay');
            const wrap = document.querySelector('#avatarPhotoBackdrop .apv-image-wrap');
            if (!ov || !wrap) return;
            ov.classList.remove('expanded');
            const r = wrap.getBoundingClientRect();
            ov.style.top = r.top + 'px';
            ov.style.left = r.left + 'px';
            ov.style.width = r.width + 'px';
            ov.style.height = r.height + 'px';
        }
        function renderApvHighlightProgress() {
            const bar = document.getElementById('apvHlProgress');
            bar.innerHTML = apvHl.items.map((_, i) =>
                `<span class="${i < apvHl.index ? 'done' : ''}"><i style="width:${i === apvHl.index ? '0%' : ''}"></i></span>`
            ).join('');
        }
        function renderApvHighlightSlide() {
            clearInterval(apvHl.timer);
            const item = apvHl.items[apvHl.index];
            if (!item) { closeApvHighlights(); return; }
            document.getElementById('apvHlMedia').src = item.mediaUrl || '';
            document.getElementById('apvHlCaption').textContent = item.caption || '';
            renderApvHighlightProgress();
            const fillEl = document.querySelectorAll('#apvHlProgress span')[apvHl.index]?.querySelector('i');
            if (fillEl) {
                fillEl.style.transition = 'none'; fillEl.style.width = '0%';
                requestAnimationFrame(() => {
                    fillEl.style.transition = `width ${APV_HL_SLIDE_MS}ms linear`;
                    fillEl.style.width = '100%';
                });
            }
            apvHl.timer = setTimeout(() => apvHighlightStep(1), APV_HL_SLIDE_MS);
        }
        function apvHighlightStep(dir) {
            const next = apvHl.index + dir;
            if (next < 0) return;
            if (next >= apvHl.items.length) { closeApvHighlights(); return; }
            apvHl.index = next;
            renderApvHighlightSlide();
        }
        function expandApvHighlights() {
            document.getElementById('apvHighlightsOverlay').classList.add('expanded');
            document.getElementById('avatarPhotoBackdrop').classList.remove('open');
        }
        function closeApvHighlights() {
            clearInterval(apvHl.timer);
            const ov = document.getElementById('apvHighlightsOverlay');
            if (!ov) return;
            ov.classList.remove('active', 'expanded');
            ov.style.top = ov.style.left = ov.style.width = ov.style.height = '';
        }
        runOnChatsInit(() => {
            const zl = document.getElementById('apvHlZoneLeft');
            const zr = document.getElementById('apvHlZoneRight');
            if (zl) zl.addEventListener('click', () => {
                if (document.getElementById('apvHighlightsOverlay').classList.contains('expanded')) apvHighlightStep(-1);
                else expandApvHighlights();
            });
            if (zr) zr.addEventListener('click', () => {
                if (document.getElementById('apvHighlightsOverlay').classList.contains('expanded')) apvHighlightStep(1);
                else expandApvHighlights();
            });
        });

        // ============================================================
        // FRIENDS TAB — 100% real-data engine (no hardcoded/fake rows)
        // ============================================================
        let friendsDataCache = [];      // last computed, sorted friend objects
        // (friendSortMode removed — no filter UI anymore, always sorts by most recently active)
        let myCloseFriends = [];        // cached from users/{myId}.closeFriends
        let myMutedFeed = [];           // cached from users/{myId}.mutedFeed
        let myProfileSignals = { workplace: '', school: '', city: '', neighborhood: '', occupation: '' };
        let activeActionUser = null;    // friend currently open in the action sheet

        function capName(str) {
            return (str || '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        function tsToMillis(ts) {
            if (!ts) return 0;
            if (typeof ts === 'number') return ts;
            if (ts.toMillis) return ts.toMillis();
            if (ts.seconds) return ts.seconds * 1000;
            const d = new Date(ts);
            return isNaN(d.getTime()) ? 0 : d.getTime();
        }

        function friendWarmthTier(lastMillis) {
            if (!lastMillis) return 'none';
            const days = (Date.now() - lastMillis) / 86400000;
            if (days < 1) return 'hot';
            if (days < 7) return 'warm';
            if (days < 30) return 'cool';
            return 'cold';
        }

        // A chat between two people can be stored under either id order —
        // try both so real interaction history is never missed.
        async function getInteractionData(otherUser) {
            try {
                const [a, b] = await Promise.all([
                    db.collection('personalChats').doc(`${myId}__${otherUser}`).get(),
                    db.collection('personalChats').doc(`${otherUser}__${myId}`).get()
                ]);
                const doc = a.exists ? a : (b.exists ? b : null);
                if (!doc) return { lastMessageTime: 0 };
                return { lastMessageTime: tsToMillis(doc.data().lastMessageTime) };
            } catch (e) {
                return { lastMessageTime: 0 };
            }
        }

        async function getMutualFriendsCount(otherUser, myFriendIdSet) {
            try {
                const snap = await db.collection('friends')
                    .where('users', 'array-contains', otherUser)
                    .get();
                let count = 0;
                snap.forEach(doc => {
                    const arr = doc.data().users || [];
                    const partner = arr.find(u => u !== otherUser);
                    if (partner && partner !== myId && myFriendIdSet.has(partner)) count++;
                });
                return count;
            } catch (e) {
                return 0;
            }
        }

        async function loadFriendsList() {
            const container = document.getElementById('friends-list-container');
            const closeContainer = document.getElementById('close-friends-container');
            const closeSection = document.getElementById('closeFriendsSection');
            const countLabel = document.getElementById('subtabCount-friends');
            if (!container) return;
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading...</p>';

            await authReadyPromise;
            if (!firebase.auth().currentUser) return;

            try {
                const [snapshot, myUserDoc] = await Promise.all([
                    db.collection('friends').where('users', 'array-contains', myId).get(),
                    db.collection('users').doc(myId).get()
                ]);

                const myUserData = myUserDoc.exists ? myUserDoc.data() : {};
                myCloseFriends = Array.isArray(myUserData.closeFriends) ? myUserData.closeFriends : [];
                myMutedFeed = Array.isArray(myUserData.mutedFeed) ? myUserData.mutedFeed : [];
                myProfileSignals = {
                    workplace: (myUserData.workplace || '').trim(),
                    school: (myUserData.school || '').trim(),
                    city: (myUserData.city || '').trim(),
                    neighborhood: (myUserData.neighborhood || '').trim(),
                    occupation: (myUserData.occupation || '').trim()
                };

                if (snapshot.empty) {
                    countLabel.textContent = '(0)';
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No friends yet — when you and someone follow each other, they\'ll show up here automatically.</p>';
                    closeSection.style.display = 'none';
                    friendsDataCache = [];
                    renderNetworkGraph([]);
                    if (window.nmoRefreshList) window.nmoRefreshList();
                    return;
                }

                const rawFriends = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (!Array.isArray(data.users)) return;
                    const otherUser = data.users.find(u => u !== myId);
                    if (!otherUser) return;
                    rawFriends.push({ friendDocId: doc.id, otherUser });
                });

                const myFriendIdSet = new Set(rawFriends.map(f => f.otherUser));

                const enriched = await Promise.all(rawFriends.map(async f => {
                    const [userDoc, interaction, mutualCount, streakDoc] = await Promise.all([
                        db.collection('users').doc(f.otherUser).get(),
                        getInteractionData(f.otherUser),
                        getMutualFriendsCount(f.otherUser, myFriendIdSet),
                        db.collection('users').doc(myId).collection('friendStreaks').doc(f.otherUser).get()
                    ]);
                    const userData = userDoc.exists ? userDoc.data() : {};
                    const fullName = capName(userData.fullName || userData.name || userData.username || f.otherUser);
                    const avatarUrl = userData.userProfilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${f.otherUser}`;
                    const isOnline = userData.isOnline === true;
                    const lastMillis = interaction.lastMessageTime;
                    const streakData = streakDoc.exists ? streakDoc.data() : {};
                    return {
                        ...f,
                        fullName, avatarUrl, isOnline,
                        lastMillis,
                        lastSeenMillis: tsToMillis(userData.lastSeen),
                        isDeleted: userData.isDeleted === true,
                        isDeactivated: userData.isDeactivated === true,
                        warmth: friendWarmthTier(lastMillis),
                        mutualCount,
                        isPinned: myCloseFriends.includes(f.otherUser),
                        isMuted: myMutedFeed.includes(f.otherUser),
                        streakCount: streakData.streakCount || 0
                    };
                }));

                friendsDataCache = enriched;
                countLabel.textContent = `(${enriched.length})`;
                renderFriendsSections();
                renderNetworkGraph(enriched);
                if (window.nmoRefreshList) window.nmoRefreshList();

            } catch (err) {
                console.error("Friends load error:", err);
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading friends</p>';
            }
        }

        let currentFriendStatusFilter = 'all';

        function classifyFriendStatus(f) {
            if (f.isDeleted) return 'deleted';
            if (f.isDeactivated) return 'deactivated';
            if (f.isOnline) return 'online';
            if (!f.lastSeenMillis) return 'longago';
            const days = (Date.now() - f.lastSeenMillis) / 86400000;
            if (days < 7) return 'recent';
            if (days < 30) return 'month';
            return 'longago';
        }

        function sortFriends(list) {
            // Filter dropdown ɗin an cire shi — koyaushe ana amfani da tsari na "most recently active" a default.
            return [...list].sort((a, b) => b.lastMillis - a.lastMillis);
        }

        function lastSeenLabel(isOnline, lastSeenMillis, isDeleted, isDeactivated) {
            if (isDeleted) return 'Account deleted';
            if (isDeactivated) return 'Account deactivated';
            if (isOnline) return 'Active now';
            if (!lastSeenMillis) return 'Offline';
            const days = (Date.now() - lastSeenMillis) / 86400000;
            if (days < 1) return 'last seen recently';
            if (days < 7) return 'last seen within a week';
            if (days < 30) return 'last seen within a month';
            return 'last seen a long time ago';
        }

        function friendRowHtml(f) {
            const daysSince = f.lastMillis ? (Date.now() - f.lastMillis) / 86400000 : Infinity;
            const showReconnect = daysSince > 30 && !f.isDeleted && !f.isDeactivated;
            const streakBadge = f.streakCount >= 2 ? `<div class="streak-flame">🔥</div>` : '';
            const pinBadge = f.isPinned ? `<div class="pin-star">⭐</div>` : '';
            const statusLine = lastSeenLabel(f.isOnline, f.lastSeenMillis, f.isDeleted, f.isDeactivated);
            return `
                <div class="friend-row-flex" data-friend-user="${f.otherUser}" data-friend-name="${f.fullName.toLowerCase()}" data-friend-status="${classifyFriendStatus(f)}">
                    <a href="chat-interior.html?with=${encodeURIComponent(f.otherUser)}&avatar=${encodeURIComponent(f.avatarUrl)}" class="chat-item" style="flex:1;" onclick="bumpFriendshipStreak('${f.otherUser}')">
                        <div class="profile-stack" data-online="${f.isOnline}" data-warmth="${f.warmth}" style="position:relative;"
                             data-avatar-kind="friend" data-avatar-key="${f.otherUser}"
                             data-chat-href="chat-interior.html?with=${encodeURIComponent(f.otherUser)}&avatar=${encodeURIComponent(f.avatarUrl)}"
                             data-info-href="me.html?user=${encodeURIComponent(f.otherUser)}"
                             onclick="handleAvatarTap(event)">
                            ${streakBadge}${pinBadge}
                            <img src="${f.avatarUrl}" class="user-img">
                        </div>
                        <div class="chat-details">
                            <span class="name">${f.fullName}</span>
                            <div class="friend-meta-line">
                                <p class="preview-text" style="margin:0;">${statusLine}</p>
                                ${showReconnect ? `<span class="reconnect-chip" onclick="event.preventDefault(); event.stopPropagation(); window.location.href='chat-interior.html?with=${encodeURIComponent(f.otherUser)}&avatar=${encodeURIComponent(f.avatarUrl)}'">👋 Say hi</span>` : ''}
                            </div>
                        </div>
                    </a>
                    <div class="friends-icon-btn" style="padding:0 12px;" onclick="openFriendActions('${f.otherUser}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
                    </div>
                </div>`;
        }

        function renderFriendsSections() {
            const container = document.getElementById('friends-list-container');
            const closeContainer = document.getElementById('close-friends-container');
            const closeSection = document.getElementById('closeFriendsSection');

            let sorted = sortFriends(friendsDataCache);
            if (currentFriendStatusFilter !== 'all') {
                sorted = sorted.filter(f => classifyFriendStatus(f) === currentFriendStatusFilter);
            }
            const pinned = sorted.filter(f => f.isPinned);
            const rest = sorted.filter(f => !f.isPinned);

            if (pinned.length) {
                closeSection.style.display = 'block';
                closeContainer.innerHTML = pinned.map(friendRowHtml).join('');
            } else {
                closeSection.style.display = 'none';
            }

            container.innerHTML = rest.map(friendRowHtml).join('') ||
                (pinned.length ? '' : '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No friends match this filter</p>');
        }

        function toggleFriendStatusFilterMenu(e) {
            e.stopPropagation();
            document.getElementById('friendStatusFilterMenu').classList.toggle('open');
        }

        function applyFriendStatusFilter(type, el) {
            currentFriendStatusFilter = type;
            document.querySelectorAll('#friendStatusFilterMenu .friend-status-filter-option').forEach(o => o.classList.remove('active'));
            el.classList.add('active');
            document.getElementById('friendStatusFilterMenu').classList.remove('open');
            renderFriendsSections();
        }

        document.addEventListener('click', function (e) {
            const menu = document.getElementById('friendStatusFilterMenu');
            if (menu && !e.target.closest('.friend-status-filter-wrap')) menu.classList.remove('open');
        });

        // ============================================================
        // FRIENDS / FOLLOWERS / FOLLOWING / SUGGESTED — sub-tab bar
        // ============================================================
        let currentFriendsSubtab = 'friends';
        const friendsSubtabLoaded = { friends: false, followers: false, following: false, suggested: false };

        function switchFriendsSubtab(tab) {
            currentFriendsSubtab = tab;
            document.querySelectorAll('#friendsSubtabs .friends-subtab').forEach(el => {
                el.classList.toggle('active', el.dataset.subtab === tab);
            });
            document.querySelectorAll('.friends-subtab-panel').forEach(el => el.classList.remove('active'));
            document.getElementById(`friendsSubtabPanel-${tab}`).classList.add('active');

            const netToggle = document.getElementById('globalNetworkViewToggle');
            if (netToggle) netToggle.style.display = (tab === 'friends') ? 'inline-flex' : 'none';
            const filterWrap = document.getElementById('friendStatusFilterWrap');
            if (filterWrap) filterWrap.style.display = (tab === 'friends') ? 'flex' : 'none';

            const searchBar = document.getElementById('searchBarContainer');
            const searchWasOpen = searchBar && searchBar.classList.contains('active');
            if (searchWasOpen) updateSearchPlaceholder();

            const wasAlreadyLoaded = friendsSubtabLoaded[tab] || tab === 'friends';
            if (tab === 'followers' && !friendsSubtabLoaded.followers) { friendsSubtabLoaded.followers = true; loadFollowersList(); }
            if (tab === 'following' && !friendsSubtabLoaded.following) { friendsSubtabLoaded.following = true; loadFollowingList(); }
            if (tab === 'suggested' && !friendsSubtabLoaded.suggested) { friendsSubtabLoaded.suggested = true; loadSuggestedTab(); }

            if (searchWasOpen) {
                const q = document.getElementById('searchInput').value;
                if (wasAlreadyLoaded) { performGlobalSearch(q); }
                else { setTimeout(() => performGlobalSearch(q), 700); } // jira Firestore load na farko
            }
        }

        // ============================================================
        // ADD FRIENDS OVERLAY (Following / Suggested) — opened from the
        // New Message screen's add-contact FAB. Reuses the exact same
        // loadFollowingList() / loadSuggestedTab() / personRowHtml() the
        // main Friends tab uses, just pointed at this overlay's own
        // containers so nothing in the main Friends tab is touched.
        // ============================================================
        const afoSubtabLoaded = { following: false, suggested: false };

        function openAddFriendsOverlay() {
            document.getElementById('addFriendsOverlay').classList.add('nmo-open');
            if (!afoSubtabLoaded.following) { afoSubtabLoaded.following = true; loadFollowingList('afoFollowingContainer'); }
        }
        function closeAddFriendsOverlay() {
            document.getElementById('addFriendsOverlay').classList.remove('nmo-open');
        }
        function switchAfoSubtab(tab) {
            document.querySelectorAll('#addFriendsOverlay .afo-subtab').forEach(el => el.classList.remove('active'));
            document.getElementById('afoSubtab-' + tab).classList.add('active');
            document.querySelectorAll('#addFriendsOverlay .afo-panel').forEach(el => el.classList.remove('active'));
            document.getElementById('afoPanel-' + tab).classList.add('active');
            if (tab === 'suggested' && !afoSubtabLoaded.suggested) { afoSubtabLoaded.suggested = true; loadSuggestedTab('afoSuggestedContainer'); }
        }

        // Shared row template for Followers / Following / Suggested (plain contact-list style,
        // matching the WhatsApp Contacts reference — avatar, name, last-seen line, one action button).
        function personRowHtml(p, kind) {
            let actionHtml = '';
            if (kind === 'follower') {
                actionHtml = p.iFollowThem
                    ? `<span class="person-row-badge">Following</span>`
                    : `<button class="person-row-btn" id="fbbtn-${p.uid}" onclick="event.stopPropagation(); followBackUser('${p.uid}', this)">Follow Back</button>`;
            } else if (kind === 'following') {
                actionHtml = `<button class="person-row-btn following" id="unfbtn-${p.uid}" onclick="event.stopPropagation(); unfollowFromList('${p.uid}', this)">Following</button>`;
            } else if (kind === 'suggested') {
                actionHtml = `<button class="person-row-btn" id="sugbtn-${p.uid}" onclick="event.stopPropagation(); followSuggestedUser('${p.uid}', this)">Follow</button>`;
            }
            const subLine = kind === 'suggested' ? (p.reason || 'Suggested for you') : lastSeenLabel(p.isOnline, p.lastSeenMillis);
            return `
                <div class="chat-item" onclick="window.location.href='me.html?user=${encodeURIComponent(p.uid)}'" style="cursor:pointer;">
                    <div class="profile-stack" data-online="${p.isOnline}"><img src="${p.avatarUrl}" class="user-img"></div>
                    <div class="chat-details">
                        <span class="name">${p.fullName}</span>
                        <p class="preview-text" style="margin:0;">${subLine}</p>
                    </div>
                    ${actionHtml}
                </div>`;
        }

        async function loadFollowersList() {
            const container = document.getElementById('followers-list-container');
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading...</p>';
            try {
                const [followersSnap, myFollowsSnap] = await Promise.all([
                    db.collection('follows').where('following', '==', myId).get(),
                    db.collection('follows').where('follower', '==', myId).get()
                ]);
                const iFollowSet = new Set(myFollowsSnap.docs.map(d => d.data().following));
                const followerIds = [...new Set(followersSnap.docs.map(d => d.data().follower).filter(u => u && u !== myId))];
                document.getElementById('subtabCount-followers').textContent = `(${followerIds.length})`;

                if (!followerIds.length) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No followers yet</p>';
                    return;
                }
                const profiles = await Promise.all(followerIds.map(uid => db.collection('users').doc(uid).get()));
                const people = followerIds.map((uid, i) => {
                    const d = profiles[i].exists ? profiles[i].data() : {};
                    return {
                        uid, fullName: capName(d.fullName || d.name || d.username || uid),
                        avatarUrl: d.userProfilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
                        isOnline: d.isOnline === true, lastSeenMillis: tsToMillis(d.lastSeen),
                        iFollowThem: iFollowSet.has(uid)
                    };
                });
                container.innerHTML = people.map(p => personRowHtml(p, 'follower')).join('');
            } catch (e) {
                console.error('Followers load error:', e);
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading followers</p>';
            }
        }

        async function loadFollowingList(containerId = 'following-list-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading...</p>';
            try {
                const myFollowsSnap = await db.collection('follows').where('follower', '==', myId).get();
                const followingIds = [...new Set(myFollowsSnap.docs.map(d => d.data().following).filter(u => u && u !== myId))];
                document.getElementById('subtabCount-following').textContent = `(${followingIds.length})`;

                if (!followingIds.length) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">Not following anyone yet</p>';
                    return;
                }
                const profiles = await Promise.all(followingIds.map(uid => db.collection('users').doc(uid).get()));
                const people = followingIds.map((uid, i) => {
                    const d = profiles[i].exists ? profiles[i].data() : {};
                    return {
                        uid, fullName: capName(d.fullName || d.name || d.username || uid),
                        avatarUrl: d.userProfilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
                        isOnline: d.isOnline === true, lastSeenMillis: tsToMillis(d.lastSeen)
                    };
                });
                container.innerHTML = people.map(p => personRowHtml(p, 'following')).join('');
            } catch (e) {
                console.error('Following load error:', e);
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading following</p>';
            }
        }

        async function followBackUser(otherUser, btnEl) {
            return followSuggestedUser(otherUser, btnEl);
        }

        async function unfollowFromList(otherUser, btnEl) {
            if (!confirm(`Unfollow ${capName(otherUser)}?`)) return;
            btnEl.disabled = true;
            try {
                await unfollowMySide(otherUser);
                const row = btnEl.closest('.chat-item');
                if (row) row.remove();
                const countEl = document.getElementById('subtabCount-following');
                const current = parseInt((countEl.textContent.match(/\d+/) || ['0'])[0], 10);
                countEl.textContent = `(${Math.max(0, current - 1)})`;
            } catch (e) {
                console.error('Unfollow error:', e);
                btnEl.disabled = false;
            }
        }

        // Friendship Streak — increments on real chat opens (one bump per calendar day).
        // Stored under users/{myId}/friendStreaks/{otherUser} — a subcollection of MY OWN
        // user doc, which the Firestore rules already allow any signed-in user to write to
        // (match /users/{username}/{subcollection}/{docId} { allow write: if request.auth != null; }).
        // This avoids needing an "update" rule on the top-level /friends collection, which
        // the current rules do not grant.
        function bumpFriendshipStreak(otherUser) {
            const todayStr = new Date().toISOString().slice(0, 10);
            const ref = db.collection('users').doc(myId).collection('friendStreaks').doc(otherUser);
            ref.get().then(doc => {
                const data = doc.exists ? doc.data() : {};
                if (data.streakLastDate === todayStr) return; // already counted today
                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                const newCount = data.streakLastDate === yesterday ? (data.streakCount || 0) + 1 : 1;
                ref.set({ streakCount: newCount, streakLastDate: todayStr }, { merge: true });
            }).catch(() => {});
        }

        // --- Friend action sheet: See Friends / Message / Profile / Pin / Mute / Block / Remove ---
        function openFriendActions(otherUser) {
            const f = friendsDataCache.find(x => x.otherUser === otherUser);
            if (!f) return;
            activeActionUser = f;
            const firstName = f.fullName.split(' ')[0];
            document.getElementById('friendActionTitle').textContent = f.fullName;
            document.getElementById('friendActionSeeFriendsLabel').textContent = `See ${firstName}'s Friends`;
            document.getElementById('friendActionMessageLabel').textContent = `Message ${firstName}`;
            document.getElementById('friendActionPinLabel').textContent = f.isPinned ? `Remove ${firstName} from Close Friends` : `Add ${firstName} to Close Friends`;
            document.getElementById('friendActionMuteLabel').textContent = f.isMuted ? `Unmute ${firstName}'s Posts` : `Mute ${firstName}'s Posts`;
            document.getElementById('friendActionMuteDesc').textContent = f.isMuted
                ? `You'll start seeing their posts in your feed again.`
                : `Stop seeing their posts in your feed. You'll stay friends and they won't be notified.`;
            document.getElementById('friendActionBlockLabel').textContent = `Block ${firstName}`;
            document.getElementById('friendActionRemoveLabel').textContent = `Remove ${firstName} as a Friend`;

            document.getElementById('friendActionSeeFriends').onclick = () => {
                window.location.href = `profile.html?user=${encodeURIComponent(f.otherUser)}&tab=friends`;
            };
            document.getElementById('friendActionMessage').onclick = () => {
                window.location.href = `chat-interior.html?with=${encodeURIComponent(f.otherUser)}&avatar=${encodeURIComponent(f.avatarUrl)}`;
            };
            document.getElementById('friendActionProfile').onclick = () => {
                window.location.href = `profile.html?user=${encodeURIComponent(f.otherUser)}`;
            };
            document.getElementById('friendActionPin').onclick = () => togglePinCloseFriend(f.otherUser);
            document.getElementById('friendActionMute').onclick = () => toggleMuteFriend(f.otherUser);
            document.getElementById('friendActionBlock').onclick = () => blockUserConfirm(f.otherUser, f.friendDocId);
            document.getElementById('friendActionRemove').onclick = () => removeFriendConfirm(f.otherUser, f.friendDocId);
            document.getElementById('friendActionBackdrop').classList.add('open');
        }

        function closeFriendActions() {
            document.getElementById('friendActionBackdrop').classList.remove('open');
        }

        async function togglePinCloseFriend(otherUser) {
            closeFriendActions();
            const shouldPin = !myCloseFriends.includes(otherUser);
            try {
                await db.collection('users').doc(myId).set({
                    closeFriends: shouldPin
                        ? firebase.firestore.FieldValue.arrayUnion(otherUser)
                        : firebase.firestore.FieldValue.arrayRemove(otherUser)
                }, { merge: true });
                if (shouldPin) myCloseFriends.push(otherUser);
                else myCloseFriends = myCloseFriends.filter(u => u !== otherUser);
                friendsDataCache = friendsDataCache.map(f => f.otherUser === otherUser ? { ...f, isPinned: shouldPin } : f);
                renderFriendsSections();
            } catch (e) { console.error('Pin error:', e); }
        }

        // Mute — hide someone's posts from your feed without touching the friendship/follow at all.
        // Stored on your own profile doc (users/{myId}.mutedFeed), which you always have full
        // write access to under the current security rules.
        async function toggleMuteFriend(otherUser) {
            closeFriendActions();
            const shouldMute = !myMutedFeed.includes(otherUser);
            try {
                await db.collection('users').doc(myId).set({
                    mutedFeed: shouldMute
                        ? firebase.firestore.FieldValue.arrayUnion(otherUser)
                        : firebase.firestore.FieldValue.arrayRemove(otherUser)
                }, { merge: true });
                if (shouldMute) myMutedFeed.push(otherUser);
                else myMutedFeed = myMutedFeed.filter(u => u !== otherUser);
                friendsDataCache = friendsDataCache.map(f => f.otherUser === otherUser ? { ...f, isMuted: shouldMute } : f);
            } catch (e) { console.error('Mute error:', e); }
        }

        // Shared helper — unfollow my own side of the relationship (the only side rules allow me to touch).
        async function unfollowMySide(otherUser) {
            const mine = await db.collection('follows').where('follower', '==', myId).get();
            const myFollowDoc = mine.docs.find(d => d.data().following === otherUser);
            if (myFollowDoc) {
                await myFollowDoc.ref.delete();
                await db.collection('users').doc(otherUser).update({ followerCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
                await db.collection('users').doc(myId).update({ followingCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
            }
        }

        async function removeFriendConfirm(otherUser, friendDocId) {
            closeFriendActions();
            if (!confirm(`Remove ${capName(otherUser)} from your friends? This will unfollow them.`)) return;
            try {
                await db.collection('friends').doc(friendDocId).delete();
                await db.collection('users').doc(myId).update({ friendCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
                await db.collection('users').doc(otherUser).update({ friendCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
                await unfollowMySide(otherUser);
                loadFriendsList();
            } catch (e) {
                console.error('Remove friend error:', e);
                alert('Something went wrong removing this friend.');
            }
        }

        // Block — records the block on your own profile (real, persisted), removes the
        // friendship, and unfollows your side. NOTE: fully stopping them from messaging/finding
        // you also requires chat-interior.html, profile.html and search/feed queries to check
        // users/{myId}.blockedUsers — that enforcement lives outside this file.
        async function blockUserConfirm(otherUser, friendDocId) {
            closeFriendActions();
            if (!confirm(`Block ${capName(otherUser)}? They won't be able to message you, see your profile, or find you in search. This also removes them as a friend.`)) return;
            try {
                await db.collection('users').doc(myId).set({
                    blockedUsers: firebase.firestore.FieldValue.arrayUnion(otherUser)
                }, { merge: true });

                await db.collection('friends').doc(friendDocId).delete().catch(() => {});
                await db.collection('users').doc(myId).update({ friendCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
                await db.collection('users').doc(otherUser).update({ friendCount: firebase.firestore.FieldValue.increment(-1) }).catch(() => {});
                await unfollowMySide(otherUser);

                loadFriendsList();
            } catch (e) {
                console.error('Block error:', e);
                alert('Something went wrong blocking this user.');
            }
        }

        // --- People You May Know: real, multi-signal engine ---
        // Combines 7 real signals (no random strangers, no fabricated reasons):
        //   Relational:  1) Mutual friends   2) Follows you (not followed back yet)
        //   Demographic: 3) Same workplace  4) Same school  5) Same city
        //                6) Same neighborhood/unguwa  7) Same occupation/sana'a
        // Demographic signals only activate once YOU have filled that field on your own
        // profile (users/{myId}.workplace/school/city/neighborhood/occupation) — comparing
        // against an empty field would just match everyone who also left it blank, which
        // isn't a real signal. Each card shows the actual reason(s) it was suggested.
        function reasonLabel(r) {
            const parts = [];
            if (r.mutual > 0) parts.push(`${r.mutual} mutual friend${r.mutual !== 1 ? 's' : ''}`);
            if (r.workplace) parts.push('Same workplace');
            if (r.school) parts.push('Same school');
            if (r.neighborhood) parts.push('Same neighborhood');
            else if (r.city) parts.push('Same city');
            if (r.occupation) parts.push('Same occupation');
            if (r.sameVendor) parts.push('Chats with same vendor');
            if (r.coLiked > 0) parts.push('Likes similar posts');
            if (r.repliedToComment) parts.push('You replied to their comment');
            if (!parts.length && r.followsMe) parts.push('Follows you');
            return parts.slice(0, 2).join(' · ') || 'Suggested for you';
        }

        async function loadSuggestedTab(containerId = 'suggested-list-container') {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Loading...</p>';

            try {
                // Use the already-loaded friends list if available; otherwise fetch a quick copy.
                let myFriendIdSet;
                if (friendsDataCache.length || friendsSubtabLoaded.friends) {
                    myFriendIdSet = new Set(friendsDataCache.map(f => f.otherUser));
                } else {
                    const snap = await db.collection('friends').where('users', 'array-contains', myId).get();
                    myFriendIdSet = new Set();
                    snap.forEach(doc => {
                        const other = (doc.data().users || []).find(u => u !== myId);
                        if (other) myFriendIdSet.add(other);
                    });
                }

                const reasons = new Map(); // uid -> { mutual, followsMe, workplace, school, city, neighborhood, occupation, coLiked, repliedToComment, sameVendor }
                const bump = (uid, key, val) => {
                    if (!uid || uid === myId || myFriendIdSet.has(uid)) return;
                    if (!reasons.has(uid)) reasons.set(uid, { mutual: 0, followsMe: false, workplace: false, school: false, city: false, neighborhood: false, occupation: false, coLiked: 0, repliedToComment: false, sameVendor: false });
                    const r = reasons.get(uid);
                    if (key === 'mutual' || key === 'coLiked') r[key] += val; else r[key] = true;
                };

                // Signal 1: mutual friends (friends-of-friends)
                if (myFriendIdSet.size > 0) {
                    const sampleFriends = [...myFriendIdSet].slice(0, 6);
                    const snaps = await Promise.all(sampleFriends.map(fid =>
                        db.collection('friends').where('users', 'array-contains', fid).get()
                    ));
                    snaps.forEach(snap => snap.forEach(doc => {
                        (doc.data().users || []).forEach(u => bump(u, 'mutual', 1));
                    }));
                }

                // Signal 2: people who follow you but you haven't followed back
                const [followersSnap, myFollowsSnap] = await Promise.all([
                    db.collection('follows').where('following', '==', myId).get(),
                    db.collection('follows').where('follower', '==', myId).get()
                ]);
                const alreadyFollowing = new Set(myFollowsSnap.docs.map(d => d.data().following));
                followersSnap.docs.forEach(d => {
                    const u = d.data().follower;
                    if (u !== myId && !alreadyFollowing.has(u)) bump(u, 'followsMe', true);
                });

                // Signals 3–7: demographic matches — only queried for fields you've actually filled in
                const demoJobs = [];
                if (myProfileSignals.workplace) demoJobs.push(['workplace', db.collection('users').where('workplace', '==', myProfileSignals.workplace).limit(15).get()]);
                if (myProfileSignals.school) demoJobs.push(['school', db.collection('users').where('school', '==', myProfileSignals.school).limit(15).get()]);
                if (myProfileSignals.city) demoJobs.push(['city', db.collection('users').where('city', '==', myProfileSignals.city).limit(15).get()]);
                if (myProfileSignals.neighborhood) demoJobs.push(['neighborhood', db.collection('users').where('neighborhood', '==', myProfileSignals.neighborhood).limit(15).get()]);
                if (myProfileSignals.occupation) demoJobs.push(['occupation', db.collection('users').where('occupation', '==', myProfileSignals.occupation).limit(15).get()]);

                if (demoJobs.length) {
                    const demoResults = await Promise.all(demoJobs.map(([, p]) => p));
                    demoResults.forEach((snap, i) => {
                        const key = demoJobs[i][0];
                        snap.forEach(doc => bump(doc.id, key, true));
                    });
                }

                // Signal 8: Co-Liked Posts — people who liked the same posts as you.
                // likes docs: { postId, user, timestamp }. We sample a handful of posts you've
                // liked, then find other people who liked those same posts.
                try {
                    const myLikesSnap = await db.collection('likes').where('user', '==', myId).limit(20).get();
                    const myLikedPostIds = [...new Set(myLikesSnap.docs.map(d => d.data().postId).filter(Boolean))].slice(0, 8);
                    if (myLikedPostIds.length) {
                        const likeSnaps = await Promise.all(myLikedPostIds.map(pid =>
                            db.collection('likes').where('postId', '==', pid).get()
                        ));
                        likeSnaps.forEach(snap => snap.forEach(doc => {
                            const u = doc.data().user;
                            if (u && u !== myId) bump(u, 'coLiked', 1);
                        }));
                    }
                } catch (e) { console.error('Co-liked signal error:', e); }

                // Signal 9: Replied to Comment — people whose comment you replied to.
                // nexus_contributions docs: { postId, parentId, username, content }. A reply has
                // parentId set to the parent comment's doc ID; that parent doc's own `username`
                // field is the person you replied to.
                try {
                    const myCommentsSnap = await db.collection('nexus_contributions').where('username', '==', myId).limit(30).get();
                    const myReplyParentIds = [...new Set(myCommentsSnap.docs.map(d => d.data().parentId).filter(Boolean))].slice(0, 10);
                    if (myReplyParentIds.length) {
                        const parentDocs = await Promise.all(myReplyParentIds.map(pid => db.collection('nexus_contributions').doc(pid).get()));
                        parentDocs.forEach(doc => {
                            if (!doc.exists) return;
                            const repliedToUser = doc.data().username;
                            if (repliedToUser && repliedToUser !== myId) bump(repliedToUser, 'repliedToComment', true);
                        });
                    }
                } catch (e) { console.error('Reply signal error:', e); }

                // Signal 10: Cross-Vendor Interest — people chatting with the same vendor(s) as you.
                // vendor-chat.html now writes a real `customerId` field on every customer message
                // (see the fix applied there), so this runs as two clean indexed queries instead
                // of a full collection scan. Older chats sent before that fix won't have
                // customerId yet and simply won't be counted — no guessing involved.
                try {
                    const myVendorChatsSnap = await db.collection('vendorChats').where('customerId', '==', myId).get();
                    const myVendorIds = [...new Set(myVendorChatsSnap.docs.map(d => d.data().vendorId).filter(Boolean))].slice(0, 8);
                    if (myVendorIds.length) {
                        const vendorSnaps = await Promise.all(myVendorIds.map(vid =>
                            db.collection('vendorChats').where('vendorId', '==', vid).get()
                        ));
                        vendorSnaps.forEach(snap => snap.forEach(doc => {
                            const otherCustomer = doc.data().customerId;
                            if (otherCustomer && otherCustomer !== myId) bump(otherCustomer, 'sameVendor', true);
                        }));
                    }
                } catch (e) { console.error('Vendor signal error:', e); }

                alreadyFollowing.forEach(uid => reasons.delete(uid));
                reasons.delete(myId);

                document.getElementById('subtabCount-suggested').textContent = `(${reasons.size})`;

                if (!reasons.size) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No suggestions yet — follow a few people or fill in your workplace/school/city in Edit Profile to get started.</p>';
                    return;
                }

                const scored = [...reasons.entries()].map(([uid, r]) => {
                    const score = r.mutual * 3 + (r.followsMe ? 2 : 0)
                        + (r.workplace ? 2.5 : 0) + (r.school ? 2.5 : 0) + (r.city ? 1.5 : 0) + (r.neighborhood ? 2 : 0) + (r.occupation ? 1.5 : 0)
                        + (r.coLiked * 0.5) + (r.repliedToComment ? 1.5 : 0) + (r.sameVendor ? 1 : 0);
                    return { uid, r, score };
                }).sort((a, b) => b.score - a.score).slice(0, 25);

                const profiles = await Promise.all(scored.map(s => db.collection('users').doc(s.uid).get()));

                container.innerHTML = scored.map((s, i) => {
                    const userData = profiles[i].exists ? profiles[i].data() : {};
                    const p = {
                        uid: s.uid,
                        fullName: capName(userData.fullName || userData.name || userData.username || s.uid),
                        avatarUrl: userData.userProfilePic || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.uid}`,
                        isOnline: userData.isOnline === true,
                        lastSeenMillis: tsToMillis(userData.lastSeen),
                        reason: reasonLabel(s.r)
                    };
                    return personRowHtml(p, 'suggested');
                }).join('');
            } catch (e) {
                console.error('Suggestions error:', e);
                container.innerHTML = '<p style="text-align:center; padding:20px; color:#ff4444;">Error loading suggestions</p>';
            }
        }

        async function followSuggestedUser(otherUser, btnEl) {
            if (btnEl.classList.contains('done')) return;
            btnEl.disabled = true;
            btnEl.textContent = '...';
            try {
                await db.collection('follows').add({
                    follower: myId, following: otherUser,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('users').doc(otherUser).update({ followerCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
                await db.collection('users').doc(myId).set({ followingCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });

                const theirFollowsSnap = await db.collection('follows').where('follower', '==', otherUser).get();
                const isMutual = theirFollowsSnap.docs.some(d => d.data().following === myId);

                if (isMutual) {
                    await db.collection('users').doc(otherUser).update({ friendCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
                    await db.collection('users').doc(myId).update({ friendCount: firebase.firestore.FieldValue.increment(1) }).catch(() => {});
                    await db.collection('friends').add({ users: [myId, otherUser], createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                    await db.collection('notifications').add({
                        to: otherUser, from: myId, type: 'new_friend',
                        message: `${myId} followed you back — you're friends now!`,
                        read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await db.collection('notifications').add({
                        to: otherUser, from: myId, type: 'new_follower',
                        message: `${myId} started following you`,
                        read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                btnEl.textContent = 'Following';
                btnEl.classList.add('done', 'following');
                btnEl.disabled = false;
            } catch (e) {
                console.error('Follow error:', e);
                btnEl.textContent = 'Follow';
                btnEl.disabled = false;
            }
        }

        // --- Constellation / Network View — a live map of your friendships ---
        function toggleNetworkView() {
            const listView = document.getElementById('friendsListView');
            const netView = document.getElementById('networkViewContainer');
            const toggleBtn = document.getElementById('globalNetworkViewToggle');
            const isActive = netView.classList.toggle('active');
            listView.style.display = isActive ? 'none' : 'block';
            if (toggleBtn) toggleBtn.classList.toggle('active-view', isActive);
        }

        function renderNetworkGraph(list) {
            const wrap = document.getElementById('networkSvgWrap');
            if (!wrap) return;
            if (!list.length) { wrap.innerHTML = '<p style="text-align:center; color:#555; font-size:13px; padding:30px;">No friends to map yet</p>'; return; }

            const size = 320, cx = size / 2, cy = size / 2, radius = size * 0.38;
            const warmthColor = { hot: '#00F2FF', warm: '#4FD2E0', cool: '#7A8B99', cold: '#3A4249', none: '#2A2E35' };
            const n = list.length;

            let linksSvg = '', nodesSvg = '';
            list.forEach((f, i) => {
                const angle = (2 * Math.PI * i) / n - Math.PI / 2;
                const x = cx + radius * Math.cos(angle);
                const y = cy + radius * Math.sin(angle);
                const color = warmthColor[f.warmth] || warmthColor.none;
                const nodeR = 14 + Math.min(f.mutualCount, 6);

                linksSvg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${f.warmth === 'hot' ? 2 : 1}" opacity="${f.warmth === 'cold' || f.warmth === 'none' ? 0.25 : 0.6}"/>`;
                nodesSvg += `
                    <g class="network-node-circle" onclick="window.location.href='chat-interior.html?with=${encodeURIComponent(f.otherUser)}&avatar=${encodeURIComponent(f.avatarUrl)}'">
                        <circle cx="${x}" cy="${y}" r="${nodeR}" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
                        <text x="${x}" y="${y + nodeR + 11}" class="network-node-label">${f.fullName.split(' ')[0]}</text>
                    </g>`;
            });

            wrap.innerHTML = `
                <svg viewBox="0 0 ${size} ${size}" width="100%" style="max-width:340px; display:block; margin:0 auto;">
                    ${linksSvg}
                    <circle class="network-center-circle" cx="${cx}" cy="${cy}" r="16" fill="#00F2FF" fill-opacity="0.3" stroke="#00F2FF" stroke-width="2"/>
                    <text x="${cx}" y="${cy + 28}" class="network-node-label" style="fill:#00F2FF; font-weight:700;">You</text>
                    ${nodesSvg}
                </svg>`;
        }

        runOnChatsInit(() => {
            const personalLinks = document.querySelectorAll("#personal .chat-item");
            personalLinks.forEach(link => {
                const nameText = link.querySelector(".name").innerText;
                const avatarSrc = link.querySelector(".user-img").src;
                link.href = `chat-interior.html?user=${encodeURIComponent(nameText)}&avatar=${encodeURIComponent(avatarSrc)}`;
            });
        });

      let unsubPersonalChatsMain = null;
      let unsubFriendsMain = null;
      runOnChatsInit(() => {
        authReadyPromise.then((user) => {
            if (!user) return;
            unsubPersonalChatsMain = db.collection("personalChats").onSnapshot(() => { loadChats(); });
            unsubFriendsMain = db.collection("friends").onSnapshot(() => { loadFriendsList(); });
        });
      });
       function toggleSearchBar() {
    const bar = document.getElementById('searchBarContainer');
    const input = document.getElementById('searchInput');
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) {
        updateSearchPlaceholder();
        input.focus();
    } else {
        input.value = '';
        performGlobalSearch('');
    }
       } 
(function(){
/* =====================================================================
   NEXUS STATUS ENGINE — Firestore + username-session identity (ka
   amfani da localStorage 'nexus_user_session' kamar sauran app dinka,
   BA Firebase Auth uid ba), multi-slide stories, live viewers, privacy
   tiers, mute, premium/boosted, time capsules. Tsarin sort (expiring-
   soon-first a list, latest-first a reel) an kiyaye shi 100%.
===================================================================== */

/* =====================================================================
   NEXUS STATUS ENGINE — Firestore + username-session identity. Wannan
   module yana amfani da 'db', 'myId', da 'authReadyPromise' da suka
   riga sun wanzu a babban script na chats.html (babu sake-Firebase-init).
===================================================================== */

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
let statusData = [];          // grouped story-cards (1 per user)
let rawSlideDocs = [];        // duk slides (raw docs) daga Firestore
let currentUserProfile = { profileImg: '', fullName: '', closeFriends: [], mutedStatusUsers: [], isVerified: false, isPremium: false };
let uploadPrivacy = 'friends'; // default: Friends (mutual followers) kadai, ba public bane
let unsubscribeStatuses = null;

runOnChatsInit(() => {
    authReadyPromise.then((user) => {
        if (!user) return; // chats.html's babban script din ya riga ya tura login.html idan babu myId
        loadCurrentUserProfile().then(() => {
            subscribeToFriendGraph();
            startLiveStatusFeed();
        });
    });
});

function loadCurrentUserProfile() {
    if (!myId) return Promise.resolve();
    return db.collection('users').doc(myId).get().then((doc) => {
        const d = doc.exists ? doc.data() : {};
        currentUserProfile = {
            profileImg: d.userProfilePic || ("https://api.dicebear.com/7.x/bottts/svg?seed=" + myId),
            fullName: d.fullName || myId,
            closeFriends: d.closeFriends || [],
            mutedStatusUsers: d.mutedStatusUsers || [],
            isVerified: !!d.isVerified,
            isPremium: !!d.isPremium
        };
    }).catch(() => {});
}

/* =====================================================================
   FRIEND GRAPH: muna amfani da collection "friends" da ke KANSA yake
   kula dashi (automatic) daga follow-system dinka a me__5_.html —
   ana kirkirar doc { users: [A, B] } lokacin mutual-follow, ana share
   shi lokacin unfollow. Don haka nan take, idan an unfollow, status
   dinsa zai bace daga wurin mai kallo ba tare da wani karin code ba.
===================================================================== */

let myFriendsSet = new Set();
let unsubFriends = null;

function subscribeToFriendGraph() {
    if (!myId || !db) return;
    if (unsubFriends) unsubFriends();

    unsubFriends = db.collection('friends').where('users', 'array-contains', myId)
        .onSnapshot((snap) => {
            const set = new Set();
            snap.docs.forEach(d => {
                (d.data().users || []).forEach(u => { if (u !== myId) set.add(u); });
            });
            myFriendsSet = set;
            rebuildStoryGroups(); // status dinka yana sabuntawa kai tsaye idan friend list ya canza
        });
}

/* ===================== LIVE FEED (REAL-TIME) ===================== */

function startLiveStatusFeed() {
    if (unsubscribeStatuses) unsubscribeStatuses();
    const cutoff = Date.now() - STATUS_LIFETIME_MS;

    unsubscribeStatuses = db.collection('statusData')
        .where('timestamp', '>', cutoff)
        .onSnapshot((snapshot) => {
            rawSlideDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            rebuildStoryGroups();
        }, (err) => {
            console.error('Live feed error:', err);
            renderDefaultBackupStatuses();
        });
}

function isVisibleToMe(slide) {
    if (!myId) return false;
    if (slide.userId === myId) return true; // koyaushe kana ganin naka
    if (currentUserProfile.mutedStatusUsers.includes(slide.userId)) return false;

    // GATE NA FARKO, MAI TILAS: sai idan mu biyu Friends ne (mutual follow)
    if (!myFriendsSet.has(slide.userId)) return false;

    // Bayan an tabbatar Friends ne, sai a duba idan ya kunshe cikin
    // wani karin zaɓi mai kunkuntar iyaka (Close Friends / Except)
    const vis = slide.visibility || 'friends';
    if (vis === 'friends') return true;
    if (vis === 'closeFriends') return (slide.closeFriendsList || []).includes(myId);
    if (vis === 'except') return !(slide.exceptList || []).includes(myId);
    return true;
}

function isCapsuleLocked(slide) {
    return !!slide.unlockAt && slide.unlockAt > Date.now();
}

// Domin Time-Capsule kada ya yi leak: mun zabi preview daga slide na
// karshe da BA a kulle ba. Idan duka an kulle, mu nuna placeholder na
// "🔒" maimakon hoton na gaskiya.
function pickPreviewImg(slides) {
    for (let i = slides.length - 1; i >= 0; i--) {
        if (!isCapsuleLocked(slides[i])) return slides[i].previewImg;
    }
    return 'https://placehold.co/150x250/111111/FFD700?text=🔒+Locked';
}

// Hada slides da yawa na user daya zuwa story card guda (multi-slide grouping)
function rebuildStoryGroups() {
    const groups = {};
    let myCard = {
        id: 'my-status', userId: myId || 'me', username: 'My Status', isMe: true,
        profileImg: currentUserProfile.profileImg || 'https://placehold.co/40x40/111111/FFFFFF?text=Me',
        previewImg: 'https://placehold.co/150x250/111111/FFFFFF?text=No+Update',
        timestamp: Date.now(), totalUpdates: 0, viewedCount: 0, slides: [],
        isVerified: currentUserProfile.isVerified, isBoosted: false
    };

    rawSlideDocs.forEach((slide) => {
        if (!isVisibleToMe(slide)) return;
        const mine = myId && slide.userId === myId;
        if (mine) {
            myCard.slides.push(slide);
            return;
        }
        if (!groups[slide.userId]) {
            groups[slide.userId] = {
                id: slide.userId, userId: slide.userId, username: slide.username, isMe: false,
                profileImg: slide.profileImg || 'https://placehold.co/40x40/222222/FFFFFF',
                isVerified: !!slide.isVerified, isBoosted: !!slide.isBoosted,
                slides: []
            };
        }
        groups[slide.userId].slides.push(slide);
    });

    // My Status: slides na kaina, tsofaffi farko (domin gallery a status.html ya bi tsari daidai)
    myCard.slides.sort((a, b) => a.timestamp - b.timestamp);
    if (myCard.slides.length) {
        myCard.previewImg = pickPreviewImg(myCard.slides);
        myCard.timestamp = myCard.slides[0].timestamp;
        myCard.totalUpdates = myCard.slides.length;
    }

    statusData = [myCard];
    Object.values(groups).forEach((g) => {
        g.slides.sort((a, b) => a.timestamp - b.timestamp);
        g.previewImg = pickPreviewImg(g.slides);
        g.timestamp = g.slides[0].timestamp; // don sort: wanda ya fara post shine wanda zai fara expire
        g.totalUpdates = g.slides.length;
        g.viewedCount = g.slides.filter(s => (s.viewerIds || []).includes(myId)).length;
        statusData.push(g);
    });

    // Badge na Updates tab = adadin MUTANEN (ba naka ba) da suke da status
    // mai aiki a yanzu.
    if (typeof updateSmartBtnBadge === 'function') {
        updateSmartBtnBadge('updates', Object.values(groups).length);
    }

    if (typeof sortAndRenderStatus === 'function') sortAndRenderStatus();
}

/* ===================== UPLOAD / POST STATUS ===================== */

function setUploadPrivacy(v) {
    uploadPrivacy = v;
    document.querySelectorAll('.privacy-chip').forEach(c => c.classList.toggle('active', c.dataset.vis === v));
}

let pendingFile = null, pendingFileType = null, pendingObjectUrl = null;

function handleStatusUpload(input, fileType) {
    if (!(input.files && input.files[0])) return;
    const file = input.files[0];

    if (!myId) {
        showToast('Connection not ready yet, please wait a moment.');
        return;
    }

    pendingFile = file;
    pendingFileType = fileType;
    if (pendingObjectUrl) URL.revokeObjectURL(pendingObjectUrl);
    pendingObjectUrl = URL.createObjectURL(file);

    const previewImg = document.getElementById('composePreviewImg');
    const previewVideo = document.getElementById('composePreviewVideo');
    if (fileType === 'video') {
        previewVideo.src = pendingObjectUrl; previewVideo.style.display = 'block';
        previewImg.style.display = 'none';
    } else {
        previewImg.src = pendingObjectUrl; previewImg.style.display = 'block';
        previewVideo.style.display = 'none';
    }
    document.getElementById('composeCaptionInput').value = '';
    setUploadPrivacy('friends');
    document.getElementById('composePreviewOverlay').classList.add('active');

    // NOVEL FEATURE 5: Adaptive Privacy AI — TODO ga Samuel: haɗa wannan
    // da AI vision endpoint na Groq/HF akan backend dinka domin ainihin
    // auto-detection (misali hoton iyali -> Close Friends).
    suggestPrivacyTier(file).then(suggested => {
        if (suggested && suggested !== uploadPrivacy) {
            showToast(`💡 AI suggests: ${suggested === 'closeFriends' ? 'Close Friends' : 'Friends'} for this photo.`);
        }
    });
}

function cancelComposePreview() {
    document.getElementById('composePreviewOverlay').classList.remove('active');
    document.getElementById('hiddenCameraInput').value = '';
    document.getElementById('hiddenVideoInput').value = '';
    if (pendingObjectUrl) { URL.revokeObjectURL(pendingObjectUrl); pendingObjectUrl = null; }
    pendingFile = null; pendingFileType = null;
}

function confirmPostStatus() {
    if (!pendingFile || !myId) return;
    const caption = document.getElementById('composeCaptionInput').value.trim();
    const postBtn = document.getElementById('composePostBtn');
    postBtn.textContent = 'Posting...'; postBtn.disabled = true;

    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('type', 'status');
    formData.append('username', myId);

    fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Upload failed');
            return db.collection('statusData').add({
                userId: myId,
                username: currentUserProfile.fullName,
                profileImg: currentUserProfile.profileImg,
                previewImg: data.url,
                caption,
                type: pendingFileType,
                timestamp: Date.now(),
                visibility: uploadPrivacy,
                closeFriendsList: currentUserProfile.closeFriends,
                isVerified: currentUserProfile.isVerified,
                isBoosted: false,
                viewerIds: []
            });
        })
        .then(() => {
            showToast('Status posted! 🚀');
            cancelComposePreview();
        })
        .catch((error) => {
            console.error('Error uploading:', error);
            showToast('Something went wrong while posting your status.');
        })
        .finally(() => { postBtn.textContent = 'Post'; postBtn.disabled = false; });
}

// NOVEL FEATURE 5: Adaptive Privacy AI (scaffold). Ka maye gurbin jikin
// wannan function da fetch zuwa backend dinka na Groq/HF vision model
// domin ya bincika hoto ya bada shawarar da ta dace (misali: hoton
// iyali/na sirri -> 'closeFriends'). A yanzu yana mayar da null kawai
// domin kada ya karya upload flow yayin da ake shirya backend endpoint.
function suggestPrivacyTier(file) {
    return Promise.resolve(null);
    // Misali na gaba: return fetch('https://<render-backend>/ai/privacy-suggest', {method:'POST', body:file})
    //   .then(r => r.json()).then(d => d.suggestedTier).catch(() => null);
}

function postTimeCapsule(previewImg, unlockInHours, caption) {
    if (!db || !myId) return;
    db.collection('statusData').add({
        userId: myId,
        username: currentUserProfile.fullName,
        profileImg: currentUserProfile.profileImg,
        previewImg, caption,
        type: 'image',
        timestamp: Date.now(),
        unlockAt: Date.now() + (unlockInHours * 60 * 60 * 1000),
        visibility: uploadPrivacy,
        viewerIds: []
    }).then(() => showToast('Time-Capsule scheduled! ⏳'));
}

/* ===================== OVERLAY / MENU HELPERS ===================== */

function triggerAddStatus(event) { if (event) event.stopPropagation(); showPremiumOverlay(); }
function showPremiumOverlay() { document.getElementById('globalGlassOverlay').classList.add('active'); }
function hidePremiumOverlay() { document.getElementById('globalGlassOverlay').classList.remove('active'); }

function dispatchAction(route) {
    hidePremiumOverlay();
    if (route === 'camera') {
        document.getElementById('hiddenCameraInput').setAttribute('capture', 'environment');
        document.getElementById('hiddenCameraInput').click();
    } else if (route === 'gallery') {
        document.getElementById('hiddenCameraInput').removeAttribute('capture');
        document.getElementById('hiddenCameraInput').click();
    } else if (route === 'text') {
        window.location.href = `text-status.html`;
    } else if (route === 'music') {
        window.location.href = `music-status.html`;
    } else if (route === 'voice') {
        document.getElementById('hiddenVideoInput').click();
    }
}

function showToast(msg) {
    const t = document.getElementById('nxToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ===================== VIEWERS SHEET (My Status) ===================== */

function showViewersSheet(storyId) {
    const story = statusData.find(s => s.id === storyId);
    if (!story) return;
    const body = document.getElementById('viewersSheetBody');
    document.getElementById('viewersSheetTitle').textContent = `Viewed by ${story.slides.reduce((acc, s) => acc + (s.viewerIds ? s.viewerIds.length : 0), 0)}`;

    const allViewers = {};
    story.slides.forEach(s => (s.viewerDetails || []).forEach(v => { allViewers[v.uid] = v; }));
    const list = Object.values(allViewers).sort((a, b) => b.viewedAt - a.viewedAt);

    body.innerHTML = list.length ? list.map(v => `
        <div class="viewer-row">
            <img src="${v.photo || 'https://placehold.co/36x36/222/fff?text=U'}">
            <span class="vname">${v.name || 'Nexus User'}</span>
            <span class="vreaction">${v.reaction || ''}</span>
            <span class="vtime">${timeAgo(v.viewedAt)}</span>
        </div>`).join('') : `<div class="viewers-empty">No one has viewed this status yet 👀</div>`;

    document.getElementById('viewersSheetOverlay').classList.add('active');
}
function hideViewersSheet() { document.getElementById('viewersSheetOverlay').classList.remove('active'); }

/* ===================== CONTEXT MENU (Mute / Privacy / Delete) ===================== */

function openCtxMenu(storyId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const story = statusData.find(s => s.id === storyId);
    if (!story) return;
    const items = document.getElementById('ctxMenuItems');

    if (story.isMe) {
        items.innerHTML = `
            <div class="ctx-menu-item" onclick="showViewersSheet('${story.id}'); hideCtxMenu();">👁️ Viewed by</div>
            <div class="ctx-menu-item danger" onclick="deleteMyStatus(); hideCtxMenu();">🗑️ Delete status</div>`;
    } else {
        const isMuted = currentUserProfile.mutedStatusUsers.includes(story.userId);
        items.innerHTML = `
            <div class="ctx-menu-item" onclick="toggleMuteUser('${story.userId}'); hideCtxMenu();">${isMuted ? '🔊 Unmute' : '🔇 Mute'} ${story.username}</div>
            <div class="ctx-menu-item" onclick="showToast('Report submitted.'); hideCtxMenu();">🚩 Report</div>`;
    }
    document.getElementById('ctxMenuOverlay').classList.add('active');
}
function hideCtxMenu() { document.getElementById('ctxMenuOverlay').classList.remove('active'); }

function toggleMuteUser(userId) {
    if (!myId) return;
    const muted = currentUserProfile.mutedStatusUsers.includes(userId);
    currentUserProfile.mutedStatusUsers = muted
        ? currentUserProfile.mutedStatusUsers.filter(id => id !== userId)
        : [...currentUserProfile.mutedStatusUsers, userId];

    db.collection('users').doc(myId).set(
        { mutedStatusUsers: currentUserProfile.mutedStatusUsers }, { merge: true }
    ).then(() => { showToast(muted ? 'Unmuted.' : 'Muted.'); rebuildStoryGroups(); });
}

function deleteMyStatus() {
    const myCard = statusData.find(s => s.isMe);
    if (!myCard || !myCard.slides.length) { showToast('No status to delete.'); return; }
    const batch = db.batch();
    myCard.slides.forEach(s => batch.delete(db.collection('statusData').doc(s.id)));
    batch.commit().then(() => showToast('Status deleted.'));
}

/* ===================== MY STATUS LIST (overlay, WhatsApp-style) ===================== */

function openMyStatusList() {
    renderMyStatusList();
    document.getElementById('myStatusListOverlay').classList.add('active');
}
function closeMyStatusList() {
    document.getElementById('myStatusListOverlay').classList.remove('active');
}

function renderMyStatusList() {
    const myCard = statusData.find(s => s.isMe);
    const body = document.getElementById('myStatusListBody');
    if (!myCard || !myCard.slides.length) {
        body.innerHTML = `<div class="mysl-empty">You have no status updates yet.</div>`;
        return;
    }
    // Sabuwar farko (kamar yadda WhatsApp ke yi a My Status list)
    const slidesNewestFirst = [...myCard.slides].sort((a, b) => b.timestamp - a.timestamp);

    body.innerHTML = slidesNewestFirst.map((slide) => {
        const originalIndex = myCard.slides.indexOf(slide);
        const viewCount = (slide.viewerIds || []).length;
        return `
        <div class="mysl-row" onclick="closeMyStatusList(); openStatusMatrix('my-status', ${originalIndex});">
            <img src="${slide.previewImg || 'https://placehold.co/50x50/111/fff'}">
            <div class="mysl-meta">
                <div class="mysl-views">${viewCount} view${viewCount === 1 ? '' : 's'}</div>
                <div class="mysl-time">${timeAgo(slide.timestamp)}</div>
            </div>
            <div class="mysl-menu-btn" onclick="event.stopPropagation(); openSlideOptionsMenu('${slide.id}', event)">⋮</div>
        </div>`;
    }).join('');
}

function openSlideOptionsMenu(slideId, event) {
    const menu = document.getElementById('slideDropdownMenu');
    menu.innerHTML = `
        <div class="dd-item" onclick="forwardSlide('${slideId}'); closeSlideDropdown();">Forward</div>
        <div class="dd-item" onclick="shareSlide('${slideId}'); closeSlideDropdown();">Share</div>
        <div class="dd-item" onclick="editSlideCaption('${slideId}'); closeSlideDropdown();">Edit caption</div>
        <div class="dd-item danger" onclick="deleteSpecificSlide('${slideId}'); closeSlideDropdown();">Delete</div>`;

    // Matsayi: kusa da maballin ⋮ da aka danna, kamar WhatsApp
    const rect = event.target.getBoundingClientRect();
    menu.style.display = 'block';
    const menuWidth = menu.offsetWidth;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    let top = rect.bottom + 4;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = rect.top - menu.offsetHeight - 4;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    document.getElementById('slideDropdownCatcher').classList.add('active');
}
function closeSlideDropdown() {
    document.getElementById('slideDropdownMenu').style.display = 'none';
    document.getElementById('slideDropdownCatcher').classList.remove('active');
}

function forwardSlide(slideId) {
    const myCard = statusData.find(s => s.isMe);
    const slide = myCard && myCard.slides.find(s => s.id === slideId);
    if (!slide) return;
    const target = prompt('Forward to which username?');
    if (!target) return;
    db.collection('personalChats').add({
        from: myId, to: target,
        text: '', forwardedStatusPreview: slide.previewImg || '',
        forwardedStatusId: slide.id, timestamp: Date.now(), read: false
    }).then(() => showToast(`Forwarded to ${target}.`))
      .catch(() => showToast('Could not forward. Please try again.'));
}

function shareSlide(slideId) {
    const myCard = statusData.find(s => s.isMe);
    const slide = myCard && myCard.slides.find(s => s.id === slideId);
    if (!slide || !slide.previewImg) return;
    if (navigator.share) {
        navigator.share({ title: 'My Status', text: slide.caption || '', url: slide.previewImg }).catch(() => {});
    } else {
        navigator.clipboard.writeText(slide.previewImg)
            .then(() => showToast('Link copied — share it anywhere.'))
            .catch(() => showToast('Could not copy link.'));
    }
}

function editSlideCaption(slideId) {
    const myCard = statusData.find(s => s.isMe);
    const slide = myCard && myCard.slides.find(s => s.id === slideId);
    if (!slide) return;
    const newCaption = prompt('Edit caption:', slide.caption || '');
    if (newCaption === null) return;
    db.collection('statusData').doc(slideId).update({ caption: newCaption })
        .then(() => { showToast('Caption updated.'); slide.caption = newCaption; })
        .catch(() => showToast('Could not update caption.'));
}

function deleteSpecificSlide(slideId) {
    if (!confirm('Delete this status update?')) return;
    db.collection('statusData').doc(slideId).delete()
        .then(() => { showToast('Status deleted.'); renderMyStatusList(); })
        .catch(() => showToast('Could not delete. Please try again.'));
}

/* ===================== SEARCH ===================== */

let searchQuery = '';
function filterUpdatesBySearch(value) { searchQuery = value; sortAndRenderStatus(); }
function matchesSearch(status) { return !searchQuery || status.username.toLowerCase().includes(searchQuery.toLowerCase()); }
/* ===================== BACKUP (idan babu Firebase/network) ===================== */

function renderDefaultBackupStatuses() {
    statusData = [
        { id: 'my-status', userId: 'me', username: 'My Status', isMe: true, profileImg: 'https://placehold.co/40x40/111111/FFFFFF?text=Me', previewImg: 'https://placehold.co/150x250/111111/FFFFFF?text=No+Update', timestamp: Date.now(), viewedCount: 0, totalUpdates: 0, slides: [] },
        { id: 'ramatu', userId: 'ramatu', username: 'Ramatu Arahman', isMe: false, profileImg: 'https://placehold.co/40x40/333333/FFFFFF?text=RA', previewImg: 'https://placehold.co/150x250/333333/FFFFFF?text=Ramatu+Update', timestamp: Date.now() - 1440000, totalUpdates: 1, viewedCount: 1, slides: [{ id: 'demo1', caption: 'Beautiful sunset today 🌅', timestamp: Date.now() - 1440000, previewImg: 'https://placehold.co/150x250/333333/FFFFFF?text=Ramatu+Update' }] },
        { id: 'ahmad', userId: 'ahmad', username: 'Ahmad Tech Hub', isMe: false, profileImg: 'https://placehold.co/40x40/444444/FFFFFF?text=AT', previewImg: 'https://placehold.co/150x250/444444/FFFFFF?text=Ahmad+Update', timestamp: Date.now() - 7200000, totalUpdates: 1, viewedCount: 0, slides: [{ id: 'demo2', timestamp: Date.now() - 7200000, previewImg: 'https://placehold.co/150x250/444444/FFFFFF?text=Ahmad+Update' }] }
    ];
    sortAndRenderStatus();
}

/* ===================== RENDER: REEL (sama, latest-first — WhatsApp/IG style) ===================== */

function sortAndRenderStatus() {
    if (statusData.length === 0) return;

    const myStatusNode = statusData.find(s => s.isMe);
    const others = statusData.filter(s => !s.isMe && matchesSearch(s));

    // Boosted/promoted statuses koyaushe sun fito da farko (bayan My Status)
    others.sort((a, b) => {
        if (!!a.isBoosted !== !!b.isBoosted) return a.isBoosted ? -1 : 1;
        const aFullyViewed = a.viewedCount >= a.totalUpdates;
        const bFullyViewed = b.viewedCount >= b.totalUpdates;
        if (aFullyViewed && !bFullyViewed) return 1;
        if (!aFullyViewed && bFullyViewed) return -1;
        return b.timestamp - a.timestamp; // LATEST FIRST — kada a taba wannan mantiƙi
    });

    const finalSortedList = [];
    if (myStatusNode) finalSortedList.push(myStatusNode);
    finalSortedList.push(...others);

    const container = document.getElementById('statusReelContainer');
    if (!container) return;
    container.innerHTML = '';

    finalSortedList.forEach(status => {
        const card = document.createElement('div');
        card.className = 'status-node-circle';

        if (status.isMe) {
            card.setAttribute('onclick', status.slides.length ? `openMyStatusList()` : "triggerAddStatus(event)");
        } else {
            card.setAttribute('onclick', `openStatusMatrix('${status.id}')`);
        }
        card.oncontextmenu = (e) => openCtxMenu(status.id, e);
        let pressTimer;
        card.addEventListener('touchstart', () => { pressTimer = setTimeout(() => openCtxMenu(status.id), 550); });
        card.addEventListener('touchend', () => clearTimeout(pressTimer));

        let ringClass = 'avatar-ring-status';
        if (status.isMe) ringClass += ' my-node';
        else if (status.viewedCount >= status.totalUpdates) ringClass += ' viewed';
        if (status.isBoosted) ringClass += ' boosted-ring';

        const plusIcon = status.isMe ? `<div class="add-node-plus" onclick="triggerAddStatus(event)">+</div>` : '';
        const verifiedTick = status.isVerified ? `<svg class="verified-badge" viewBox="0 0 24 24" fill="#00F2FF"><path d="M12 2l2.4 2.1 3.1-.5 1 3 3 1-.5 3.1L23 12l-2.1 2.4.5 3.1-3 1-1 3-3.1-.5L12 23l-2.4-2.1-3.1.5-1-3-3-1 .5-3.1L1 12l2.1-2.4L2.6 6.5l3-1 1-3 3.1.5z"/><path d="M9 12l2 2 4-4" stroke="#000" stroke-width="2" fill="none"/></svg>` : '';
        const boostedTag = status.isBoosted ? `<div class="boosted-tag">⚡ Boosted</div>` : '';
        const viewersPill = status.isMe && status.totalUpdates > 0 ? `<div class="viewers-count-pill" onclick="event.stopPropagation(); showViewersSheet('${status.id}')">👁️ ${status.slides.reduce((a, s) => a + (s.viewerIds ? s.viewerIds.length : 0), 0)}</div>` : '';

        card.innerHTML = `
            ${boostedTag}
            <div class="${ringClass}">
                <img src="${status.profileImg}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">
                ${plusIcon}
            </div>
            <img src="${status.previewImg}" class="status-img">
            <span class="status-username">${status.username}${verifiedTick}</span>
            ${viewersPill}
       `;
        container.appendChild(card);
    });
    renderActiveUpdatesView();
}

/* ===================== RENDER: LIST (kasa, expiring-soon-first) ===================== */

function renderStatusUpdatesList() {
    const listContainer = document.getElementById('statusUpdatesListContainer');
    if (!listContainer) return;

    const now = Date.now();
    const friendsStatuses = statusData.filter(s => !s.isMe && matchesSearch(s));
    friendsStatuses.sort((a, b) => a.timestamp - b.timestamp); // WANDA ZAI FARA EXPIRE, SAMA — kada a taba

    listContainer.innerHTML = '';

    friendsStatuses.forEach(status => {
        const elapsed = now - status.timestamp;
        const progress = Math.min(100, (elapsed / STATUS_LIFETIME_MS) * 100);
        const lastCaption = status.slides.length ? status.slides[status.slides.length - 1].caption : '';

        const row = document.createElement('div');
        row.className = 'update-list-item';
        row.setAttribute('onclick', `openStatusMatrix('${status.id}')`);
        row.oncontextmenu = (e) => openCtxMenu(status.id, e);

        row.innerHTML = `
            <div class="update-info-block">
                <img src="${status.previewImg}" class="update-avatar">
                <div class="update-text-meta">
                    <h3>${status.username}${status.isVerified ? ' ✓' : ''}</h3>
                    <p>${lastCaption ? lastCaption : 'Tap to view status'}</p>
                </div>
            </div>
            <div class="update-timer-ring" style="--progress:${progress}"></div>
        `;
        listContainer.appendChild(row);
    });
}

let currentUpdatesView = 'list';
function setUpdatesView(view) {
    currentUpdatesView = view;
    const listContainer = document.getElementById('statusUpdatesListContainer');
    const gridContainer = document.getElementById('statusUpdatesGridContainer');
    const listBtn = document.getElementById('listViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');

    if (view === 'list') {
        listContainer.style.display = 'flex'; gridContainer.style.display = 'none';
        listBtn.classList.add('active'); gridBtn.classList.remove('active');
    } else {
        listContainer.style.display = 'none'; gridContainer.style.display = 'grid';
        gridBtn.classList.add('active'); listBtn.classList.remove('active');
    }
    renderActiveUpdatesView();
}
function renderActiveUpdatesView() {
    if (currentUpdatesView === 'list') renderStatusUpdatesList();
    else renderStatusUpdatesGrid();
}

function renderStatusUpdatesGrid() {
    const gridContainer = document.getElementById('statusUpdatesGridContainer');
    if (!gridContainer) return;

    const now = Date.now();
    const friendsStatuses = statusData.filter(s => !s.isMe && matchesSearch(s));
    friendsStatuses.sort((a, b) => a.timestamp - b.timestamp);

    gridContainer.innerHTML = '';
    friendsStatuses.forEach(status => {
        const elapsed = now - status.timestamp;
        const progress = Math.min(100, (elapsed / STATUS_LIFETIME_MS) * 100);

        const card = document.createElement('div');
        card.className = 'grid-status-card';
        card.style.backgroundImage = `url('${status.previewImg}')`;
        card.setAttribute('onclick', `openStatusMatrix('${status.id}')`);
        card.oncontextmenu = (e) => openCtxMenu(status.id, e);

        card.innerHTML = `
            <div class="grid-card-avatar-ring" style="--gprogress:${progress}">
                <img src="${status.profileImg}">
            </div>
            ${status.totalUpdates > 1 ? `<div class="grid-card-count">${status.totalUpdates}</div>` : ''}
            <span class="grid-card-name">${status.username}${status.isVerified ? ' ✓' : ''}</span>
        `;
        gridContainer.appendChild(card);
    });
}

/* ===================== NAVIGATION ===================== */

function openStatusMatrix(userKey, slideIndex) {
    // A baya wannan yana navigate zuwa status.html; yanzu status.html
    // overlay ne a wannan page din, don haka mu kira window.openStatusOverlay
    // (an bayyana shi a babban script na chats.html) maimakon href.
    setTimeout(() => { window.openStatusOverlay(userKey, slideIndex); }, 120);
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// refreshStatusTimers yana share statuses masu wuce 24hrs a LOCAL view kawai;
// tsaftar Firestore ta gaskiya tana faruwa ta hanyar .where('timestamp','>',cutoff)
// a lokacin da onSnapshot ke sabuntawa, don haka nan take kuma zata cire ta kanta.
function refreshStatusTimers() { renderActiveUpdatesView(); }
let statusTimersInterval = setInterval(refreshStatusTimers, 60000);


window.cancelComposePreview = cancelComposePreview;
window.closeMyStatusList = closeMyStatusList;
window.closeSlideDropdown = closeSlideDropdown;
window.confirmPostStatus = confirmPostStatus;
window.deleteMyStatus = deleteMyStatus;
window.deleteSpecificSlide = deleteSpecificSlide;
window.dispatchAction = dispatchAction;
window.editSlideCaption = editSlideCaption;
window.filterUpdatesBySearch = filterUpdatesBySearch;
window.forwardSlide = forwardSlide;
window.handleStatusUpload = handleStatusUpload;
window.hideCtxMenu = hideCtxMenu;
window.hidePremiumOverlay = hidePremiumOverlay;
window.hideViewersSheet = hideViewersSheet;
window.setUpdatesView = setUpdatesView;
window.setUploadPrivacy = setUploadPrivacy;
window.shareSlide = shareSlide;
window.showToast = showToast;
window.showViewersSheet = showViewersSheet;
window.toggleMuteUser = toggleMuteUser;
window.triggerAddStatus = triggerAddStatus;
window.openMyStatusList = openMyStatusList;
window.openStatusMatrix = openStatusMatrix;
window.openSlideOptionsMenu = openSlideOptionsMenu;
window.refreshNexusStatusReel = startLiveStatusFeed;

// Ana kira daga destroyChatsPage() kafin a bar chats.html zuwa wata
// page — domin rufe listeners/interval na wannan module.
window.__chatsStatusModuleDestroy = function () {
    if (unsubFriends) { unsubFriends(); unsubFriends = null; }
    if (unsubscribeStatuses) { unsubscribeStatuses(); unsubscribeStatuses = null; }
    if (statusTimersInterval) { clearInterval(statusTimersInterval); statusTimersInterval = null; }
};

})();

(function(){
/* =====================================================================
   NEXUS STORY MATRIX ENGINE — real Firebase Auth + Firestore, duk nau'in
   status (image/video/text/music/poll), viewer tracking, reactions,
   ghost mode na gaskiya, delete, time-capsule, AI enhance, duet, rooms.
===================================================================== */

/* =====================================================================
   NEXUS STORY MATRIX ENGINE — duk nau'in status (image/video/text/
   music/poll), viewer tracking, reactions, ghost mode, delete, time-
   capsule, AI enhance, duet, rooms. Yana amfani da 'db', 'myId', da
   'authReadyPromise' da suka riga sun wanzu a babban script na
   chats.html — babu sake-Firebase-init a nan.
===================================================================== */

const STATUS_LIFETIME_MS = 24 * 60 * 60 * 1000;
let myFullName = '', myProfileImg = '';
let myFriendsSet = new Set();
let storyFeed = [];          // [{ userId, username, avatar, isMe, slides:[...] }]
let currentActiveUser = null;
let currentMediaIndex = 0;
let hudTimerClock;
let trackingProgress = 0;
let matrixStepDuration = 6000;
let isGhostModeActive = false;
let mediaTypeTimers = { image: 6000, text: 6000, music: 12000, poll: 8000 };
let mainContainer;

runOnChatsInit(() => {
    authReadyPromise.then((user) => {
        if (!user) return;
        mainContainer = document.getElementById('matrixContainer');
        db.collection('users').doc(myId).get().then(doc => {
            const d = doc.exists ? doc.data() : {};
            myFullName = d.fullName || myId;
            myProfileImg = d.userProfilePic || ("https://api.dicebear.com/7.x/bottts/svg?seed=" + myId);
        }).catch(() => {});
        subscribeToFriendGraph();
        // Babu loadStoryFeed() a nan — status.html overlay ne yanzu, sai
        // an bude shi ta window.openStatusOverlay(userKey, idx) daga updates module.
    });
});

/* ===================== FRIEND GRAPH (collection "friends" da app dinka ke kula dashi) ===================== */

let unsubStoryMatrixFriendGraph = null;
function subscribeToFriendGraph() {
    if (unsubStoryMatrixFriendGraph) unsubStoryMatrixFriendGraph();
    unsubStoryMatrixFriendGraph = db.collection('friends').where('users', 'array-contains', myId).onSnapshot(snap => {
        const set = new Set();
        snap.docs.forEach(d => (d.data().users || []).forEach(u => { if (u !== myId) set.add(u); }));
        myFriendsSet = set;
    });
}

function isVisibleToMe(slide) {
    if (!myId) return false;
    if (slide.userId === myId) return true;
    if (!myFriendsSet.has(slide.userId)) return false;
    const vis = slide.visibility || 'friends';
    if (vis === 'friends') return true;
    if (vis === 'closeFriends') return (slide.closeFriendsList || []).includes(myId);
    if (vis === 'except') return !(slide.exceptList || []).includes(myId);
    return true;
}

/* ===================== LOAD STORY FEED ===================== */

function loadStoryFeed(targetUser, requestedIdxRaw) {
    const cutoff = Date.now() - STATUS_LIFETIME_MS;
    db.collection('statusData').where('timestamp', '>', cutoff).get().then((snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isVisibleToMe);
        const groups = {};
        docs.forEach(slide => {
            if (!groups[slide.userId]) {
                groups[slide.userId] = {
                    userId: slide.userId, username: slide.username,
                    avatar: slide.profileImg || 'https://placehold.co/40x40/222/fff',
                    isMe: myId && slide.userId === myId,
                    isBoosted: !!slide.isBoosted, slides: []
                };
            }
            groups[slide.userId].slides.push(slide);
        });
        Object.values(groups).forEach(g => g.slides.sort((a, b) => a.timestamp - b.timestamp));

        const me = Object.values(groups).find(g => g.isMe);
        const others = Object.values(groups).filter(g => !g.isMe);
        others.sort((a, b) => {
            if (!!a.isBoosted !== !!b.isBoosted) return a.isBoosted ? -1 : 1;
            return b.slides[0].timestamp - a.slides[0].timestamp; // latest-first, kamar reel
        });
        storyFeed = me ? [me, ...others] : others;

        if (!storyFeed.length) { showLoadError('No status updates to show right now.'); return; }

        const requestedIdx = parseInt(requestedIdxRaw, 10);
        const targetIndex = storyFeed.findIndex(g => g.userId === targetUser || (targetUser === 'my-status' && g.isMe));

        if (targetUser && targetIndex < 0) {
            showLoadError(`Could not find that status. It may have expired or been deleted.`);
            return;
        }

        currentActiveUser = targetIndex >= 0 ? targetIndex : 0;
        const activeSlideCount = storyFeed[currentActiveUser].slides.length;
        currentMediaIndex = (!isNaN(requestedIdx) && requestedIdx >= 0 && requestedIdx < activeSlideCount) ? requestedIdx : 0;

        loadMatrixNode();
    }).catch(err => {
        console.error('Load feed error:', err);
        showLoadError('Something went wrong loading this status: ' + err.message);
    });
}

// Maimakon shiru muka bar page din blank, muna nuna sako a fili tare
// da maballin "Go back" — wannan yana taimaka mana mu gano ainihin
// matsala nan take idan ta sake faruwa, maimakon zato kawai.
function showLoadError(msg) {
    document.getElementById('hudUsername').innerText = 'Unable to load';
    document.getElementById('hudTimeLabel').innerText = '';
    const canvas = document.getElementById('viewportCanvas');
    canvas.querySelectorAll('.dynamic-slide-content').forEach(el => el.remove());
    const img = document.getElementById('matrixMedia');
    if (img) img.style.display = 'none';
    const div = document.createElement('div');
    div.className = 'capsule-lock-view dynamic-slide-content';
    div.innerHTML = `<div class="lock-icon">⚠️</div><div>${msg}</div>
        <div style="margin-top:14px;padding:10px 20px;background:rgba(255,255,255,0.1);border-radius:10px;cursor:pointer;" onclick="disconnectMatrix()">Go back</div>`;
    canvas.appendChild(div);
}

/* ===================== RENDER CURRENT SLIDE ===================== */

function loadMatrixNode() {
    clearInterval(hudTimerClock);
    const profile = storyFeed[currentActiveUser];
    if (!profile) { disconnectMatrix(); return; }
    const slide = profile.slides[currentMediaIndex];

    document.getElementById('hudUsername').innerText = profile.username + (slide.isVerified ? ' ✓' : '');
    document.getElementById('hudTimeLabel').innerText = timeAgo(slide.timestamp);
    document.getElementById('hudAvatar').src = profile.avatar;
    document.getElementById('ownerDeleteBtn').style.display = profile.isMe ? 'flex' : 'none';

    const timeline = document.getElementById('hudTimeline');
    timeline.innerHTML = '';
    profile.slides.forEach((_, idx) => {
        const bar = document.createElement('div'); bar.className = 'hud-bar';
        const fill = document.createElement('div'); fill.className = 'hud-fill';
        if (idx < currentMediaIndex) fill.style.width = '100%';
        bar.appendChild(fill); timeline.appendChild(bar);
    });

    renderSlideContent(slide, profile);
    updateViewersStrip(profile);

    if (isCapsuleLocked(slide)) {
        matrixStepDuration = 3500; // ba a bincika lokaci sosai a kan wanda aka kulle
    } else {
        recordView(slide, profile);
        matrixStepDuration = mediaTypeTimers[slide.type] || 6000;
    }

    beginTimelineSweep();
}

function isCapsuleLocked(slide) { return !!slide.unlockAt && slide.unlockAt > Date.now(); }

function renderSlideContent(slide, profile) {
    const canvas = document.getElementById('viewportCanvas');
    canvas.querySelectorAll('.dynamic-slide-content').forEach(el => el.remove());
    const img = document.getElementById('matrixMedia');
    const video = document.getElementById('matrixVideo');
    img.style.display = 'none';
    if (video) video.style.display = 'none';

    if (isCapsuleLocked(slide)) {
        document.getElementById('ambientProjector').style.backgroundImage = 'none';
        const div = document.createElement('div');
        div.className = 'capsule-lock-view dynamic-slide-content';
        div.innerHTML = `<div class="lock-icon">⏳</div><div>Time-Capsule Status</div>
            <div class="lock-countdown" id="capsuleCountdown"></div>
            <div style="font-size:12px;color:var(--text-dim)">This will unlock automatically</div>`;
        canvas.appendChild(div);
        startCapsuleCountdown(slide.unlockAt);
        return;
    }

    document.getElementById('ambientProjector').style.backgroundImage =
        slide.previewImg ? `url('${slide.previewImg}')` : 'none';

    if (slide.type === 'text') {
        const div = document.createElement('div');
        div.className = 'text-status-card dynamic-slide-content';
        div.style.background = slide.bgGradient || 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)';
        div.textContent = slide.textContent || slide.caption || '';
        canvas.appendChild(div);
    } else if (slide.type === 'music') {
        const div = document.createElement('div');
        div.className = 'music-status-card dynamic-slide-content';
        div.innerHTML = `
            <img class="music-art" src="${slide.previewImg || 'https://placehold.co/180x180/111/fff?text=🎵'}">
            <div class="music-waveform">${Array.from({length:14}).map((_,i)=>`<span style="animation-delay:${i*0.07}s"></span>`).join('')}</div>
            <div style="font-size:14px;font-weight:600">${slide.caption || 'Now Playing'}</div>
            <audio id="matrixAudio" src="${slide.audioUrl || ''}" autoplay loop></audio>`;
        canvas.appendChild(div);
    } else if (slide.type === 'poll') {
        const div = document.createElement('div');
        div.className = 'poll-status-card dynamic-slide-content';
        const opts = slide.pollOptions || ['Yes', 'No'];
        const votes = slide.pollVotes || {};
        const total = Object.values(votes).reduce((a, b) => a + b, 0) || 1;
        div.innerHTML = `<h3 style="margin-bottom:8px">${slide.caption || 'Poll'}</h3>` + opts.map((o, i) => {
            const pct = Math.round(((votes[i] || 0) / total) * 100);
            return `<div class="poll-option" onclick="voteOnPoll('${slide.id}', ${i})"><div class="poll-fill" style="width:${pct}%"></div><span>${o} — ${pct}%</span></div>`;
        }).join('');
        canvas.appendChild(div);
    } else if (slide.type === 'video') {
        if (!video) {
            const v = document.createElement('video');
            v.id = 'matrixVideo'; v.className = 'matrix-media-frame';
            v.autoplay = true; v.playsInline = true; v.muted = false;
            canvas.insertBefore(v, canvas.firstChild);
        }
        const vEl = document.getElementById('matrixVideo');
        vEl.src = slide.previewImg; vEl.style.display = 'block';
        vEl.onloadedmetadata = () => { matrixStepDuration = (vEl.duration * 1000) || 6000; };
        vEl.play().catch(() => {});
    } else {
        img.src = slide.previewImg; img.style.display = 'block';
    }
}

function startCapsuleCountdown(unlockAt) {
    const el = document.getElementById('capsuleCountdown');
    if (!el) return;
    const tick = () => {
        const diff = unlockAt - Date.now();
        if (diff <= 0) { el.textContent = 'Unlocking...'; loadMatrixNode(); return; }
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
        el.textContent = `${h}h ${m}m`;
    };
    tick();
}

/* ===================== TIMELINE SWEEP / NAVIGATION ===================== */

function beginTimelineSweep() {
    trackingProgress = 0;
    const fills = document.querySelectorAll('.hud-fill');
    const targetFill = fills[currentMediaIndex];
    hudTimerClock = setInterval(() => {
        trackingProgress += (100 / (matrixStepDuration / 40));
        if (targetFill) targetFill.style.width = `${trackingProgress}%`;
        if (trackingProgress >= 100) { clearInterval(hudTimerClock); triggerNavigationPipeline(1); }
    }, 40);
}

function triggerNavigationPipeline(direction) {
    const profile = storyFeed[currentActiveUser];
    if (direction === 1) {
        if (currentMediaIndex < profile.slides.length - 1) { currentMediaIndex++; loadMatrixNode(); }
        else if (currentActiveUser < storyFeed.length - 1) { currentActiveUser++; currentMediaIndex = 0; loadMatrixNode(); }
        else disconnectMatrix();
    } else {
        if (currentMediaIndex > 0) { currentMediaIndex--; loadMatrixNode(); }
        else if (currentActiveUser > 0) { currentActiveUser--; currentMediaIndex = storyFeed[currentActiveUser].slides.length - 1; loadMatrixNode(); }
    }
}

function disconnectMatrix() { window.closeStatusOverlay(); }

// ENTRY POINT: ana kiran wannan daga updates module (ko wani wuri) domin
// bude status.html a matsayin full-page overlay, ba tare da navigation ba.
function openStatusOverlay(userKey, idx) {
    clearInterval(hudTimerClock);
    document.getElementById('statusOverlay').classList.add('active');
    loadStoryFeed(userKey, idx);
}
function closeStatusOverlay() {
    clearInterval(hudTimerClock);
    const so = document.getElementById('statusOverlay');
    so.classList.remove('active');
    // Idan an rufe ta ne yayin da take mini-embedded a cikin apv popup
    // (misali ta danna back-arrow, ko stories sun kare), sai a share
    // mini state din tare da rufe popup din shi ma — daya ne tsari.
    if (so.classList.contains('apv-mini')) {
        so.classList.remove('apv-mini');
        so.style.top = so.style.left = so.style.width = so.style.height = '';
        const mc = document.getElementById('matrixContainer');
        if (mc) mc.style.borderRadius = '';
        const backdrop = document.getElementById('avatarPhotoBackdrop');
        if (backdrop) backdrop.classList.remove('open');
    }
}

/* ===================== VIEWER TRACKING (Ghost Mode aware) ===================== */

function recordView(slide, profile) {
    if (!myId || profile.isMe || isGhostModeActive) return;
    db.collection('statusData').doc(slide.id).update({
        viewerIds: firebase.firestore.FieldValue.arrayUnion(myId),
        viewerDetails: firebase.firestore.FieldValue.arrayUnion({
            uid: myId,
            name: myFullName || myId,
            photo: myProfileImg || '',
            viewedAt: Date.now()
        })
    }).catch(() => {});
}

function updateViewersStrip(profile) {
    const strip = document.getElementById('viewersStrip');
    if (!profile.isMe) { strip.style.display = 'none'; return; }
    const slide = profile.slides[currentMediaIndex];
    const viewers = slide.viewerDetails || [];
    strip.style.display = viewers.length ? 'flex' : 'none';
    document.getElementById('viewersStripCount').textContent = `${viewers.length} view${viewers.length === 1 ? '' : 's'}`;
    document.getElementById('viewersStripAvatars').innerHTML = viewers.slice(0, 3)
        .map(v => `<img src="${v.photo || 'https://placehold.co/22x22/222/fff?text=U'}">`).join('');
}

function openViewersSheet() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    const viewers = slide.viewerDetails || [];
    document.getElementById('vsheetTitle').textContent = `Viewed by ${viewers.length}`;
    document.getElementById('vsheetBody').innerHTML = viewers.length
        ? viewers.sort((a,b)=>b.viewedAt-a.viewedAt).map(v => `
            <div class="vsheet-row"><img src="${v.photo || 'https://placehold.co/34x34/222/fff?text=U'}">
            <span class="vs-name">${v.name}</span><span class="vs-time">${timeAgo(v.viewedAt)}</span></div>`).join('')
        : `<div class="vsheet-empty">No one has viewed this status yet 👀</div>`;
    clearInterval(hudTimerClock);
    document.getElementById('statusViewersSheetOverlay').classList.add('active');
}
function closeViewersSheet() {
    document.getElementById('statusViewersSheetOverlay').classList.remove('active');
    beginTimelineSweep();
}

/* ===================== REACTIONS (double-tap + strip) ===================== */

let lastTapTime = 0;
runOnChatsInit(() => {
    const canvas = document.getElementById('viewportCanvas');
    canvas.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastTapTime < 300) { sendReaction('❤️'); popHeart(); }
        lastTapTime = now;
    });
});

function popHeart() {
    const heart = document.getElementById('doubleTapHeart');
    heart.classList.remove('pop'); void heart.offsetWidth; heart.classList.add('pop');
}

function toggleReactionStrip() { document.getElementById('reactionStrip').classList.toggle('show'); }

function sendReaction(emoji) {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!myId || profile.isMe) return;
    db.collection('statusData').doc(slide.id).collection('reactions').doc(myId).set({
        emoji, name: myFullName || myId, at: Date.now()
    }).then(() => showStatusToast(`${emoji} Reaction sent!`));
    document.getElementById('reactionStrip').classList.remove('show');
}

/* ===================== REPLY / TIP / SHARE / DOWNLOAD / DELETE ===================== */

runOnChatsInit(() => {
    const input = document.getElementById('replyInput');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReplyMessage(); }
    });
});

function sendReplyMessage() {
    const input = document.getElementById('replyInput');
    const text = input.value.trim();
    if (!text || !myId) return;
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];

    db.collection('personalChats').add({
        from: myId,
        to: profile.userId,
        text,
        statusReplyTo: slide.id,
        statusReplyPreview: slide.previewImg || '',
        timestamp: Date.now(),
        read: false
    }).then(() => { showStatusToast('Reply sent! 💬'); input.value = ''; })
      .catch(() => showStatusToast('Something went wrong sending your reply.'));
}

function triggerSynergyTip() {
    const profile = storyFeed[currentActiveUser];
    const amount = prompt('How much SYNERGY would you like to tip? (e.g. 0.5)', '0.5');
    if (!amount || isNaN(amount)) return;
    db.collection('tips').add({
        from: myId, to: profile.userId,
        amount: parseFloat(amount), timestamp: Date.now(), status: 'pending'
    }).then(() => showStatusToast(`⚡ ${amount} SYNERGY sent to ${profile.username}.`));
}

function shareToMyStatus() {
    clearInterval(hudTimerClock);
    mainContainer.classList.add('paused');
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    const caption = prompt('Write a caption:');
    if (caption !== null && myId) {
        db.collection('statusData').add({
            userId: myId, username: myFullName || myId,
            profileImg: myProfileImg || '', previewImg: slide.previewImg,
            type: slide.type || 'image', caption, timestamp: Date.now(),
            visibility: 'friends', sharedFromId: slide.id, viewerIds: []
        }).then(() => showStatusToast('🚀 Reshared to My Status!'));
    }
    beginTimelineSweep();
    mainContainer.classList.remove('paused');
}

function executeMediaDownload() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!slide.previewImg) { showStatusToast('No media to download.'); return; }
    fetch(slide.previewImg).then(r => r.blob()).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `nexus-status-${slide.id}`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        showStatusToast('📥 Status downloaded!');
    }).catch(() => window.open(slide.previewImg, '_blank'));
}

function deleteCurrentSlide() {
    const profile = storyFeed[currentActiveUser];
    const slide = profile.slides[currentMediaIndex];
    if (!profile.isMe) return;
    if (!confirm('Are you sure you want to delete this status?')) return;
    db.collection('statusData').doc(slide.id).delete().then(() => {
        showStatusToast('Status deleted.');
        profile.slides.splice(currentMediaIndex, 1);
        if (!profile.slides.length) { storyFeed.splice(currentActiveUser, 1); }
        if (currentMediaIndex >= profile.slides.length) currentMediaIndex = Math.max(0, profile.slides.length - 1);
        if (!storyFeed.length) { disconnectMatrix(); return; }
        loadMatrixNode();
    });
}

/* ===================== GHOST MODE (view anonymously — real) ===================== */

function toggleGhostInfiltration() {
    isGhostModeActive = !isGhostModeActive;
    const node = document.getElementById('ghostNode');
    node.classList.toggle('ghost-active', isGhostModeActive);
    showStatusToast(isGhostModeActive
        ? '👁️ Ghost Mode: viewing without appearing in the Viewers list.'
        : 'Ghost Mode: off.');
}

/* ===================== NOVEL FEATURE 2: AI STORY ENHANCER ===================== */
// TODO ga Samuel: haɗa wannan da Node/Groq backend dinka (Render) domin
// ainihin AI enhancement (auto-caption, cinematic grading). A yanzu
// mun sanya wani client-side visual boost na gaggawa domin ya zama
// functional yayin da ake shirya backend endpoint din.
function enhanceWithAI() {
    const img = document.getElementById('matrixMedia');
    if (img.style.display === 'none') { showStatusToast('AI Enhancer currently works on photos only.'); return; }
    showStatusToast('✨ Enhancing photo with AI...');
    img.style.transition = 'filter 0.6s';
    img.style.filter = 'contrast(1.15) saturate(1.3) brightness(1.05)';
    // fetch('https://<render-backend>/ai/enhance', { method:'POST', body: JSON.stringify({url: img.src}) })
}

/* ===================== NOVEL FEATURE 3: STORY DUET (video reply) ===================== */

let duetRecorder, duetChunks = [];
function startDuetRecording() {
    if (!navigator.mediaDevices) { showStatusToast("This device doesn't support recording."); return; }
    clearInterval(hudTimerClock);
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        duetChunks = [];
        duetRecorder = new MediaRecorder(stream);
        duetRecorder.ondataavailable = e => duetChunks.push(e.data);
        duetRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            uploadDuetClip(new Blob(duetChunks, { type: 'video/webm' }));
        };
        duetRecorder.start();
        showStatusToast('🎬 Recording your Duet... tap the button again to stop.');
        document.getElementById('duetBtn').onclick = () => duetRecorder.stop();
    }).catch(() => showStatusToast('Could not get camera/microphone permission.'));
}

function uploadDuetClip(blob) {
    if (!myId) return;
    const profile = storyFeed[currentActiveUser];
    const originalSlide = profile.slides[currentMediaIndex];
    showStatusToast('Uploading your Duet...');

    const formData = new FormData();
    formData.append('file', blob, `duet_${myId}_${Date.now()}.webm`);
    formData.append('type', 'duet');
    formData.append('username', myId);

    fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Upload failed');
            return db.collection('statusData').add({
                userId: myId, username: myFullName || myId,
                profileImg: myProfileImg || '', previewImg: data.url, type: 'video',
                timestamp: Date.now(), visibility: 'friends', duetOfId: originalSlide.id, viewerIds: []
            });
        })
        .then(() => { showStatusToast('🎬 Your Duet has been posted!'); document.getElementById('duetBtn').onclick = startDuetRecording; })
        .catch((error) => {
            console.error('Duet upload error:', error);
            showStatusToast('Something went wrong while uploading your Duet.');
            document.getElementById('duetBtn').onclick = startDuetRecording;
        });
}

/* ===================== NOVEL FEATURE 4: STORY ROOMS (collaborative) ===================== */
// Ana kira wannan daga updates.html ko wani UI na "Create Room" (za a
// haɗa button a can). Anan mun sanya function din join+contribute domin
// idan an bude status.html tare da ?room=ID, za a nuna slides din room.
function joinCollabRoom(roomId, mediaUrl, mediaType) {
    if (!myId) return;
    db.collection('statusData').doc(roomId).set({
        isRoom: true,
        roomSlides: firebase.firestore.FieldValue.arrayUnion({
            userId: myId, username: myFullName || myId,
            url: mediaUrl, type: mediaType || 'image', at: Date.now()
        }),
        contributorIds: firebase.firestore.FieldValue.arrayUnion(myId)
    }, { merge: true }).then(() => showStatusToast('Your contribution was added to the Room! 🎉'));
}

/* ===================== POLL VOTE ===================== */

function voteOnPoll(slideId, optionIndex) {
    if (!myId) return;
    db.collection('statusData').doc(slideId).set({
        pollVotes: { [optionIndex]: firebase.firestore.FieldValue.increment(1) },
        pollVoters: { [myId]: optionIndex }
    }, { merge: true }).then(() => showStatusToast('Your vote has been recorded! 🗳️'));
}

/* ===================== TOUCH / PAUSE HANDLING ===================== */

let __chatsStoryTouchGlobalsBound = false;
runOnChatsInit(() => {
    document.getElementById('touchLeft').addEventListener('click', () => triggerNavigationPipeline(-1));
    document.getElementById('touchRight').addEventListener('click', () => triggerNavigationPipeline(1));

    // touchLeft/touchRight sabbi ne kowane visit (an sake su ta innerHTML
    // swap), don haka aminci a sake daura musu listener. Amma `window`
    // kansa YANA WANZUWA a duk tsawon SPA session, don haka in ba a
    // yi guard ba, kowane komawa chats.html zai kara wani listener na
    // biyu/na uku a kan window — sai a bind SAU DAYA KACAL.
    if (!__chatsStoryTouchGlobalsBound) {
        __chatsStoryTouchGlobalsBound = true;
        window.addEventListener('touchstart', (e) => {
            if (['grid-left', 'grid-right'].includes(e.target.className)) {
                clearInterval(hudTimerClock);
                mainContainer.classList.add('paused', 'hud-hidden');
            }
        });
        window.addEventListener('touchend', (e) => {
            if (['grid-left', 'grid-right'].includes(e.target.className)) {
                beginTimelineSweep();
                mainContainer.classList.remove('paused', 'hud-hidden');
            }
        });
    }
});

/* ===================== HELPERS ===================== */

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function showStatusToast(msg) {
    const t = document.getElementById('nxToastStatus');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}


window.closeStatusOverlay = closeStatusOverlay;
window.closeViewersSheet = closeViewersSheet;
window.deleteCurrentSlide = deleteCurrentSlide;
window.disconnectMatrix = disconnectMatrix;
window.enhanceWithAI = enhanceWithAI;
window.executeMediaDownload = executeMediaDownload;
window.openViewersSheet = openViewersSheet;
window.sendReaction = sendReaction;
window.shareToMyStatus = shareToMyStatus;
window.startDuetRecording = startDuetRecording;
window.toggleGhostInfiltration = toggleGhostInfiltration;
window.triggerSynergyTip = triggerSynergyTip;
window.voteOnPoll = voteOnPoll;
window.openStatusOverlay = openStatusOverlay;

// Ana kira daga destroyChatsPage() (a ƙarshen chats.js) kafin a bar
// chats.html zuwa wata page — domin rufe listener/interval na wannan
// module, kada su ci gaba da gudana a boye kan DOM da ta riga ta bace.
window.__chatsStoryMatrixDestroy = function () {
    if (unsubStoryMatrixFriendGraph) { unsubStoryMatrixFriendGraph(); unsubStoryMatrixFriendGraph = null; }
    if (hudTimerClock) { clearInterval(hudTimerClock); hudTimerClock = null; }
};

})();

        // Self-contained IIFE — every variable/function name here is scoped
        // locally except the ones exposed on window at the bottom, so this
        // cannot collide with anything already in chats.html. Contact data
        // is the SAME real friendsDataCache the main Friends tab uses.
        (function () {
            let nmoCurrentFilter = 'all';
            let nmoCurrentQuery = '';

            function nmoVisibleList() {
                let list = friendsDataCache.slice();
                if (nmoCurrentFilter !== 'all') {
                    list = list.filter(f => classifyFriendStatus(f) === nmoCurrentFilter);
                }
                if (nmoCurrentQuery) {
                    list = list.filter(f => f.fullName.toLowerCase().includes(nmoCurrentQuery));
                }
                return list;
            }

            function renderNmoContacts() {
                const container = document.getElementById('nmoContactsListContainer');
                if (!container) return;
                const list = nmoVisibleList();

                if (!friendsDataCache.length) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No friends yet — when you and someone follow each other, they\'ll show up here.</p>';
                    return;
                }
                if (!list.length) {
                    container.innerHTML = '<p style="text-align:center; padding:30px; color:#555; font-size:13px;">No contacts match this filter</p>';
                    return;
                }

                container.innerHTML = '';
                list.forEach(f => {
                    const row = document.createElement('div');
                    row.className = 'nmo-contact-row';
                    row.setAttribute('onclick', `selectNmoContact('${f.otherUser}', '${encodeURIComponent(f.avatarUrl)}')`);
                    row.innerHTML = `
                        <div class="nmo-avatar-wrap">
                            <img class="nmo-contact-avatar" src="${f.avatarUrl}" alt="${f.fullName}">
                            ${f.isOnline ? '<div class="nmo-online-dot"></div>' : ''}
                        </div>
                        <div class="nmo-contact-meta">
                            <h3>${f.fullName}</h3>
                            <p>${lastSeenLabel(f.isOnline, f.lastSeenMillis, f.isDeleted, f.isDeactivated)}</p>
                        </div>
                    `;
                    container.appendChild(row);
                });
            }

            window.selectNmoContact = function (otherUser, encodedAvatar) {
                window.location.href = 'chat-interior.html?with=' + encodeURIComponent(otherUser) + '&avatar=' + encodedAvatar;
            };

            window.filterNmoContacts = function (query) {
                nmoCurrentQuery = query.trim().toLowerCase();
                renderNmoContacts();
            };

            window.openNewMessageOverlay = function () {
                document.getElementById('newMessageOverlay').classList.add('nmo-open');
                document.getElementById('nmoSearchInput').value = '';
                nmoCurrentQuery = '';
                if (!friendsDataCache.length && typeof loadFriendsList === 'function') loadFriendsList();
                renderNmoContacts();
            };

            window.toggleNmoFilterMenu = function (e) {
                e.stopPropagation();
                document.getElementById('nmoFilterMenu').classList.toggle('open');
            };

            window.applyNmoFilter = function (type, el) {
                nmoCurrentFilter = type;
                document.querySelectorAll('#nmoFilterMenu .nmo-filter-option').forEach(o => o.classList.remove('active'));
                el.classList.add('active');
                document.getElementById('nmoFilterMenu').classList.remove('open');
                renderNmoContacts();
            };

            document.addEventListener('click', function (e) {
                const menu = document.getElementById('nmoFilterMenu');
                if (menu && !e.target.closest('.nmo-filter-wrap')) menu.classList.remove('open');
            });

            window.closeNewMessageOverlay = function () {
                document.getElementById('newMessageOverlay').classList.remove('nmo-open');
            };

            // Live refresh: called from loadFriendsList() whenever the real
            // friends data changes, so this list stays in sync in real time.
            window.nmoRefreshList = renderNmoContacts;
        })();

/* ============================================================
   INIT / DESTROY / REGISTER — SPA lifecycle na chats.html.
   ------------------------------------------------------------
   initChatsPage() shine SABON "entry point" guda daya: yana
   gudanar da DUK abinda tsohon DOMContentLoaded/top-level
   immediate code ke yi, ta hanyar __chatsInitCallbacks array din
   da runOnChatsInit() ke tarawa a sama. NexusRouter zai kira
   wannan KOWANE LOKACI mutum ya shigo chats.html.

   destroyChatsPage() yana rufe DUK real-time Firestore listeners
   da intervals da module din suka bude, domin kada su ci gaba da
   gudana a boye bayan mutum ya bar chats.html zuwa wata page.
   ============================================================ */
function initChatsPage() {
    __chatsInitCallbacks.forEach(fn => {
        try { fn(); } catch (e) { console.error('chats.js init callback error:', e); }
    });
}

function destroyChatsPage() {
    if (typeof unsubPersonalChatsMain !== 'undefined' && unsubPersonalChatsMain) { unsubPersonalChatsMain(); unsubPersonalChatsMain = null; }
    if (typeof unsubFriendsMain !== 'undefined' && unsubFriendsMain) { unsubFriendsMain(); unsubFriendsMain = null; }
    if (typeof refreshChatTimesInterval !== 'undefined' && refreshChatTimesInterval) { clearInterval(refreshChatTimesInterval); refreshChatTimesInterval = null; }
    if (window.__chatsStatusModuleDestroy) window.__chatsStatusModuleDestroy();
    if (window.__chatsStoryMatrixDestroy) window.__chatsStoryMatrixDestroy();
}

if (window.NexusRouter) {
    NexusRouter.registerPage('chats.html', { init: initChatsPage, destroy: destroyChatsPage });
}

// Karo na farko: mu jira DOMContentLoaded kamar yadda tsohon tsari
// ya yi (native/full load); a SPA navigation kuma, router.js din
// shine ke kiran initChatsPage() kai-tsaye bayan ya loda wannan file.
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initChatsPage);
} else {
    initChatsPage();
}
