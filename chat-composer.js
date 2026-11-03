/* ============================================================
   chat-composer.js — the ONE typing bar for Nexus
   Used by: group.html, chat-interior.html, channels.html.
   Styles live in chat-shared.css; the MARKUP and the "+" attach
   items live here. To add / remove / reorder an attach item, or to
   change the plus / mic / send buttons, edit this file only.

   HTML pages contain two placeholders:
     <div data-nx-composer-bar="group|chat|channel"></div>
     <div data-nx-composer-sheet="group|chat|channel"></div>
   They are replaced when this script loads and again on every SPA
   route change (nexus:routechange), before the page's init runs.
   Ids and inline handlers of each page are kept exactly as before.
   ============================================================ */
(function () {
    "use strict";
    if (window.NxComposer) return;

    var SVG = {
        plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
        mic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
        send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#050505" stroke-width="2.4"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
        like: '<svg width="18" height="18" viewBox="0 0 24 24" fill="#050505" stroke="none"><path d="M7 22h-2a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h2v11zm14-9a2.5 2.5 0 0 0-2.5-2.5h-4.66l.61-2.95.02-.32c0-.44-.18-.85-.47-1.14L12.83 5 8 9.83c-.32.31-.5.75-.5 1.17v8c0 .83.67 1.5 1.5 1.5h8.06a2 2 0 0 0 1.94-1.51l1.86-4.94c.09-.23.14-.47.14-.72V13z"/></svg>'
    };

    /* ---------- builders (same markup for every page) ---------- */
    function attrs(o) { return o ? ' ' + o : ''; }
    function bar(c) {
        var h = '<div class="composer-bar"' + attrs(c.barAttrs) + ' style="position:static;background:transparent;border-top:none;padding:0;"><div class="composer-msg-pill">';
        (c.buttons || []).forEach(function (b) { h += '<div class="composer-attach-btn"' + attrs(b.attrs) + '>' + b.svg + '</div>'; });
        h += '<textarea class="composer-input"' + attrs(c.inputAttrs) + ' rows="1" placeholder="' + (c.placeholder || 'Message...') + '"></textarea>';
        h += c.extra || '';
        (c.sends || []).forEach(function (s) { h += '<div class="composer-send' + (s.cls ? ' ' + s.cls : '') + '"' + attrs(s.attrs) + '>' + s.svg + '</div>'; });
        return h + '</div></div>';
    }
    function sheet(c) {
        var h = '<div class="tg-attach-backdrop" id="attachBackdrop"' + attrs(c.backdropAttrs) + '></div><div class="tg-attach-sheet" id="attachMenu"><div class="tg-attach-handle"></div><div class="tg-attach-grid">';
        c.items.forEach(function (i) {
            h += '<div class="tg-attach-item"' + attrs(i.attrs) + '><div class="tg-attach-icon tg-icon-' + i.color + '"><i class="' + i.icon + '"></i></div><span>' + i.label + '</span></div>';
        });
        return h + '</div></div>';
    }
    function pick(act, fn) { return 'onclick="closeAttachMenu();' + fn + '"'; }

    /* ---------- presets (one per page) ---------- */
    var PRESETS = {
        group: {
            bar: {
                buttons: [
                    { attrs: 'onclick="toggleAttachMenu()"', svg: SVG.plus },
                    { attrs: 'id="micTrigger" onmousedown="startVoiceRecording()" onmouseup="stopVoiceRecording(true)" ontouchstart="startVoiceRecording()" ontouchend="stopVoiceRecording(true)"', svg: SVG.mic }
                ],
                inputAttrs: 'id="dockInput" oninput="handleDockInput(this)"',
                extra: '<div class="record-bar" id="recordBar"><div class="record-dot"></div><span class="record-time" id="recordTime">00:00</span><span class="record-hint">Slide left to cancel ⟵</span><span class="record-cancel" onclick="cancelVoiceRecording()">Cancel</span></div>',
                sends: [{ attrs: 'id="sendTrigger" onclick="sendDockMessage()"', svg: SVG.send }]
            },
            sheet: {
                backdropAttrs: 'onclick="closeAttachMenu()"',
                items: [
                    { attrs: pick(0, "document.getElementById('galleryInput').click()"), color: 'blue', icon: 'fa-solid fa-image', label: 'Gallery' },
                    { attrs: pick(0, "triggerAttach('pay')"), color: 'teal', icon: 'fa-solid fa-wallet', label: 'Wallet' },
                    { attrs: pick(0, "triggerAttach('document')"), color: 'purple', icon: 'fa-solid fa-file', label: 'File' },
                    { attrs: pick(0, "triggerAttach('location')"), color: 'green', icon: 'fa-solid fa-location-dot', label: 'Location' },
                    { attrs: pick(0, 'createPollMessage()'), color: 'orange', icon: 'fa-solid fa-chart-simple', label: 'Poll' },
                    { attrs: pick(0, 'createChecklistMessage()'), color: 'violet', icon: 'fa-solid fa-square-check', label: 'Checklist' },
                    { attrs: pick(0, "triggerAttach('contact')"), color: 'blue2', icon: 'fa-solid fa-user', label: 'Contact' },
                    { attrs: pick(0, 'shareMusicMessage()'), color: 'red', icon: 'fa-solid fa-music', label: 'Music' }
                ]
            }
        },
        chat: {
            bar: {
                barAttrs: 'id="neuralSearchBar"',
                buttons: [
                    { attrs: 'onclick="toggleAttachMenu()"', svg: SVG.plus },
                    { attrs: 'onclick="toggleVoiceRecording()"', svg: SVG.mic }
                ],
                inputAttrs: 'id="msgInput"',
                sends: [
                    { attrs: 'id="sendBtn" onclick="sendNeuralMessage()"', svg: SVG.send },
                    { attrs: 'id="voiceBtn" onclick="sendQuickLike()"', svg: SVG.like }
                ]
            },
            sheet: {
                backdropAttrs: 'onclick="closeAttachMenu()"',
                items: [
                    { attrs: pick(0, "document.getElementById('galleryInput').click()"), color: 'blue', icon: 'fa-solid fa-image', label: 'Gallery' },
                    { attrs: pick(0, "document.getElementById('cameraInput').click()"), color: 'teal', icon: 'fa-solid fa-camera', label: 'Camera' },
                    { attrs: pick(0, "document.getElementById('documentInput').click()"), color: 'purple', icon: 'fa-solid fa-file', label: 'File' },
                    { attrs: pick(0, 'shareLiveLocation()'), color: 'green', icon: 'fa-solid fa-location-dot', label: 'Location' },
                    { attrs: pick(0, 'createPollMessage()'), color: 'orange', icon: 'fa-solid fa-chart-simple', label: 'Poll' },
                    { attrs: pick(0, 'createEventMessage()'), color: 'violet', icon: 'fa-solid fa-calendar-days', label: 'Event' },
                    { attrs: pick(0, 'shareContactCard()'), color: 'blue2', icon: 'fa-solid fa-user', label: 'Contact' },
                    { attrs: pick(0, 'openAiImagePrompt()'), color: 'red', icon: 'fa-solid fa-wand-magic-sparkles', label: 'AI images' }
                ]
            }
        },
        channel: {
            bar: {
                buttons: [{ attrs: 'data-act="attach" aria-label="Attach"', svg: SVG.plus }],
                inputAttrs: 'id="chInput" enterkeyhint="send"',
                placeholder: 'Broadcast a message…',
                sends: [{ cls: 'dis', attrs: 'id="chSend" data-act="send" aria-label="Send"', svg: SVG.send }]
            },
            sheet: {
                backdropAttrs: 'data-act="closeAttach"',
                items: [
                    { attrs: 'data-act="attachPick" data-a="pickPhoto"', color: 'blue', icon: 'fa-solid fa-image', label: 'Photo' },
                    { attrs: 'data-act="attachPick" data-a="pickVideo"', color: 'teal', icon: 'fa-solid fa-video', label: 'Video' },
                    { attrs: 'data-act="attachPick" data-a="pollSheet"', color: 'orange', icon: 'fa-solid fa-chart-simple', label: 'Poll' },
                    { attrs: 'data-act="attachPick" data-a="dealSheet"', color: 'green', icon: 'fa-solid fa-cart-shopping', label: 'Group deal' },
                    { attrs: 'data-act="attachPick" data-a="proofSheet"', color: 'purple', icon: 'fa-solid fa-box', label: 'Delivery proof' },
                    { attrs: 'data-act="attachPick" data-a="unlockSheet"', color: 'violet', icon: 'fa-solid fa-unlock', label: 'Community unlock' },
                    { attrs: 'data-act="attachPick" data-a="schedSheet"', color: 'blue2', icon: 'fa-solid fa-clock', label: 'Schedule' }
                ]
            }
        }
    };

    function mountAll(root) {
        root = root || document;
        root.querySelectorAll('[data-nx-composer-bar]').forEach(function (el) {
            var p = PRESETS[el.getAttribute('data-nx-composer-bar')]; if (!p) return;
            el.outerHTML = bar(p.bar);
        });
        root.querySelectorAll('[data-nx-composer-sheet]').forEach(function (el) {
            var p = PRESETS[el.getAttribute('data-nx-composer-sheet')]; if (!p) return;
            el.outerHTML = sheet(p.sheet);
        });
    }

    window.NxComposer = {
        bar: function (name) { return bar(PRESETS[name].bar); },
        sheet: function (name) { return sheet(PRESETS[name].sheet); },
        mountAll: mountAll,
        presets: PRESETS
    };

    // native load: DOM is already parsed when this script sits above the page script
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { mountAll(); });
    else mountAll();
    // SPA: the router fires this after swapping the page and before running the page's init()
    document.addEventListener('nexus:routechange', function () { mountAll(); });
})();
