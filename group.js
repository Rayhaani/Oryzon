/* ============================================================
   GROUP.JS — extracted from group.html for SPA compatibility
   ------------------------------------------------------------
   Loaded once via router.js PAGE_SCRIPTS['group.html']. All
   top-level function declarations stay GLOBAL on purpose (this
   is a normal script, not a module) because the markup uses
   ~180 onclick="..." attributes that resolve names from the
   global scope — do NOT wrap this file in an IIFE.

   Lifecycle: initPage()/destroyPage() are registered with
   NexusRouter.registerPage('group.html', ...) at the bottom.
   initPage() re-derives ?group=slug + the logged-in user and
   re-subscribes Firestore listeners EVERY time this page is
   navigated into (so switching from one group straight to
   another works without a full reload). destroyPage() tears
   down snapshot listeners, window/document listeners, and any
   active timer so nothing leaks or double-fires on re-entry.
   ============================================================ */

        // ============================================================
        // FIREBASE + REAL GROUP IDENTITY (oryzon-50ea4)
        // ============================================================
        const firebaseConfig = {
            apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
            authDomain: "oryzon-50ea4.firebaseapp.com",
            databaseURL: "https://oryzon-50ea4-default-rtdb.firebaseio.com",
            projectId: "oryzon-50ea4",
            storageBucket: "oryzon-50ea4.firebasestorage.app",
            messagingSenderId: "782106742622",
            appId: "1:782106742622:web:902d512bfe42dd4cf289cf",
            measurementId: "G-K5085DLL2W"
        };
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();
        const MEDIA_UPLOAD_ENDPOINT = 'https://synergy-backend-1-eh93.onrender.com/upload';
        const FieldValue = firebase.firestore.FieldValue;

        // SPA NOTE: these used to be `const`, read ONCE at native page load.
        // Under router.js, group.js loads once but init() can run again for a
        // different ?group=slug (or a different user), so they are now `let`
        // and re-derived fresh on every initPage() call below.
        let currentUsername = null;
        let authReadyResolve;
        let authReadyPromise;

        let groupSlug = null;
        // NOTE: the "gi-loading" class already hides the demo title/count
        // elements via CSS (added in <head>) before this script even runs —
        // no JS-based clearing needed here anymore. Under SPA nav the class
        // is re-applied manually in initPage() since that CSS lives in the
        // <head>-loaded group.css, but the class itself is toggled on <html>.
        let groupData = null;
        let isGroupAdmin = false;
        let groupUnsub = null;
        let groupPostsUnsub = null;
        let groupMessagesUnsub = null;
        let groupFeedLoaded = false;

        function groupRef() { return db.collection('groups').doc(groupSlug); }
        function formatMemberCount(n) {
            if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
            if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
            return (n || 0).toString();
        }

       async function initRealGroup() {
            if (!groupSlug) return; // no ?group= — keep the built-in demo content as local preview

            // Fara sauraren group doc NAN TAKE — karanta group baya bukatar
            // auth (Firestore rule: allow read: if true), don haka ainihin
            // suna/hoto/adadin members baya bukatar jiran auth + auto-join
            // check da ke kasa. Wannan shi ne ke cire delay din daƙiƙa da yawa
            // kafin sunan ya bayyana.
            groupUnsub = groupRef().onSnapshot(doc => { 
                if (!doc.exists) {
                    showToast('This group doesn\'t exist yet', 'fa-triangle-exclamation');
                    return;
                }
                groupData = doc.data();
                isGroupAdmin = !!(currentUsername && (groupData.creatorUsername === currentUsername || (groupData.adminUsernames || []).includes(currentUsername)));

                const name = groupData.name;
                const memberLabel = formatMemberCount(groupData.memberCount || 0) + ' members';
                document.getElementById('groupTitleChat').textContent = name;
                document.getElementById('groupSubtitleChat').textContent = '● ' + memberLabel;
                document.getElementById('groupTitleFeed').textContent = name;
                document.getElementById('groupNameFeed').textContent = name;
                document.getElementById('groupMetaFeed').textContent = (groupData.privacy === 'private' ? 'Private group' : 'Public group') + ' · ' + memberLabel;
                document.getElementById('giGroupNameLabel').textContent = name;
                document.getElementById('giMetaText').textContent = memberLabel;
                if (groupData.avatarUrl) {
                    document.getElementById('groupAvatarChat').src = groupData.avatarUrl;
                    document.getElementById('giAvatarImg').src = groupData.avatarUrl;
                }
               if (groupData.coverUrl) document.getElementById('groupCoverFeed').src = groupData.coverUrl;

                document.documentElement.classList.remove('gi-loading');

                if (!groupFeedLoaded) { renderFeedPosts(); groupFeedLoaded = true; }
                loadRealChatMessages();
            }, err => console.error('group listener error:', err));

            // Auto-join: viewing a real group makes you a member (matches the
            // "Public Group" privacy option from group-create.html). Private
            // groups / approval requests are not built yet. Wannan yana gudana
            // a daban, baya toshe display na sunan group.
            const authUser = await authReadyPromise;
            if (!authUser) return;

            const memberRef = groupRef().collection('members').doc(currentUsername);
            const memberSnap = await memberRef.get();
            if (!memberSnap.exists) {
                await memberRef.set({ joinedAt: FieldValue.serverTimestamp(), role: 'member' });
                // Fan-out: rubuta index a KANSA (users/{me}/myGroups/{groupId}) —
                // wannan shine kadai abinda chats.html zai karanta domin jera
                // "my groups", don haka babu bukatar wata collectionGroup query
                // mai bude membership na DUK groups a database.
                await db.collection('users').doc(currentUsername).collection('myGroups').doc(groupSlug)
                    .set({ joinedAt: FieldValue.serverTimestamp() });
                await groupRef().update({ memberCount: FieldValue.increment(1) }).catch(() => {});
            }
       } 

        // ============================================================
        // 0. UTILITIES
        // ============================================================
        function showToast(msg, icon = 'fa-circle-check') {
            const stack = document.getElementById('toastStack');
            const t = document.createElement('div');
            t.className = 'nx-toast';
            t.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
            stack.appendChild(t);
            requestAnimationFrame(() => t.classList.add('show'));
            setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2800);
        }
        function copyGroupLink() {
            const link = 'https://rayhaani.github.io/Oryzon/group/northern-innovators-2026';
            if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
            showToast('Invite link copied to clipboard', 'fa-link');
        }
        // ---- Invite Members overlay ----
        let currentInviteTab = 'friends';
        const inviteFriends = [
            { id: 'f1', name: 'Usman Bin Sani', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'f2', name: 'Aliyu NG', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'f3', name: 'Sanusi Ashiru', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'f4', name: 'Shehu Hashimu', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', invited: false }
        ];
        const inviteSuggested = [
            { id: 's1', name: 'Mubarak Lawal', pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 's2', name: 'Abubakar Sadeeq', pic: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 's3', name: 'Amina Yusuf', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', invited: false }
        ];
        const inviteFollowers = [
            { id: 'fl1', name: 'Halima Bello', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'fl2', name: 'Tijjani Yusuf', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'fl3', name: 'Rukayya Ahmad', pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80', invited: false }
        ];
        const inviteGroups = [
            { id: 'g1', name: 'Kano Traders Circle', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'g2', name: 'Abuja Business Network', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', invited: false },
            { id: 'g3', name: 'Lagos Tech Founders', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', invited: false }
        ];
        function openInviteOverlay() {
            document.getElementById('inviteMembersOverlay').classList.add('active');
            document.getElementById('inviteSearchBarContainer').classList.remove('active');
            switchInviteTab('friends');
        }
        function closeInviteOverlay() {
            document.getElementById('inviteMembersOverlay').classList.remove('active');
        }
        function switchInviteTab(tab) {
            currentInviteTab = tab;
            document.querySelectorAll('.invite-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            const list = tab === 'friends' ? inviteFriends : tab === 'suggested' ? inviteSuggested : tab === 'followers' ? inviteFollowers : inviteGroups;
            renderInviteList(list);
        }
        function toggleInviteSearchBar() {
            const bar = document.getElementById('inviteSearchBarContainer');
            const input = document.getElementById('inviteSearchInput');
            bar.classList.toggle('active');
            if (bar.classList.contains('active')) {
                input.focus();
            } else {
                input.value = '';
                switchInviteTab(currentInviteTab);
            }
        }
        function runInviteSearch(q) {
            const all = [...inviteFriends, ...inviteSuggested, ...inviteFollowers, ...inviteGroups];
            const filtered = q.trim() ? all.filter(f => f.name.toLowerCase().includes(q.toLowerCase())) : all;
            renderInviteList(filtered);
        }
        function renderInviteList(list) {
            document.getElementById('inviteListBody').innerHTML = list.length ? list.map(f => `
                <div class="invite-row">
                    <img src="${f.pic}">
                    <div class="ir-name">${f.name}</div>
                    <button class="ir-invite-btn ${f.invited ? 'invited' : ''}" onclick="sendInvite('${f.id}', this)">${f.invited ? 'Invited' : 'Invite'}</button>
                </div>`).join('') : `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:40px 0;">No results found</p>`;
        }
        function sendInvite(id, btn) {
            const f = [...inviteFriends, ...inviteSuggested, ...inviteFollowers, ...inviteGroups].find(x => x.id === id);
            if (f) f.invited = true;
            btn.textContent = 'Invited';
            btn.classList.add('invited');
            showToast('Invitation sent to ' + (f ? f.name : 'friend'), 'fa-user-plus');
        }
        function fmtClockTime(d) { return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        function fmtRelative(d) {
            const diff = Math.floor((Date.now() - d.getTime()) / 1000);
            if (diff < 60) return 'Just now';
            if (diff < 3600) return Math.floor(diff / 60) + 'm';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h';
            return Math.floor(diff / 86400) + 'd';
        }
        function fmtDayLabel(d) {
            const today = new Date(); today.setHours(0,0,0,0);
            const y = new Date(today); y.setDate(y.getDate() - 1);
            const dd = new Date(d); dd.setHours(0,0,0,0);
            if (dd.getTime() === today.getTime()) return 'Today';
            if (dd.getTime() === y.getTime()) return 'Yesterday';
            return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
        }
        function escapeHtml(s) {
            return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        }
        function closeSheet(id) { document.getElementById(id).classList.remove('active'); }
        function openSheetEl(id) { document.getElementById(id).classList.add('active'); }

        // ============================================================
        // 1. GROUP INFO OVERLAY (Telegram-style)
        // ============================================================
        function openGroupInfo() {
            document.getElementById('groupInfoOverlay').classList.add('active');
            switchGiTab('members');
        }
        function closeGroupInfo() {
            document.getElementById('groupInfoOverlay').classList.remove('active');
            toggleGiOptionsMenu(false);
        }
        function switchGiTab(tab) {
            document.querySelectorAll('.gi-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
            document.querySelectorAll('.gi-tab-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('giPanel' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
            if (tab === 'members') renderGiMembersTab();
        }
        function renderGiMembersTab() {
            const roleLabel = { Admin: 'Owner', Moderator: 'Admin' };
            document.getElementById('giPanelMembers').innerHTML = groupMembers.map(m => `
                <div class="gi-member-row">
                    <img src="${m.pic}">
                    <div>
                        <div class="gmr-name">${m.name}</div>
                        <div class="gmr-status">${m.role === 'Admin' ? 'online' : 'last seen recently'}</div>
                    </div>
                    ${roleLabel[m.role] ? `<span class="gmr-role">${roleLabel[m.role]}</span>` : ''}
                </div>`).join('');
        }
        function renameGroupPrompt() {
            const current = document.getElementById('giGroupNameLabel').textContent;
            const next = prompt('Rename group:', current);
            if (next && next.trim()) {
                document.getElementById('giGroupNameLabel').textContent = next.trim();
                document.querySelectorAll('.group-title, .fb-header-title').forEach(el => el.textContent = next.trim());
                showToast('Group renamed', 'fa-pen');
            }
        }
        function openGroupStatistics() {
            showToast('Group Statistics: 12.4K members · 318 posts this month · 92% weekly active', 'fa-chart-line');
        }

        // ---- Group Info's own "..." dropdown menu ----
        function toggleGiOptionsMenu(show) {
            const menu = document.getElementById('giOptionsMenu');
            const backdrop = document.getElementById('giOptionsBackdrop');
            const next = (show === undefined) ? !menu.classList.contains('active') : show;
            menu.classList.toggle('active', next);
            backdrop.classList.toggle('active', next);
        }
        let chatLockOn = false, autoTranslateOn = false, lowDataOn = false, voiceA11yOn = false;
        function toggleChatLockMenu() {
            chatLockOn = !chatLockOn;
            document.getElementById('chatLockMenuLabel').textContent = 'Chat lock: ' + (chatLockOn ? 'On' : 'Off');
            document.getElementById('chatLockMenuIcon').className = chatLockOn ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open';
            showToast(chatLockOn ? 'Chat locked on this device' : 'Chat unlocked', 'fa-lock');
        }
        function toggleAutoTranslateMenu() {
            autoTranslateOn = !autoTranslateOn;
            document.getElementById('autoTranslateMenuLabel').textContent = 'Auto-translate: ' + (autoTranslateOn ? 'On' : 'Off');
            showToast(autoTranslateOn ? 'Auto-translate is now ON for this chat' : 'Auto-translate turned off', 'fa-globe');
        }
        function toggleLowDataMenu() {
            lowDataOn = !lowDataOn;
            document.getElementById('lowDataMenuLabel').textContent = 'Low-data mode: ' + (lowDataOn ? 'On' : 'Off');
            showToast(lowDataOn ? 'Low-data mode enabled — optimized for weak networks' : 'Low-data mode disabled', 'fa-wifi');
        }
        function toggleVoiceA11yMenu() {
            voiceA11yOn = !voiceA11yOn;
            document.getElementById('voiceA11yMenuLabel').textContent = 'Voice accessibility: ' + (voiceA11yOn ? 'On' : 'Off');
            showToast(voiceA11yOn ? 'Voice accessibility mode enabled' : 'Voice accessibility mode disabled', 'fa-microphone-lines');
        }

        // ============================================================
        // 2. MODE SWITCHING
        // ============================================================
        let feedRendered = false;

      function switchMode(mode) {
            document.documentElement.classList.remove('preload-feed');
            localStorage.setItem('nexus_group_mode', mode);
            const isChat = mode === 'chat';

            document.getElementById('headerLeftChat').style.display = isChat ? 'flex' : 'none';
            document.getElementById('headerLeftFeed').style.display = isChat ? 'none' : 'flex';

            document.getElementById('chat-flow').style.display = isChat ? 'flex' : 'none';
            document.getElementById('dockContainer').style.display = isChat ? 'flex' : 'none';
            document.getElementById('feedView').style.display = isChat ? 'none' : 'flex';
            document.getElementById('pinnedBar').classList.toggle('active', isChat && !!pinnedMessageId);
            if (isChat) {
                document.querySelector('header').classList.remove('header-feed-transparent');
            } else {
                updateFeedHeaderState();
                requestAnimationFrame(updateFeedHeaderState);
            }
            document.getElementById('toggleChatBtn').classList.toggle('active', isChat);
            document.getElementById('toggleFeedBtn').classList.toggle('active', !isChat);
            document.getElementById('modeThumb').style.transform = isChat ? 'translateX(100%)' : 'translateX(0%)';

            if (!isChat && !feedRendered) {
                renderFeedPosts();
                feedRendered = true;
            }
        }

        // ============================================================
        // 3. CHAT ENGINE — single renderer for every bubble (fixes the
        //    "different timestamp style" bug for good).
        // ============================================================
        let chatMessages = [
            { id: 'c1', from: 'them', name: 'Ali_Developer', role: 'Chairman / CEO', roleClass: 'role-ceo', verified: true,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
              text: 'Great news — the full 2026 rollout schedule for the Super Community Platform is locked in.',
              time: new Date(Date.now() - 1000 * 60 * 60 * 6), reactions: { '👍': 4, '🔥': 2 }, starred: false },
            { id: 'c2', from: 'them', name: 'MmnAfrah Networker', role: 'P.R.O', roleClass: 'role-pro', verified: true,
              avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
              text: 'Here is a quick voice update from admin:', voice: { duration: '0:42' },
              time: new Date(Date.now() - 1000 * 60 * 60 * 4), reactions: {}, starred: false },
            { id: 'c3', from: 'me', text: 'This new header and typing bar design looks incredible — cleanest group experience I have used.',
              time: new Date(Date.now() - 1000 * 60 * 60 * 2), reactions: {}, starred: false, status: 'read' }
        ];
        let replyTarget = null;
        let pinnedMessageId = null;
        let activeTrayMsgId = null;

        function renderChatFlow() {
            const flow = document.getElementById('chat-flow');
            let html = '';
            let lastDay = null;
            let lastSender = null;
            chatMessages.forEach(m => {
                const dayLbl = fmtDayLabel(m.time);
                if (dayLbl !== lastDay) { html += `<div class="day-divider"><span>${dayLbl}</span></div>`; lastDay = dayLbl; lastSender = null; }
                const grouped = lastSender === m.from && !m.replyTo && !m.forwarded;
                html += renderChatMessage(m, grouped);
                lastSender = m.from;
            });
            flow.innerHTML = html;
            if (typingIndicatorActive) flow.insertAdjacentHTML('beforeend', typingRowHTML());
            flow.scrollTop = flow.scrollHeight;
            renderPinnedBar();
        }

        function detectLinkSafety(text) {
            if (!text) return '';
            const hasLink = /https?:\/\/|www\./i.test(text);
            if (!hasLink) return '';
            const suspicious = /bit\.ly|free-?money|claim.*prize|verify.*account.*now|win.*lottery/i.test(text);
            return suspicious
                ? `<div class="msg-safety-badge warn"><i class="fa-solid fa-triangle-exclamation"></i> Nexus Safety Scan flagged this link as risky</div>`
                : `<div class="msg-safety-badge"><i class="fa-solid fa-shield-halved"></i> Link scanned — looks safe</div>`;
        }

        function renderChatMessage(m, grouped) {
            const isOut = m.from === 'me';
            const reactionsHtml = Object.keys(m.reactions || {}).length
                ? `<div class="msg-reactions">${Object.entries(m.reactions).map(([e,c]) => `<span class="msg-reaction-pill">${e} ${c}</span>`).join('')}</div>` : '';
            const replyHtml = m.replyTo ? (() => {
                const rt = chatMessages.find(x => x.id === m.replyTo);
                if (!rt) return '';
                return `<div class="msg-reply-quote"><span class="rq-name">${rt.from === 'me' ? 'You' : rt.name}</span><span class="rq-text">${escapeHtml(rt.text || (rt.voice ? '🎤 Voice message' : ''))}</span></div>`;
            })() : '';
            const fwdHtml = m.forwarded ? `<div class="msg-forwarded-tag"><i class="fa-solid fa-share"></i> Forwarded</div>` : '';
            const voiceHtml = m.voice ? `
                <div class="voice-card">
                    <button class="play-btn" onclick="showToast('Playing voice message...', 'fa-play')"><i class="fa-solid fa-play"></i></button>
                    <div class="waveform">${[8,16,12,20,10,14,6,18,9].map(h => `<bar style="height:${h}px"></bar>`).join('')}</div>
                    <span class="speed-btn" onclick="this.textContent = this.textContent==='1x' ? '1.5x' : this.textContent==='1.5x' ? '2x' : '1x'">1x</span>
                </div>` : '';
            const imgHtml = m.image ? `<img src="${m.image}" style="width:100%; max-width:230px; border-radius:10px; margin-top:4px; display:block; cursor:pointer;" onclick="showToast('Opening full-size photo...', 'fa-image')">` : '';
            const safetyHtml = detectLinkSafety(m.text);
            const starFlag = m.starred ? `<i class="fa-solid fa-star msg-star-flag"></i>` : '';
            const ticks = isOut ? `<span class="msg-ticks ${m.status === 'read' ? 'read' : ''}"><i class="fa-solid fa-check-double"></i></span>` : '';

            const headerHtml = (!isOut && !grouped) ? `
                <div class="msg-header">
                    <span class="sender-name">${m.name} ${m.verified ? `<i class="fa-solid fa-circle-check" style="color:var(--neon-cyan); font-size:11px;"></i>` : ''}</span>
                    <span class="role-tag ${m.roleClass}">${m.role}</span>
                </div>` : '';

            return `
            <div class="msg-row ${isOut ? 'outgoing' : 'incoming'} ${grouped ? 'grouped-follow' : ''}" data-id="${m.id}" style="position:relative;" onmousedown="pressStart('${m.id}')" onmouseup="pressEnd()" onmouseleave="pressEnd()" ontouchstart="pressStart('${m.id}')" ontouchend="pressEnd()">
                ${!isOut ? `<img class="msg-avatar" src="${m.avatar}" alt="${m.name}">` : ''}
                <div class="msg-card">
                    ${starFlag}
                    ${headerHtml}
                    <div class="msg-body">
                        ${fwdHtml}${replyHtml}${escapeHtml(m.text || '')}${voiceHtml}${imgHtml}${safetyHtml}
                        <span class="msg-time-inline">${fmtClockTime(m.time)}${ticks}</span>
                    </div>
                    ${reactionsHtml}
                </div>
            </div>`;
        }

        let pressTimer = null;
        function pressStart(id) { pressTimer = setTimeout(() => openMsgTray(id), 420); }
        function pressEnd() { clearTimeout(pressTimer); }

        function openMsgTray(id) {
            activeTrayMsgId = id;
            const m = chatMessages.find(x => x.id === id);
            if (!m) return;
            document.getElementById('trayEmojiRow').innerHTML = ['👍','❤️','😂','😮','😢','🙏'].map(e => `<span onclick="reactToMessage('${id}','${e}')">${e}</span>`).join('');
            document.getElementById('trayStarLabel').textContent = m.starred ? 'Unstar' : 'Star';
            document.getElementById('trayPinLabel').textContent = (pinnedMessageId === id) ? 'Unpin' : 'Pin';
            const tray = document.getElementById('msgActionTray');
            const row = document.querySelector(`.msg-row[data-id="${id}"]`);
            const rect = row.getBoundingClientRect();
            tray.style.top = Math.min(rect.top, window.innerHeight - 340) + 'px';
            tray.style.left = (m.from === 'me' ? Math.max(rect.right - 210, 10) : rect.left) + 'px';
            tray.classList.add('active');
            document.getElementById('msgActionBackdrop').classList.add('active');
            if (navigator.vibrate) navigator.vibrate(15);
        }
        function closeMsgTray() {
            document.getElementById('msgActionTray').classList.remove('active');
            document.getElementById('msgActionBackdrop').classList.remove('active');
        }
        function reactToMessage(id, emoji) {
            const m = chatMessages.find(x => x.id === id);
            if (!m) return;
            m.reactions = m.reactions || {};
            m.reactions[emoji] = (m.reactions[emoji] || 0) + 1;
            closeMsgTray();
            renderChatFlow();
        }
        function trayReply() {
            const m = chatMessages.find(x => x.id === activeTrayMsgId);
            if (!m) return;
            replyTarget = m;
            document.getElementById('rcName').textContent = m.from === 'me' ? 'You' : m.name;
            document.getElementById('rcText').textContent = m.text || (m.voice ? '🎤 Voice message' : 'Media');
            document.getElementById('replyComposerBar').classList.add('active');
            document.getElementById('dockInput').focus();
            closeMsgTray();
        }
        function cancelReply() { replyTarget = null; document.getElementById('replyComposerBar').classList.remove('active'); }
        function trayForward() {
            const m = chatMessages.find(x => x.id === activeTrayMsgId);
            closeMsgTray();
            if (!m) return;
            const fwd = { ...m, id: 'c' + Date.now(), from: 'me', time: new Date(), forwarded: true, replyTo: null, reactions: {}, status: 'sent' };
            chatMessages.push(fwd);
            renderChatFlow();
            showToast('Message forwarded', 'fa-share');
        }
        function trayCopy() {
            const m = chatMessages.find(x => x.id === activeTrayMsgId);
            closeMsgTray();
            if (!m) return;
            if (navigator.clipboard && m.text) navigator.clipboard.writeText(m.text).catch(() => {});
            showToast('Message copied', 'fa-copy');
        }
        function trayStar() {
            const m = chatMessages.find(x => x.id === activeTrayMsgId);
            closeMsgTray();
            if (!m) return;
            m.starred = !m.starred;
            renderChatFlow();
            showToast(m.starred ? 'Message starred' : 'Removed from starred', 'fa-star');
        }
        function trayPin() {
            const id = activeTrayMsgId;
            closeMsgTray();
            pinnedMessageId = (pinnedMessageId === id) ? null : id;
            renderChatFlow();
            showToast(pinnedMessageId ? 'Message pinned' : 'Unpinned', 'fa-thumbtack');
        }
        function trayDelete() {
            const id = activeTrayMsgId;
            closeMsgTray();
            chatMessages = chatMessages.filter(x => x.id !== id);
            if (pinnedMessageId === id) pinnedMessageId = null;
            renderChatFlow();
            showToast('Message deleted', 'fa-trash');
        }
        function renderPinnedBar() {
            const bar = document.getElementById('pinnedBar');
            if (!pinnedMessageId) { bar.classList.remove('active'); return; }
            const m = chatMessages.find(x => x.id === pinnedMessageId);
            if (!m) { bar.classList.remove('active'); return; }
            document.getElementById('pinnedBarText').textContent = m.text || (m.voice ? '🎤 Voice message' : 'Media');
            const isChatMode = document.getElementById('chat-flow').style.display !== 'none';
            bar.classList.toggle('active', isChatMode);
        }
        function scrollToPinned() {
            if (!pinnedMessageId) return;
            const row = document.querySelector(`.msg-row[data-id="${pinnedMessageId}"]`);
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        function unpinMessage() { pinnedMessageId = null; renderPinnedBar(); }

        let typingIndicatorActive = false;
        function typingRowHTML() {
            return `<div class="typing-row" id="typingRow"><div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
        }
        function simulateIncomingTyping() {
            typingIndicatorActive = true;
            const flow = document.getElementById('chat-flow');
            flow.insertAdjacentHTML('beforeend', typingRowHTML());
            flow.scrollTop = flow.scrollHeight;
        }
        function stopIncomingTyping() {
            typingIndicatorActive = false;
            const row = document.getElementById('typingRow');
            if (row) row.remove();
        }

        function openChatSearch() {
            document.getElementById('chatSearchOverlay').classList.add('active');
            document.getElementById('chatSearchInput').value = '';
            document.getElementById('chatSearchResults').innerHTML = '';
            setTimeout(() => document.getElementById('chatSearchInput').focus(), 150);
        }
        function closeChatSearch() { document.getElementById('chatSearchOverlay').classList.remove('active'); }
        function runChatSearch(q) {
            const box = document.getElementById('chatSearchResults');
            if (!q.trim()) { box.innerHTML = ''; return; }
            const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
            const hits = chatMessages.filter(m => m.text && m.text.toLowerCase().includes(q.toLowerCase()));
            box.innerHTML = hits.length ? hits.map(m => `
                <div class="search-result-row" onclick="closeChatSearch(); jumpToMessage('${m.id}')">
                    <div class="sr-name">${m.from === 'me' ? 'You' : m.name}</div>
                    <div class="sr-text">${escapeHtml(m.text).replace(re, '<mark>$1</mark>')}</div>
                </div>`).join('') : `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:20px;">No results found</p>`;
        }
        function jumpToMessage(id) {
            switchMode('chat');
            setTimeout(() => {
                const row = document.querySelector(`.msg-row[data-id="${id}"]`);
                if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.style.background = 'rgba(253,224,141,0.12)'; setTimeout(() => row.style.background = '', 1200); }
            }, 80);
        }

        // ============================================================
        // 4. TYPING BAR — slim redesign + high-impact quick actions
        // ============================================================
        function handleDockInput(el) {
            el.style.height = 'auto';
            el.style.height = (el.scrollHeight) + 'px';

            const sendTrigger = document.getElementById('sendTrigger');
            const micTrigger = document.getElementById('micTrigger');
            const suggestChip = document.getElementById('smartSuggestChip');

            if (el.value.trim().length > 0) {
                sendTrigger.style.display = 'flex';
                micTrigger.style.display = 'none';
                const s = smartSuggestFor(el.value);
                if (s) { document.getElementById('smartSuggestText').textContent = s; suggestChip.style.display = 'flex'; }
                else suggestChip.style.display = 'none';
            } else {
                sendTrigger.style.display = 'none';
                micTrigger.style.display = 'flex';
                suggestChip.style.display = 'none';
            }
        }
        function smartSuggestFor(draft) {
            const t = draft.trim().toLowerCase();
            if (t.endsWith('?')) return 'Ask & get an instant AI-suggested reply';
            if (t.length > 2 && t.length < 40) return 'Add more detail ✍️';
            return null;
        }
        function useSmartSuggestion() {
            const input = document.getElementById('dockInput');
            input.value += ' ';
            handleDockInput(input);
            input.focus();
        }

        function triggerAttach(kind) {
            switch (kind) {
                case 'image':
                case 'camera': {
                    const url = prompt('Paste an image URL (or cancel):');
                    if (url) pushOutgoingMessage({ image: url, text: '' });
                    break;
                }
                case 'document':
                    pushOutgoingMessage({ text: '📄 Document.pdf — 1.2MB' });
                    showToast('File sent', 'fa-file');
                    break;
                case 'location':
                    pushOutgoingMessage({ text: '📍 Shared current location (Live Location)' });
                    break;
                case 'pay':
                    openPaySheet();
                    break;
                case 'sos':
                    triggerSOS();
                    break;
                case 'contact':
                    pushOutgoingMessage({ text: '👤 Contact Card: Ali_Developer' });
                    break;
            }
        }
        function pushOutgoingMessage(extra) {
            if (groupSlug) {
                sendRealGroupMessage(extra);
                return;
            }
            const m = { id: 'c' + Date.now(), from: 'me', time: new Date(), reactions: {}, starred: false, status: 'sent', ...extra };
            if (replyTarget) { m.replyTo = replyTarget.id; cancelReply(); }
            chatMessages.push(m);
            renderChatFlow();
            setTimeout(() => { m.status = 'read'; renderChatFlow(); }, 1400);
        }
        async function sendRealGroupMessage(extra) {
            const replyToId = replyTarget ? replyTarget.id : null;
            if (replyTarget) cancelReply();
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in', 'fa-triangle-exclamation'); return; }
                await groupRef().collection('messages').add(Object.assign({
                    senderUsername: currentUsername,
                    timestamp: FieldValue.serverTimestamp(),
                    replyTo: replyToId
                }, extra));
            } catch (e) {
                console.error('sendRealGroupMessage error:', e);
                showToast('Could not send — try again', 'fa-triangle-exclamation');
            }
        }
        function loadRealChatMessages() {
            if (groupMessagesUnsub) return; // already listening
            groupMessagesUnsub = groupRef().collection('messages').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
                chatMessages = snapshot.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        from: data.senderUsername === currentUsername ? 'me' : 'them',
                        name: data.senderUsername,
                        role: (groupData && groupData.creatorUsername === data.senderUsername) ? 'Owner' : 'Member',
                        roleClass: 'role-member',
                        verified: false,
                        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(data.senderUsername || 'user'),
                        text: data.text || '',
                        image: data.image || null,
                        time: data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : new Date(),
                        reactions: {},
                        starred: false,
                        replyTo: data.replyTo || null,
                        status: 'read'
                    };
                });
                renderChatFlow();
            }, err => console.error('group messages listener error:', err));
        }
        function sendDockMessage() {
            const input = document.getElementById('dockInput');
            const text = input.value.trim();
            if (!text) return;
            pushOutgoingMessage({ text });
            input.value = '';
            handleDockInput(input);
            document.getElementById('smartSuggestChip').style.display = 'none';
        }

        // ---- HIGH-IMPACT: in-chat Escrow payment ----
        function openPaySheet() {
            const sel = document.getElementById('payRecipient');
            sel.innerHTML = groupMembers.filter(m => m.name !== 'You').map(m => `<option value="${m.name}">${m.name}</option>`).join('');
            document.getElementById('payAmount').value = '';
            document.getElementById('payNote').value = '';
            openSheetEl('paySheet');
        }
        function submitEscrowPayment() {
            const to = document.getElementById('payRecipient').value;
            const amount = document.getElementById('payAmount').value.trim();
            const note = document.getElementById('payNote').value.trim();
            if (!amount) { showToast('Enter an amount first', 'fa-triangle-exclamation'); return; }
            closeSheet('paySheet');
            pushOutgoingMessage({ text: `🔒 Escrow payment of ${amount} sent to ${to}${note ? ' — ' + note : ''}. Funds released only after confirmation.` });
            showToast('Payment locked in Escrow', 'fa-vault');
        }

        // ---- HIGH-IMPACT: Emergency SOS ----
        function triggerSOS() {
            if (!confirm('Send an emergency SOS alert with your live location to all group admins right now?')) return;
            pushOutgoingMessage({ text: '🚨 EMERGENCY SOS — this member needs urgent help. Live location shared with all admins.' });
            showToast('SOS sent to all group admins with your location', 'fa-triangle-exclamation');
        }

        // ---- HIGH-IMPACT: Group Contribution / Ajo Tracker ----
        let ajoContributors = [
            { name: 'Ali_Developer', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', paid: true },
            { name: 'MmnAfrah Networker', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80', paid: true },
            { name: 'Zainab_TrustID', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80', paid: false },
            { name: 'Ibrahim_Kano', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80', paid: false },
            { name: 'You', pic: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80', paid: false }
        ];
        function openAjoTracker() {
            document.getElementById('ajoNextPayout').textContent = 'Ibrahim_Kano';
            renderAjoList();
            openSheetEl('ajoSheet');
        }
        function renderAjoList() {
            document.getElementById('ajoListBody').innerHTML = ajoContributors.map(c => `
                <div class="ajo-row">
                    <img src="${c.pic}">
                    <div class="ajo-name">${c.name}</div>
                    <div class="ajo-status ${c.paid ? 'paid' : 'pending'}">${c.paid ? 'Paid' : 'Pending'}</div>
                </div>`).join('');
        }
        function markMyContributionPaid() {
            const me = ajoContributors.find(c => c.name === 'You');
            if (me) me.paid = true;
            renderAjoList();
            showToast('Your contribution has been marked as paid', 'fa-sack-dollar');
        }

        // ---- COMPREHENSIVE EMOJI PICKER (category tabs, large sets) ----
        const EMOJI_CATEGORIES = [
            { key: 'smileys', icon: '😀', label: 'Smileys & People', set: '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 👻 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵'.split(' ') },
            { key: 'gestures', icon: '👋', label: 'Gestures & Body', set: '👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦿 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 💋 🩸'.split(' ') },
            { key: 'animals', icon: '🐶', label: 'Animals & Nature', set: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪳 🦟 🦗 🕷️ 🕸️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🐈 🐓 🦃 🦤 🦚 🦜 🦢 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🍄 🌾 💐 🌷 🌹 🥀 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌪️ 🌈 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 🌊'.split(' ') },
            { key: 'food', icon: '🍔', label: 'Food & Drink', set: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊'.split(' ') },
            { key: 'travel', icon: '✈️', label: 'Travel & Places', set: '🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🪝 ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️ 🌁 🌃 🏙️ 🌄 🌅 🌆 🌇 🌉 ♨️'.split(' ') },
            { key: 'activities', icon: '⚽', label: 'Activities', set: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩'.split(' ') },
            { key: 'objects', icon: '💡', label: 'Objects', set: '⌚ 📱 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪓 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪃 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧴 🪒 🧽 🧼 🪥 🧷 🧵 🪡 🧶 🪢 👓 🕶️ 🥽 🥼 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 👛 👜 👝 🎒 🩴 👞 👟 🥾 🥿 👠 👡 🩰 👢 👑 👒 🎩 🎓 🧢 🪖 ⛑️ 📿 💄 💍 💼'.split(' ') },
            { key: 'symbols', icon: '❤️', label: 'Symbols', set: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🈳 🈂️ 🛂 🛃 🛄 🛅'.split(' ') },
            { key: 'flags', icon: '🏳️', label: 'Flags', set: '🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🇺🇳 🇳🇬 🇺🇸 🇬🇧 🇨🇦 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇧🇷 🇲🇽 🇮🇳 🇨🇳 🇯🇵 🇰🇷 🇷🇺 🇿🇦 🇰🇪 🇬🇭 🇪🇬 🇸🇦 🇦🇪 🇹🇷 🇦🇺 🇳🇿 🇸🇬 🇮🇩 🇲🇾 🇹🇭 🇻🇳 🇵🇭 🇵🇰 🇧🇩 🇳🇱 🇧🇪 🇨🇭 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇵🇱 🇬🇷 🇮🇪'.split(' ') }
        ];
        let currentEmojiCat = 0;
        function openEmojiPicker() {
            document.getElementById('emojiCatTabs').innerHTML = EMOJI_CATEGORIES.map((c,i) => `<div class="emoji-cat-tab ${i===currentEmojiCat?'active':''}" onclick="setEmojiCat(${i})">${c.icon}</div>`).join('');
            renderEmojiGrid();
            openSheetEl('emojiBackdrop');
        }
        function setEmojiCat(i) {
            currentEmojiCat = i;
            document.querySelectorAll('.emoji-cat-tab').forEach((el, idx) => el.classList.toggle('active', idx === i));
            renderEmojiGrid();
        }
        function renderEmojiGrid() {
            const cat = EMOJI_CATEGORIES[currentEmojiCat];
            document.getElementById('emojiGrid').innerHTML = cat.set.map(e => `<span onclick="insertEmoji('${e}')">${e}</span>`).join('');
        }
        function insertEmoji(e) {
            const input = document.getElementById('dockInput');
            input.value += e;
            handleDockInput(input);
        }

        let recTimer = null, recSeconds = 0;
        function startVoiceRecording() {
            recSeconds = 0;
            document.getElementById('recordBar').classList.add('active');
            document.getElementById('dockInput').style.display = 'none';
            recTimer = setInterval(() => {
                recSeconds++;
                const m = String(Math.floor(recSeconds / 60)).padStart(2, '0');
                const s = String(recSeconds % 60).padStart(2, '0');
                document.getElementById('recordTime').textContent = `${m}:${s}`;
            }, 1000);
        }
        function stopVoiceRecording(send) {
            if (!document.getElementById('recordBar').classList.contains('active')) return;
            clearInterval(recTimer);
            document.getElementById('recordBar').classList.remove('active');
            document.getElementById('dockInput').style.display = 'block';
            if (send && recSeconds > 0) {
                pushOutgoingMessage({ text: '', voice: { duration: document.getElementById('recordTime').textContent } });
                showToast('Voice message sent', 'fa-microphone');
            }
        }
        function cancelVoiceRecording() { stopVoiceRecording(false); }

        function toggleEcosystem(show) {
            const modal = document.getElementById('ecosystemModal');
            if (show) modal.classList.add('active');
            else modal.classList.remove('active');
        }

        // ---- Telegram-style header dropdown menu ----
        function toggleDotsMenu(show) {
            const menu = document.getElementById('dotsDropdownMenu');
            const backdrop = document.getElementById('dotsMenuBackdrop');
            const next = (show === undefined) ? !menu.classList.contains('active') : show;
            menu.classList.toggle('active', next);
            backdrop.classList.toggle('active', next);
        }
        function boostGroup() {
            showToast('🚀 Group boosted! Northern Innovators Hub 2026 just leveled up.', 'fa-bolt');
        }
        let groupMuted = false;
        function toggleMuteGroup() {
            groupMuted = !groupMuted;
            document.getElementById('muteMenuIcon').className = groupMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            document.getElementById('muteMenuLabel').textContent = groupMuted ? 'Unmute' : 'Mute';
            showToast(groupMuted ? 'Notifications muted for this group' : 'Notifications unmuted', groupMuted ? 'fa-volume-xmark' : 'fa-volume-high');
        }
        const CHAT_THEMES = [
            { name: 'Gold (Default)', cyan: '#fde08d' },
            { name: 'Ocean Blue', cyan: '#4fb0ff' },
            { name: 'Emerald', cyan: '#34d399' }
        ];
        let currentThemeIndex = 0;
        function cycleChatTheme() {
            currentThemeIndex = (currentThemeIndex + 1) % CHAT_THEMES.length;
            const theme = CHAT_THEMES[currentThemeIndex];
            document.documentElement.style.setProperty('--neon-cyan', theme.cyan);
            document.documentElement.style.setProperty('--neon-purple', theme.cyan);
            showToast(`Chat theme changed to ${theme.name}`, 'fa-palette');
        }
        function clearGroupHistory() {
            if (!confirm('Clear all message history in this group? This cannot be undone.')) return;
            chatMessages = [];
            pinnedMessageId = null;
            renderChatFlow();
            showToast('Chat history cleared', 'fa-broom');
        }

        // ============================================================
        // 5. MEMBER MANAGEMENT & MODERATION
        // ============================================================
        const groupMembers = [
            { id: 'm1', name: 'Ali_Developer', role: 'Admin', pic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
            { id: 'm2', name: 'MmnAfrah Networker', role: 'Moderator', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
            { id: 'm3', name: 'Zainab_TrustID', role: 'Member', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80' },
            { id: 'm4', name: 'Ibrahim_Kano', role: 'Member', pic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
            { id: 'm5', name: 'You', role: 'Member', pic: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80' }
        ];

        const pendingRequests = [
            { id: 'p1', name: 'Sadiq_Investor', pic: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80' },
            { id: 'p2', name: 'Amina_Trader', pic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80' },
            { id: 'p3', name: 'Bashir_Ops', pic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' }
        ];

        function toggleMembersModal(show) {
            const modal = document.getElementById('membersModal');
            if (show) {
                modal.classList.add('active');
                renderMemberList();
                renderPendingList();
            } else {
                modal.classList.remove('active');
            }
        }

        function switchMemberTab(tab) {
            const isAll = tab === 'all';
            document.getElementById('tabAll').classList.toggle('active', isAll);
            document.getElementById('tabPending').classList.toggle('active', !isAll);
            document.getElementById('memberListPanel').style.display = isAll ? 'block' : 'none';
            document.getElementById('pendingListPanel').style.display = isAll ? 'none' : 'block';
        }

        function renderMemberList() {
            const roleClassMap = { Admin: 'role-ceo', Moderator: 'role-mod', Member: 'role-member' };
            document.getElementById('memberListPanel').innerHTML = groupMembers.map(m => `
                <div class="member-row">
                    <img src="${m.pic}" alt="${m.name}">
                    <div class="member-row-info">
                        <div class="member-row-name">${m.name}</div>
                        <div class="member-row-role role-tag ${roleClassMap[m.role]}">${m.role}</div>
                    </div>
                    ${m.role !== 'Admin' ? `
                        <button class="member-action-btn" onclick="promoteMember('${m.id}')">${m.role === 'Moderator' ? 'Remove Mod' : 'Make Mod'}</button>
                        <button class="member-action-btn danger" onclick="removeMember('${m.id}')">Remove</button>
                    ` : ''}
                </div>
            `).join('');
        }

        function renderPendingList() {
            const panel = document.getElementById('pendingListPanel');
            if (pendingRequests.length === 0) {
                panel.innerHTML = `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:20px 0;">No one is waiting for approval right now.</p>`;
                return;
            }
            panel.innerHTML = pendingRequests.map(p => `
                <div class="member-row">
                    <img src="${p.pic}" alt="${p.name}">
                    <div class="member-row-info">
                        <div class="member-row-name">${p.name}</div>
                        <div class="member-row-role">Requested to join the group</div>
                    </div>
                    <button class="member-action-btn approve" onclick="approveRequest('${p.id}')">Approve</button>
                    <button class="member-action-btn danger" onclick="rejectRequest('${p.id}')">Decline</button>
                </div>
            `).join('');
        }

        function promoteMember(id) {
            const m = groupMembers.find(x => x.id === id);
            if (!m) return;
            m.role = m.role === 'Moderator' ? 'Member' : 'Moderator';
            renderMemberList();
        }

        function removeMember(id) {
            const idx = groupMembers.findIndex(x => x.id === id);
            if (idx === -1) return;
            groupMembers.splice(idx, 1);
            renderMemberList();
        }

        function approveRequest(id) {
            const idx = pendingRequests.findIndex(x => x.id === id);
            if (idx === -1) return;
            const [approved] = pendingRequests.splice(idx, 1);
            groupMembers.push({ id: approved.id, name: approved.name, role: 'Member', pic: approved.pic });
            document.getElementById('pendingCountBadge').textContent = pendingRequests.length;
            renderPendingList();
        }

        function rejectRequest(id) {
            const idx = pendingRequests.findIndex(x => x.id === id);
            if (idx === -1) return;
            pendingRequests.splice(idx, 1);
            document.getElementById('pendingCountBadge').textContent = pendingRequests.length;
            renderPendingList();
        }

        // ============================================================
        // 6. FEED ENGINE — pulls every post card directly from
        //    post-card-template.js (window.generatePostHTML). This file
        //    only supplies post DATA in the schema that template expects
        //    (id, username, userProfilePic, mediaUrl, mediaType, content,
        //    timestamp, likesCount, commentsCount, pinned, isAdmin,
        //    translatable, boosted) — the card markup itself is never
        //    rebuilt here.
        // ============================================================
        let feedPosts = [
            { id: 'p1', username: 'Ali_Developer', isAdmin: true,
              userProfilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
              mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80', mediaType: 'image',
              baseText: "The full 2026 rollout schedule for the Super Community Platform is locked in. Thank you to every member who contributed to getting us here.",
              timestamp: new Date(Date.now() - 1000 * 60 * 42), likesCount: 318, commentsCount: 47, pinned: true },
            { id: 'p2', username: 'MmnAfrah',
              userProfilePic: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
              baseText: "This week's admin meeting — which time works best for you?",
              poll: { options: [{ label: 'Morning (9AM)', votes: 62 }, { label: 'Afternoon (4PM)', votes: 91 }, { label: 'Evening (8PM)', votes: 33 }], myVote: null },
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), likesCount: 44, commentsCount: 19 },
            { id: 'p3', username: 'Zainab_TrustID', translatable: true,
              userProfilePic: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
              mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80', mediaType: 'image',
              baseText: 'TrustID Audit has just been renewed for all verified sellers. Sealed iPhone 15 Pro available now —',
              deal: { title: 'iPhone 15 Pro — Sealed', price: '$830' },
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26), likesCount: 89, commentsCount: 11 },
            { id: 'p4', username: 'Ibrahim_Kano',
              userProfilePic: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
              mediaUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&auto=format&fit=crop&q=80', mediaType: 'image',
              baseText: "Photos from last week's launch event. Thank you to everyone who came out!",
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50), likesCount: 56, commentsCount: 6 }
        ];

        // Builds the final `content` HTML handed to window.generatePostHTML():
        // base text + (optional) poll / deal / event widget, freshly
        // rendered every time so poll votes and other state stay live.
        function buildPostContent(post) {
            let html = escapeHtml(post.baseText || '');
            if (post.feeling) html = `<div class="post-meta-line">${post.feeling.emoji} feeling ${escapeHtml(post.feeling.label)}</div>` + html;
            if (post.location) html += `<div class="post-meta-line"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(post.location)}</div>`;
            if (post.taggedUsers && post.taggedUsers.length) html += `<div class="post-meta-line">with ${post.taggedUsers.map(t => escapeHtml(t.name)).join(', ')}</div>`;
            if (post.poll) html += renderPollWidget(post);
            if (post.deal) html += renderDealWidget(post);
            if (post.event) html += renderEventWidget(post);
            return html;
        }

        function renderPollWidget(post) {
            const total = post.poll.options.reduce((a, o) => a + o.votes, 0) || 1;
            return `<div class="poll-wrap">
                ${post.poll.options.map((o, i) => {
                    const pct = Math.round(o.votes / total * 100);
                    const voted = post.poll.myVote === i;
                    return `<div class="poll-option ${voted ? 'voted' : ''}" onclick="votePoll('${post.id}', ${i})">
                        <div class="poll-fill" style="width:${post.poll.myVote !== null ? pct : 0}%"></div>
                        <div class="poll-label-row"><span>${voted ? '✓ ' : ''}${o.label}</span><span>${post.poll.myVote !== null ? pct + '%' : ''}</span></div>
                    </div>`;
                }).join('')}
                <div class="poll-total">${total} vote${total === 1 ? '' : 's'}</div>
            </div>`;
        }
        function votePoll(id, idx) {
            const post = feedPosts.find(p => p.id === id);
            if (!post || post.poll.myVote !== null) return;
            post.poll.options[idx].votes++;
            post.poll.myVote = idx;
            renderFeedPosts();
        }

        function renderDealWidget(post) {
            return `<div class="deal-card">
                <div><div class="dc-price">${post.deal.price}</div><div class="dc-label">${post.deal.title} · Escrow Protected</div></div>
                <button class="deal-escrow-btn" onclick="event.stopPropagation(); buyWithEscrow('${post.id}')">Buy (Escrow)</button>
            </div>`;
        }
        function buyWithEscrow(id) {
            showToast('Escrow-protected purchase started. Your money is safe until you confirm delivery.', 'fa-vault');
        }

        function renderEventWidget(post) {
            return `<div class="deal-card" style="background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.3);">
                <div><div class="dc-price" style="color:#60a5fa; font-size:13.5px;"><i class="fa-solid fa-calendar-days"></i> ${post.event.title}</div><div class="dc-label">${post.event.date}</div></div>
                <button class="deal-escrow-btn" style="background:#3b82f6; color:#fff;" onclick="event.stopPropagation(); showToast('You are marked as interested in this event.', 'fa-calendar-check')">Interested</button>
            </div>`;
        }

        function renderFeedPosts() {
            if (groupSlug) {
                renderRealGroupFeedPosts();
                return;
            }
            const container = document.getElementById('timeline-area');
            const sorted = [...feedPosts].sort((a, b) => (b.pinned === true) - (a.pinned === true) || b.timestamp - a.timestamp);
            container.innerHTML = sorted.map(post => window.generatePostHTML({ ...post, content: buildPostContent(post) })).join('');
            if (typeof window.postCard_observeVideos === 'function') {
                window.postCard_observeVideos();
            }
        }

        // Real Firestore-backed Timeline — same global 'posts' collection the
        // homepage/profile timeline and pages.html use, filtered by groupId.
        // Scope note: poll/deal/event composer types stay local-only (not
        // persisted) — real group posts here are plain text + optional image.
        function renderRealGroupFeedPosts() {
            if (groupPostsUnsub) return; // already listening
            groupPostsUnsub = db.collection('posts')
                .where('groupId', '==', groupSlug)
                .orderBy('timestamp', 'desc')
                .onSnapshot(snapshot => {
                    const container = document.getElementById('timeline-area');
                    if (snapshot.empty) {
                        container.innerHTML = '<div style="padding:30px 16px;color:rgba(255,255,255,0.5);font-size:13px;text-align:center;">No posts yet — be the first to post!</div>';
                        return;
                    }
                    const posts = snapshot.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
                    container.innerHTML = posts.map(post => window.generatePostHTML(post)).join('');
                    if (typeof window.postCard_observeVideos === 'function') window.postCard_observeVideos();
                    if (typeof window.postCard_restoreLikes === 'function') window.postCard_restoreLikes(container);
                }, err => console.error('group posts listener error:', err));
        }

        // ---- composer: creates a new post using the SAME schema above,
        //      then hands it straight to window.generatePostHTML() ----
       // ---- composer state ----
        let composerType = 'text';
        let composerSelectedBg = 'default';
        let composerTaggedUsers = [];
        let composerLocation = '';
        let composerFeeling = null;
        let composerSelectedGroups = new Set();
        let addGroupsCache = null;

        const feelingOptions = [
            { emoji: '😊', label: 'happy' }, { emoji: '🥰', label: 'loved' }, { emoji: '😢', label: 'sad' },
            { emoji: '🎉', label: 'celebrating' }, { emoji: '💪', label: 'motivated' }, { emoji: '😴', label: 'tired' },
            { emoji: '🙏', label: 'grateful' }, { emoji: '🔥', label: 'excited' }, { emoji: '🤔', label: 'thoughtful' }
        ];

        function openComposer(type) {
            document.getElementById('composerUserName').textContent = groupSlug ? currentUsername : 'You';
            document.getElementById('composerAvatar').src = groupSlug
                ? 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(currentUsername)
                : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80';
            document.getElementById('composerPage').classList.add('active');
            if (type) setComposerType(type);
            initComposerBgScroll();
            setTimeout(() => document.getElementById('composerText').focus(), 150);
        }
        function closeComposer() {
            document.getElementById('composerPage').classList.remove('active');
            document.getElementById('composerText').value = '';
            document.getElementById('composerLocationInput').value = '';
            document.getElementById('composerLocationField').classList.remove('active');
            composerTaggedUsers = []; composerLocation = ''; composerFeeling = null;
            composerSelectedGroups = new Set();
            document.getElementById('cpGroupCountBadge').textContent = '0';
            document.getElementById('cpGroupCountBadge').classList.remove('show');
            selectBgSwatch('default', document.querySelector('.composer-bg-swatch[data-bg="default"]'));
            removeComposerMedia();
            renderComposerMetaChips();
            setComposerType('text');
        }
        function setComposerType(type) {
            composerType = type;
            ['Poll', 'Deal', 'Event', 'Location'].forEach(f => {
                const field = document.getElementById('composer' + f + 'Field');
                if (field) field.classList.toggle('active', f.toLowerCase() === type);
            });
            validateComposer();
        }
        function validateComposer() {
            const text = document.getElementById('composerText').value.trim();
            document.getElementById('composerPostBtn').disabled = text.length === 0;
        }
        function initComposerBgScroll() {
            const row = document.getElementById('composerBgRow');
            const backBtn = document.getElementById('composerBgBackBtn');
            row.onscroll = () => backBtn.classList.toggle('show', row.scrollLeft > 20);
        }
        function scrollBgRowToStart() {
            document.getElementById('composerBgRow').scrollTo({ left: 0, behavior: 'smooth' });
        }
        window.currentUserIsPremium = window.currentUserIsPremium || false; // TODO: wire to real subscription/tier field on the user doc
        const composerBgMap = {
            grad1: 'linear-gradient(135deg,#7b2ff7,#f107a3)', grad2: 'linear-gradient(135deg,#ff416c,#ff4b2b)',
            grad3: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', grad4: 'linear-gradient(135deg,#4b1248,#f0729b)',
            grad5: 'linear-gradient(135deg,#8e2de2,#4a00e0)', grad6: 'linear-gradient(135deg,#f7971e,#ffd200)',
            grad7: 'linear-gradient(135deg,#00c6ff,#0072ff)', grad8: 'linear-gradient(180deg,#1a1006,#7a5210,#ffd76a)',
            grad9: 'linear-gradient(135deg,#11998e,#38ef7d)', grad10: 'linear-gradient(135deg,#ee0979,#ff6a00)',
            grad11: 'linear-gradient(135deg,#360033,#0b8793)', grad12: 'linear-gradient(135deg,#1e3c72,#2a5298)',
            grad13: 'linear-gradient(135deg,#e53935,#e35d5b)',
            prem1: 'linear-gradient(135deg,#ffd700,#ff8c00,#8b0000)', prem2: 'linear-gradient(135deg,#c0c0c0,#8a2be2,#000000)',
            prem3: 'linear-gradient(135deg,#00f5a0,#00d9f5,#7000ff)'
        };
        function selectBgSwatch(id, el, isPremium) {
            if (isPremium && !window.currentUserIsPremium) {
                showToast('This background is for Premium members only', 'fa-crown');
                return;
            }
            composerSelectedBg = id;
            document.querySelectorAll('.composer-bg-swatch').forEach(s => s.classList.remove('active'));
            if (el) el.classList.add('active');
            const ta = document.getElementById('composerText');
            if (id === 'default') {
                ta.classList.remove('bg-mode');
                ta.style.background = 'transparent';
            } else {
                ta.classList.add('bg-mode');
                ta.style.background = composerBgMap[id] || 'transparent';
            }
        }
        function renderComposerMetaChips() {
            const row = document.getElementById('composerMetaChipRow');
            let html = '';
            if (composerFeeling) html += `<div class="cmc-chip">${composerFeeling.emoji} feeling ${composerFeeling.label}<i class="fa-solid fa-xmark cmc-remove" onclick="removeFeelingChip()"></i></div>`;
            if (composerLocation) html += `<div class="cmc-chip"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(composerLocation)}<i class="fa-solid fa-xmark cmc-remove" onclick="removeLocationChip()"></i></div>`;
            composerTaggedUsers.forEach(t => {
                html += `<div class="cmc-chip"><i class="fa-solid fa-user-tag"></i> ${escapeHtml(t.name)}<i class="fa-solid fa-xmark cmc-remove" onclick="removeTagChip('${t.id}')"></i></div>`;
            });
            row.innerHTML = html;
        }
        // ---- Tag people ----
        function openTagPicker() {
            const pool = groupSlug
                ? groupMembers.filter(m => m.name !== currentUsername)
                : groupMembers;
            document.getElementById('tagPickerBody').innerHTML = pool.length ? pool.map(m => {
                const tagged = composerTaggedUsers.some(t => t.id === m.id);
                return `<div class="invite-row">
                    <img src="${m.pic}">
                    <div class="ir-name">${escapeHtml(m.name)}</div>
                    <button class="ir-invite-btn ${tagged ? 'invited' : ''}" onclick="toggleTagUser('${m.id}', '${escapeHtml(m.name).replace(/'/g, "\\'")}', '${m.pic}', this)">${tagged ? 'Tagged' : 'Tag'}</button>
                </div>`;
            }).join('') : `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:40px 0;">No members to tag yet</p>`;
            openSheetEl('tagPickerSheet');
        }
        function toggleTagUser(id, name, pic, btn) {
            const idx = composerTaggedUsers.findIndex(t => t.id === id);
            if (idx > -1) {
                composerTaggedUsers.splice(idx, 1);
                btn.textContent = 'Tag'; btn.classList.remove('invited');
            } else {
                composerTaggedUsers.push({ id, name, pic });
                btn.textContent = 'Tagged'; btn.classList.add('invited');
            }
            renderComposerMetaChips();
        }
        function removeTagChip(id) {
            composerTaggedUsers = composerTaggedUsers.filter(t => t.id !== id);
            renderComposerMetaChips();
        }
        // ---- Feeling / activity ----
        function openFeelingPicker() {
            document.getElementById('feelingGrid').innerHTML = feelingOptions.map(f => `
                <div class="feeling-item ${composerFeeling && composerFeeling.label === f.label ? 'active' : ''}" onclick="selectFeeling('${f.emoji}', '${f.label}')">
                    <span class="fi-emoji">${f.emoji}</span><span class="fi-label">${f.label}</span>
                </div>`).join('');
            openSheetEl('feelingPickerSheet');
        }
        function selectFeeling(emoji, label) {
            composerFeeling = { emoji, label };
            closeSheet('feelingPickerSheet');
            renderComposerMetaChips();
        }
        function removeFeelingChip() { composerFeeling = null; renderComposerMetaChips(); }
        // ---- Location ----
        function toggleLocationField() {
            const field = document.getElementById('composerLocationField');
            field.classList.toggle('active');
            if (field.classList.contains('active')) document.getElementById('composerLocationInput').focus();
        }
        function updateLocationChip() {
            composerLocation = document.getElementById('composerLocationInput').value.trim();
            renderComposerMetaChips();
        }
        function removeLocationChip() {
            composerLocation = '';
            document.getElementById('composerLocationInput').value = '';
            document.getElementById('composerLocationField').classList.remove('active');
            renderComposerMetaChips();
        }
        // ---- Add groups (real data: users/{me}/myGroups) ----
        async function openAddGroupsOverlay() {
            document.getElementById('addGroupsOverlay').classList.add('active');
            if (addGroupsCache) { renderAddGroupsList(addGroupsCache); return; }
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in', 'fa-triangle-exclamation'); return; }
                const mySnap = await db.collection('users').doc(currentUsername).collection('myGroups').get();
                const slugs = mySnap.docs.map(d => d.id).filter(s => s !== groupSlug);
                const groupDocs = await Promise.all(slugs.map(s => db.collection('groups').doc(s).get()));
                addGroupsCache = groupDocs.filter(d => d.exists).map(d => ({
                    slug: d.id,
                    name: d.data().name || d.id,
                    avatarUrl: d.data().avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + encodeURIComponent(d.id),
                    memberCount: d.data().memberCount || 0
                }));
                renderAddGroupsList(addGroupsCache);
            } catch (e) {
                console.error('openAddGroupsOverlay error:', e);
                document.getElementById('addGroupsListBody').innerHTML = `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:40px 0;">Could not load your groups</p>`;
            }
        }
        function renderAddGroupsList(list) {
            document.getElementById('addGroupsListBody').innerHTML = list.length ? list.map(g => `
                <div class="cgo-row">
                    <img src="${g.avatarUrl}">
                    <div class="cgo-info">
                        <div class="cgo-name">${escapeHtml(g.name)}</div>
                        <div class="cgo-meta">${g.memberCount} member${g.memberCount === 1 ? '' : 's'}</div>
                    </div>
                    <input type="checkbox" ${composerSelectedGroups.has(g.slug) ? 'checked' : ''} onchange="toggleGroupCheckbox('${g.slug}')">
                </div>`).join('') : `<p style="color:var(--text-sub); font-size:12.5px; text-align:center; padding:40px 0;">You are not a member of any other groups yet</p>`;
        }
        function toggleGroupCheckbox(slug) {
            if (composerSelectedGroups.has(slug)) composerSelectedGroups.delete(slug);
            else composerSelectedGroups.add(slug);
        }
        function closeAddGroupsOverlay() {
            document.getElementById('addGroupsOverlay').classList.remove('active');
        }
        function saveGroupSelection() {
            const count = composerSelectedGroups.size;
            const badge = document.getElementById('cpGroupCountBadge');
            badge.textContent = count;
            badge.classList.toggle('show', count > 0);
            closeAddGroupsOverlay();
        }
        // ---- submit ----
        // ---- Photo/Video — real device gallery + Firebase Storage upload ----
        let composerUploadedMediaUrl = null;
        let composerUploadedMediaType = null;
        function triggerGalleryPicker() {
            document.getElementById('composerFileInput').click();
        }
        async function handleComposerFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            const isVideo = file.type.startsWith('video/');
            const preview = document.getElementById('composerMediaPreview');
            const img = document.getElementById('composerMediaImg');
            const vid = document.getElementById('composerMediaVideo');
            const localUrl = URL.createObjectURL(file);
            preview.classList.add('active');
            if (isVideo) {
                vid.src = localUrl; vid.style.display = 'block'; img.style.display = 'none';
            } else {
                img.src = localUrl; img.style.display = 'block'; vid.style.display = 'none';
            }
            document.getElementById('cmpUploadingBar').style.display = 'flex';
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in', 'fa-triangle-exclamation'); return; }
                const idToken = await authUser.getIdToken();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', 'posts');
                formData.append('username', currentUsername);
                const res = await fetch(MEDIA_UPLOAD_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + idToken },
                    body: formData
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Upload failed');
                composerUploadedMediaUrl = data.url;
                composerUploadedMediaType = isVideo ? 'video' : 'image';
                validateComposer();
            } catch (e) {
                console.error('media upload error:', e);
                showToast('Upload failed: ' + e.message, 'fa-triangle-exclamation');
                removeComposerMedia();
            } finally {
                document.getElementById('cmpUploadingBar').style.display = 'none';
            }
        }
        function removeComposerMedia() {
            composerUploadedMediaUrl = null;
            composerUploadedMediaType = null;
            document.getElementById('composerFileInput').value = '';
            document.getElementById('composerMediaPreview').classList.remove('active');
            document.getElementById('composerMediaImg').style.display = 'none';
            document.getElementById('composerMediaVideo').style.display = 'none';
        }
        // ---- submit ----
        function submitComposer() {
            const text = document.getElementById('composerText').value.trim();
            if (!text) return;

            const extra = {
                background: composerSelectedBg !== 'default' ? composerSelectedBg : null,
                taggedUsers: composerTaggedUsers,
                location: composerLocation || null,
                feeling: composerFeeling
            };

            if (groupSlug && composerUploadedMediaUrl) {
                submitRealGroupPost(text, composerUploadedMediaUrl, extra, composerUploadedMediaType);
                return;
            }
            if (groupSlug && composerType === 'text') {
                submitRealGroupPost(text, null, extra);
                return;
            }
            if (groupSlug && composerType === 'poll') {
                const opts = [document.getElementById('pollOpt1').value, document.getElementById('pollOpt2').value, document.getElementById('pollOpt3').value].filter(Boolean);
                extra.poll = { options: (opts.length ? opts : ['Yes', 'No']).map(l => ({ label: l, votes: 0 })), voters: [] };
                submitRealGroupPost(text, null, extra);
                return;
            }
            if (groupSlug && composerType === 'deal') {
                extra.deal = { title: document.getElementById('dealTitle').value || 'New item', price: document.getElementById('dealPrice').value || '—' };
                submitRealGroupPost(text, null, extra);
                return;
            }
            if (groupSlug && composerType === 'event') {
                extra.event = { title: document.getElementById('eventTitle').value || 'New Event', date: document.getElementById('eventDate').value || '' };
                submitRealGroupPost(text, null, extra);
                return;
            }

            const post = {
                id: 'p' + Date.now(),
                username: 'You',
                userProfilePic: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=100&auto=format&fit=crop&q=80',
                baseText: text,
                timestamp: new Date(),
                likesCount: 0,
                commentsCount: 0,
                background: extra.background,
                taggedUsers: extra.taggedUsers.length ? extra.taggedUsers : null,
                location: extra.location,
                feeling: extra.feeling
            };
            if (composerUploadedMediaUrl) {
                post.mediaUrl = composerUploadedMediaUrl;
                post.mediaType = composerUploadedMediaType;
            }
            if (composerType === 'poll') {
                const opts = [document.getElementById('pollOpt1').value, document.getElementById('pollOpt2').value, document.getElementById('pollOpt3').value].filter(Boolean);
                post.poll = { options: (opts.length ? opts : ['Yes', 'No']).map(l => ({ label: l, votes: 0 })), myVote: null };
            } else if (composerType === 'deal') {
                post.deal = { title: document.getElementById('dealTitle').value || 'New item', price: document.getElementById('dealPrice').value || '—' };
            } else if (composerType === 'event') {
                post.event = { title: document.getElementById('eventTitle').value || 'New Event', date: document.getElementById('eventDate').value || '' };
            }
            feedPosts.unshift(post);
            closeComposer();
            renderFeedPosts();
            showToast('Your post is live!', 'fa-circle-check');
        }
        async function submitRealGroupPost(text, mediaUrl, extra = {}, mediaType) {
            try {
                const authUser = await authReadyPromise;
                if (!authUser) { showToast('You need to be signed in', 'fa-triangle-exclamation'); return; }
                const targetGroups = [groupSlug, ...composerSelectedGroups];
                await Promise.all(targetGroups.map(gid => db.collection('posts').add({
                    groupId: gid,
                    username: currentUsername,
                    userProfilePic: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(currentUsername),
                    content: text,
                    mediaUrl: mediaUrl || null,
                    mediaType: mediaUrl ? (mediaType || 'image') : null,
                    background: extra.background || null,
                    taggedUsers: extra.taggedUsers && extra.taggedUsers.length ? extra.taggedUsers : null,
                    location: extra.location || null,
                    feeling: extra.feeling || null,
                    poll: extra.poll || null,
                    deal: extra.deal || null,
                    event: extra.event || null,
                    likesCount: 0,
                    commentsCount: 0,
                    pinned: false,
                    authorUsername: currentUsername,
                    timestamp: FieldValue.serverTimestamp()
                })));
                closeComposer();
                removeComposerMedia();
                if (targetGroups.length > 1) showToast('Posted to ' + targetGroups.length + ' groups', 'fa-circle-check');
            } catch (e) {
                console.error('submitRealGroupPost error:', e);
                showToast('Could not publish — check Firestore rules for /posts', 'fa-triangle-exclamation');
            }
        }

        // ============================================================
        // 7. STORY / HIGHLIGHT VIEWER
        // ============================================================
        const groupHighlights = [
            { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=80', label: 'Launch' },
            { img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=900&auto=format&fit=crop&q=80', label: 'Deals' },
            { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=900&auto=format&fit=crop&q=80', label: 'Events' },
            { img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&auto=format&fit=crop&q=80', label: 'Tech' }
        ];
        let currentStoryIndex = 0;

        function viewGroupHighlight(index) {
            currentStoryIndex = index;
            renderGroupStory();
            document.getElementById('storyViewerOverlay').style.display = 'block';
        }
        function renderGroupStory() {
            const story = groupHighlights[currentStoryIndex];
            document.getElementById('storyUsername').textContent = story.label + ' — Northern Innovators Hub 2026';
            document.getElementById('storyTime').textContent = fmtRelative(new Date(Date.now() - 1000*60*60*(currentStoryIndex+2)));
            const wrap = document.getElementById('storyMediaWrap');
            const existing = wrap.querySelector('.story-slide');
            if (existing) existing.remove();
            const slide = document.createElement('div');
            slide.className = 'story-slide';
            slide.innerHTML = `<img src="${story.img}">`;
            wrap.insertBefore(slide, wrap.firstChild);
        }
        function nextGroupStory() {
            if (currentStoryIndex < groupHighlights.length - 1) { currentStoryIndex++; renderGroupStory(); }
            else closeGroupStoryViewer();
        }
        function prevGroupStory() {
            if (currentStoryIndex > 0) { currentStoryIndex--; renderGroupStory(); }
        }
        function closeGroupStoryViewer() {
            document.getElementById('storyViewerOverlay').style.display = 'none';
        }

        // ============================================================
        // 8. FEED HEADER TRANSPARENCY ON SCROLL
        // ============================================================
        function updateFeedHeaderState() {
            const header = document.querySelector('header');
            const feedView = document.getElementById('feedView');
            const isChat = document.getElementById('chat-flow').style.display !== 'none';
            if (isChat) return;
            const scrollY = feedView.scrollTop;
            if (scrollY < 120) {
                header.classList.add('header-feed-transparent');
            } else {
                header.classList.remove('header-feed-transparent');
            }
        }

        // ============================================================
        // 9. INIT / DESTROY  (SPA lifecycle — router.js calls these)
        // ------------------------------------------------------------
        // Everything that used to run once at native <script> execution
        // time now runs inside initPage(), so it re-runs correctly every
        // time the router navigates INTO group.html (including switching
        // straight from one ?group=slug to another without a full reload).
        // destroyPage() undoes anything that would otherwise leak or go
        // stale (Firestore listeners, window/document listeners, timers).
        // ============================================================
        function onFeedScrollNX() { updateFeedHeaderState(); }
        function onWindowScrollNX() { updateFeedHeaderState(); }
        function onPageShowNX() { updateFeedHeaderState(); }
        function onVisibilityChangeNX() { if (!document.hidden) updateFeedHeaderState(); }

        function initPage() {
            // Re-derive per-navigation identity fresh every time.
            currentUsername = localStorage.getItem('nexus_user_session');
            if (!currentUsername) { window.location.href = 'login.html'; return; }

            authReadyPromise = new Promise(resolve => { authReadyResolve = resolve; });
            auth.onAuthStateChanged(user => { authReadyResolve(user); });

            groupSlug = new URLSearchParams(window.location.search).get('group');
            document.documentElement.classList.toggle('gi-loading', !!groupSlug);

            // Reset per-group/per-visit state so leftovers from a previous
            // group (or a previous visit) can't bleed into this one.
            groupData = null;
            isGroupAdmin = false;
            groupFeedLoaded = false;
            feedRendered = false;
            replyTarget = null;
            pinnedMessageId = null;
            activeTrayMsgId = null;
            typingIndicatorActive = false;
            currentEmojiCat = 0;
            groupMuted = false;
            currentThemeIndex = 0;
            composerType = 'text';
            composerSelectedBg = 'default';
            composerTaggedUsers = [];
            composerLocation = '';
            composerFeeling = null;
            composerSelectedGroups = new Set();
            addGroupsCache = null;
            composerUploadedMediaUrl = null;
            composerUploadedMediaType = null;
            currentStoryIndex = 0;
            if (recTimer) { clearInterval(recTimer); recTimer = null; }
            recSeconds = 0;

            const feedView = document.getElementById('feedView');
            if (feedView) feedView.addEventListener('scroll', onFeedScrollNX, { passive: true });
            window.addEventListener('scroll', onWindowScrollNX, { passive: true });
            // Hardening: re-check header state whenever the tab/page becomes visible
            // again (covers browser tab-resume / back-forward-cache restores, where
            // no scroll event fires but the header could otherwise show stale state).
            window.addEventListener('pageshow', onPageShowNX);
            document.addEventListener('visibilitychange', onVisibilityChangeNX);

            // initial paint: chat is the default view, render it through the unified renderer.
            // Skip the demo/hardcoded messages when this is a REAL group (?group=slug) —
            // only show them in local preview mode so real groups don't flash demo content
            // before Firestore data loads.
            if (!groupSlug) {
                renderChatFlow();
            } else {
                chatMessages = [];
            }
            initRealGroup();
            // one realistic "is typing…" demo cycle so the indicator is visibly wired up
            // — only in local preview (no ?group=); a real group shouldn't get a fake message injected.
            if (!groupSlug) {
                setTimeout(() => {
                    if (document.getElementById('chat-flow').style.display !== 'none') {
                        simulateIncomingTyping();
                        setTimeout(() => {
                            stopIncomingTyping();
                            chatMessages.push({ id: 'c' + Date.now(), from: 'them', name: 'Zainab_TrustID', role: 'Member', roleClass: 'role-member', verified: false,
                                avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80',
                                text: 'This update looks fantastic — great work everyone! 🔥', time: new Date(), reactions: {}, starred: false });
                            renderChatFlow();
                        }, 2600);
                    }
                }, 4000);
            }

            const savedMode = localStorage.getItem('nexus_group_mode');
            if (savedMode === 'feed') {
                switchMode('feed');
            }

            // Zuwa daga chats.html avatar-popup (message icon) tare da
            // ?autofocus=1 — wannan yana doke saved 'nexus_group_mode' din
            // (ko da an bar Feed tab a baya), yana tilasta Chat mode, sannan
            // ya bude keyboard din kai tsaye akan typing bar (#dockInput).
            if (new URLSearchParams(window.location.search).get('autofocus') === '1') {
                switchMode('chat');
                requestAnimationFrame(() => {
                    const dockInput = document.getElementById('dockInput');
                    if (dockInput) dockInput.focus();
                });
            }
        }

        function destroyPage() {
            if (groupUnsub) { groupUnsub(); groupUnsub = null; }
            if (groupPostsUnsub) { groupPostsUnsub(); groupPostsUnsub = null; }
            if (groupMessagesUnsub) { groupMessagesUnsub(); groupMessagesUnsub = null; }
            if (recTimer) { clearInterval(recTimer); recTimer = null; }

            const feedView = document.getElementById('feedView');
            if (feedView) feedView.removeEventListener('scroll', onFeedScrollNX);
            window.removeEventListener('scroll', onWindowScrollNX);
            window.removeEventListener('pageshow', onPageShowNX);
            document.removeEventListener('visibilitychange', onVisibilityChangeNX);

            // These anti-flash helper classes are group.html-specific hacks —
            // don't let them leak onto whichever page comes next.
            document.documentElement.classList.remove('gi-loading', 'preload-feed');
        }

        window.NexusRouter.registerPage('group.html', { init: initPage, destroy: destroyPage });

        // Native full page load (user opened group.html directly, not via
        // SPA nav) — router.js only auto-runs init() on SPA navigation, so
        // fire it once manually here if this IS the page that just loaded.
        if (window.NexusRouter.getCurrentPath() === 'group.html') {
            initPage();
        }
