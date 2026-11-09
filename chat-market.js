/* chat-market.js — marketplace layer for chat-interior.html (additive; chat-interior.js is NOT modified).
   Active only when the page URL carries ?market=1 :
     chat-interior.html?with=<other user>&market=1&vendor=<seller username>[&product=<id>]
   1. flags the room (personalChats/{room}.source = 'market') so Business Chat can list it under Buying / Selling
   2. buyer only: vendor-product header — the normal chat header shows for HEADER_MS, then it hides and the
      seller's product cards slide across ONCE (no loop), then the header comes back. 1–2 cards: they slide in,
      rest in the middle for HOLD_FEW ms, then slide out. Tapping a card puts a question about it in the typing bar. */
(function () {
  'use strict';
  if (window.__nxMarketLoaded) return; window.__nxMarketLoaded = true;
  var HEADER_MS = 10000, HOLD_FEW = 6000, MAX_CARDS = 20;
  var timers = [], builtFor = '', strip = null, anim = null;

  function me() { return localStorage.getItem('nexus_user_session') || ''; }
  function qp() { return new URLSearchParams(location.search); }
  function db() { try { return firebase.firestore(); } catch (e) { return null; } }

  var st = document.createElement('style'); st.id = 'nxMktCss';
  st.textContent =
    /* sizes copied 1:1 from the old vendor chat (.slim-slider 104px, .slide-card 128x78 r14, gold border, .tag 9.5px) */
    '#nxMktStrip{position:fixed;top:0;left:0;right:0;height:104px;background:transparent;overflow:hidden;pointer-events:none}' +
    '#nxMktTrack{position:absolute;top:0;left:0;height:100%;display:flex;width:max-content;align-items:center;padding:6px 4px 0;will-change:transform}' +
    '.nxm-card{width:128px;height:78px;margin:0 7px;border-radius:14px;overflow:hidden;flex-shrink:0;border:1px solid rgba(212,175,55,0.45);background:#1a1a1a;cursor:pointer;position:relative;pointer-events:auto;box-shadow:0 3px 10px rgba(0,0,0,0.35);transition:transform .15s ease}' +
    '.nxm-card:active{transform:scale(.95)}' +
    '.nxm-card img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.nxm-card b{position:absolute;bottom:0;left:0;right:0;padding:3px 7px;background:linear-gradient(to top,rgba(0,0,0,0.65),transparent);color:#F5E6C8;font-size:9.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  document.head.appendChild(st);



  /* 0 — separate BUSINESS room. Personal chat keeps  a__b ;  marketplace chat uses  a~biz~b  (no "__", so chats.js
     never lists it as a personal chat). chat-interior.js is untouched: we swap getChatRoomId and start its init ourselves
     (chat-interior.html holds its own native init back for market=1 pages — see the readyState line there). */
  var MARKET = qp().get('market') === '1';
  function bizRoom(a, b) { return [a, b].sort().join('~biz~'); }
  if (MARKET) {
    try { delete document.readyState; } catch (e) {}                 // release the hold set in chat-interior.html
    window.getChatRoomId = function (a, b) { return bizRoom(a, b); };
    var __want = bizRoom(me(), qp().get('with') || '');
    if (!window.__nxMktBooted) { window.__nxMktBooted = true; try { if (typeof NexusChatInterior_init === 'function') NexusChatInterior_init(); } catch (e) { console.error(e); } }
    else {   // the page started its own init before this file arrived (slow network) → it opened the PERSONAL room: restart it on the business room
      try { if (typeof chatRoomId === 'string' && chatRoomId !== __want && typeof NexusChatInterior_init === 'function') NexusChatInterior_init(); } catch (e) { console.error(e); }
    }
  }

  /* buyer: keep the header hidden from the very first paint — the seller's pictures come first (released when they start, or when there are none) */
  var GO = !(qp().get('embed') === '1'), goQ = [];   // inside the shop overlay the pictures wait for the welcome splash to finish
  window.addEventListener('message', function (e) { if (e.origin === location.origin && e.data && e.data.nxMkChat === 'go' && !GO) { GO = true; goQ.splice(0).forEach(function (f) { f(); }); } });
  setTimeout(function () { if (!GO) { GO = true; goQ.splice(0).forEach(function (f) { f(); }); } }, 5200);
  var HOLDCLS = 'nx-mkt-hold';
  function releaseHold() { document.documentElement.classList.remove(HOLDCLS); }
  if (MARKET && me() && (qp().get('vendor') || qp().get('with')) && me() !== (qp().get('vendor') || qp().get('with'))) {
    var hs = document.createElement('style'); hs.textContent = 'html.' + HOLDCLS + ' #chat-header-bar{visibility:hidden!important}'; document.head.appendChild(hs);
    document.documentElement.classList.add(HOLDCLS); setTimeout(releaseHold, 4000);
  }

  /* embed mode: chat-interior runs inside the shop's overlay (iframe). No footer, back closes the overlay. */
  var EMBED = qp().get('embed') === '1';
  if (EMBED) {
    document.documentElement.classList.add('nx-embed');
    var es = document.createElement('style');
    es.textContent = 'html.nx-embed #footer-placeholder,html.nx-embed #footerCapsule,html.nx-embed .hud-footer-capsule,html.nx-embed .bottom-nav,html.nx-embed footer:not(#chat-header-bar):not(#selectionActionBar),html.nx-embed [id*="footer" i],html.nx-embed [class*="footer-capsule" i]{display:none!important}';
    document.head.appendChild(es);
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#chat-header-bar .back-trigger');
      if (!b) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      try { parent.postMessage({ nxMkChat: 'close' }, location.origin); } catch (x) {}
    }, true);
  }

  function clear() {
    timers.forEach(clearTimeout); timers = [];
    if (anim) { try { anim.cancel(); } catch (e) {} anim = null; }
    if (strip) { strip.remove(); strip = null; }
    var h = document.getElementById('chat-header-bar'); if (h) h.style.visibility = '';
  }

  /* 1 — flag the room (retries until chat-interior has created it) */
  function markRoom(p, key) {
    var u = me(), peer = p.get('with'), vendor = p.get('vendor') || peer; if (!u || !peer) return;
    var room = bizRoom(u, peer);
    var data = { source: 'market', marketVendor: vendor, marketBuyer: vendor === u ? peer : u };
    if (p.get('product')) data.marketProductId = p.get('product');
    try { var pr = db().collection('personalChats').doc([u, peer].sort().join('__')); pr.get().then(function (x) { if (x.exists && x.data().source === 'market') { var FV = firebase.firestore.FieldValue; pr.set({ source: FV.delete(), marketVendor: FV.delete(), marketBuyer: FV.delete(), marketProductId: FV.delete() }, { merge: true }); } }).catch(function () {}); } catch (e) {}
    var tries = 0;
    (function go() {
      if (builtFor !== key) return;
      var d = db(); tries++;
      if (!d) { if (tries < 10) timers.push(setTimeout(go, 1500)); return; }
      d.collection('personalChats').doc(room).set(data, { merge: true }).catch(function () { if (tries < 8) timers.push(setTimeout(go, 1500)); });
    })();
  }

  /* 2 — everything the seller has in "My Business" + the marketplace listings, read live.
     Sources (same ones the storefront / My Business use):
       Firestore  products   (matched on every seller-field the storefront matches on)
       RTDB       providers/<seller>   (profile + categories → items, written by My Business) */
  var RTDB = 'https://oryzon-50ea4-default-rtdb.firebaseio.com', know = null, knowFor = '', knowAt = 0, knowBusy = null;
  function priceTxt(p, cur) {
    if (p == null || p === '') return 'price on request';
    if (typeof p === 'number') return (cur ? cur + ' ' : '') + p.toLocaleString('en-US');
    return String(p);
  }
  function rtdbGet(path) {
    function go(tok) { return fetch(RTDB + path + '.json' + (tok ? '?auth=' + encodeURIComponent(tok) : '')).then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }); }
    var u = null; try { u = firebase.auth().currentUser; } catch (e) {}
    return (u ? u.getIdToken().catch(function () { return ''; }) : Promise.resolve('')).then(function (t) { return go(t).catch(function () { return t ? go('') : null; }); }).catch(function () { return null; });
  }
  function loadKnowledge(vendor, productId, maxAge) {
    if (know && knowFor === vendor && Date.now() - knowAt < (maxAge == null ? 60000 : maxAge)) return Promise.resolve(know);
    if (knowBusy && knowFor === vendor) return knowBusy;
    var d = db(); if (!d) return Promise.resolve({ cards: [], catalogue: '', prov: null });
    var fields = ['vendorId', 'sellerUsername', 'seller', 'sellerId', 'vendorUsername', 'ownerUsername', 'username', 'vendor'], seen = {};
    var fsP = Promise.all(fields.map(function (f) {
      return d.collection('products').where(f, '==', vendor).get().then(function (sn) { sn.forEach(function (doc) { seen[doc.id] = Object.assign({ id: doc.id }, doc.data()); }); }).catch(function () {});
    }));
    knowFor = vendor;
    knowBusy = Promise.all([fsP, rtdbGet('/providers/' + encodeURIComponent(vendor))]).then(function (r) {
      var prov = r[1] || null, cur = prov && prov.currency || '', lines = [], cards = [], cats = {};
      Object.keys(seen).forEach(function (k) {
        var x = seen[k], img = x.image || x.img || x.imageUrl || (x.images && x.images[0]) || (x.gallery && x.gallery[0]) || '';
        var sold = /sold/i.test(String(x.status || ''));
        if (img && !sold && !x.isVideo && !/\.mp4(\?|$)/i.test(img)) cards.push({ id: x.id, img: img, name: x.name || x.title || 'Product', price: x.price, desc: x.description || x.desc || '' });
        if (x.category) cats[x.category] = 1;
        lines.push('- ' + (x.name || x.title || 'Product') + ' | ' + priceTxt(x.price) + (x.category ? ' | ' + x.category : '') + ' | ' + (sold ? 'SOLD OUT' : 'available') + (x.location ? ' | ' + x.location : '') + (x.description || x.desc ? ' | ' + String(x.description || x.desc).replace(/\s+/g, ' ').slice(0, 220) : ''));
      });
      var catObj = prov && prov.categories || {};
      Object.keys(catObj).forEach(function (ck) {
        cats[ck] = 1; var items = catObj[ck] && catObj[ck].items || {};
        Object.keys(items).forEach(function (ik) {
          var it = items[ik] || {}, pr = it.pricingType === 'tiers' && it.tiers ? it.tiers.map(function (t) { return t.name + ': ' + priceTxt(t.price, cur) + (t.delivery ? ' (' + t.delivery + ')' : ''); }).join('; ') : priceTxt(it.price, cur);
          lines.push('- ' + (it.name || 'Item') + ' | ' + pr + ' | ' + (it.category || ck) + ' | available' + (it.desc ? ' | ' + String(it.desc).replace(/\s+/g, ' ').slice(0, 220) : ''));
        });
      });
      cards.sort(function (a, b) { return (b.id === productId) - (a.id === productId); });   // the product you came from first
      know = { cards: cards, prov: prov, categories: Object.keys(cats), catalogue: lines.join('\n') }; knowAt = Date.now(); knowBusy = null; return know;
    }).catch(function () { knowBusy = null; return { cards: [], catalogue: '', prov: null, categories: [] }; });
    return knowBusy;
  }
  function loadCards(vendor, productId) { return loadKnowledge(vendor, productId).then(function (k) { return k.cards; }); }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function runPass(list, key) {
    var h = document.getElementById('chat-header-bar'), host = document.getElementById('page-content') || document.body;
    if (!h || builtFor !== key) return;
    var z = parseInt(getComputedStyle(h).zIndex, 10); z = (isNaN(z) ? 100 : z) + 1;
    strip = document.createElement('div'); strip.id = 'nxMktStrip'; strip.style.cssText = 'z-index:' + z;
    var track = document.createElement('div'); track.id = 'nxMktTrack';
    track.innerHTML = list.map(function (c, i) { return '<div class="nxm-card" data-i="' + i + '"><img src="' + esc(c.img) + '" alt=""><b>' + esc(c.name) + '</b></div>'; }).join('');
    strip.appendChild(track); host.appendChild(strip);
    strip.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('.nxm-card'); if (!el) return; var c = list[+el.dataset.i], i = document.getElementById('msgInput'); if (!c || !i) return;
      i.value = 'Tell me more about ' + c.name + ', and how I can place an order.'; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus();
    });
    h.style.visibility = 'hidden'; releaseHold();
    var vw = strip.clientWidth, W = track.scrollWidth, few = list.length <= 2, a;
    if (few) {
      var mid = Math.max(0, (vw - W) / 2), total = 700 + HOLD_FEW + 700;
      a = track.animate([{ transform: 'translateX(' + vw + 'px)', easing: 'ease-out' }, { transform: 'translateX(' + mid + 'px)', offset: 700 / total }, { transform: 'translateX(' + mid + 'px)', offset: (700 + HOLD_FEW) / total, easing: 'ease-in' }, { transform: 'translateX(' + (-W) + 'px)' }], { duration: total, fill: 'forwards' });
    } else {
      a = track.animate([{ transform: 'translateX(' + vw + 'px)' }, { transform: 'translateX(' + (-W) + 'px)' }], { duration: ((vw + W) / Math.max(18, Math.min(34, W / 40))) * 1000, easing: 'linear', fill: 'forwards' });
    }
    anim = a;
    a.onfinish = function () { clear(); schedule(list, key); };   // header is back; the next pass comes after HEADER_MS
  }

  function schedule(list, key) {
    timers.push(setTimeout(function () { if (builtFor === key) runPass(list, key); }, HEADER_MS));
  }

  function start(p, key) {
    botStart(p, function () { markRoom(p, key); });   // flag the room only once it really has a message
    var u = me(), vendor = p.get('vendor') || p.get('with');
    if (!u || !vendor || u === vendor) return;                 // only the buyer sees the seller's product cards
    var h = document.getElementById('chat-header-bar'), shown = false;
    if (h) h.style.visibility = 'hidden';                      // the product pictures come first, before the header
    function showHeader() { releaseHold(); if (!strip && h) h.style.visibility = ''; }
    var late = setTimeout(function () { if (GO) showHeader(); }, 2500); timers.push(late);   // slow network: never leave the top empty
    loadCards(vendor, p.get('product')).then(function (list) {
      clearTimeout(late); if (builtFor !== key) return;
      if (!list.length) showHeader();                               // no pictures → the header stays, always
      else if (GO) runPass(list, key); else goQ.push(function () { if (builtFor === key) runPass(list, key); });
    }).catch(function () { clearTimeout(late); showHeader(); });
  }


  /* 3 — vendor AI bot inside the market room (same behaviour as the old vendor chat).
     Runs on the BUYER's page: a buyer text → bot answers as the seller, unless the seller has taken over (room.botActive=false).
     Seller page: any manual seller message pauses the bot + saves a learning example; a pill toggles the bot. */
  var AI_URL = 'https://oryzon-backend-ed1q.onrender.com/api/chat', PUSH_URL = 'https://oryzon-backend-ed1q.onrender.com/send-push';
  var bot = { room: '', unsub: null, runsub: null, docs: {}, seen: {}, ready: false, active: true, busy: false, again: false, u: '', vendor: '', buyer: '', seller: false, pill: null };

  function botStop() {
    if (bot.unsub) { try { bot.unsub(); } catch (e) {} bot.unsub = null; }
    if (bot.runsub) { try { bot.runsub(); } catch (e) {} bot.runsub = null; }
    if (bot.pill) { bot.pill.remove(); bot.pill = null; }
    bot.marked = false; bot.docs = {}; bot.seen = {}; bot.ready = false; bot.busy = false; bot.again = false; bot.room = '';
  }
  function roomRef() { return db().collection('personalChats').doc(bot.room); }
  function paintPill() {
    if (!bot.seller) return;
    if (!bot.pill) {
      var h = document.getElementById('chat-header-bar'), host = document.getElementById('page-content') || document.body;
      if (!h) return;
      var b = document.createElement('button'); b.id = 'nxMktBot'; b.type = 'button';
      b.style.cssText = 'position:fixed;right:10px;top:' + ((h.offsetHeight || 64) + 6) + 'px;z-index:90;display:flex;align-items:center;gap:6px;background:#0f0f0f;border:1px solid #262626;color:#fff;border-radius:999px;padding:5px 11px;font:600 11.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;cursor:pointer';
      b.onclick = function () { roomRef().set({ botActive: !bot.active }, { merge: true }); };
      host.appendChild(b); bot.pill = b;
    }
    bot.pill.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:' + (bot.active ? '#3ddc84' : '#777') + '"></span>AI assistant: ' + (bot.active ? 'On' : 'Paused');
  }

  function history() {
    var arr = Object.keys(bot.docs).map(function (k) { return bot.docs[k]; })
      .filter(function (m) { return m.text && !m.encrypted && !m.type; }).sort(function (a, b) { return a.timestamp - b.timestamp; }).slice(-20);
    return arr.map(function (m) { return { role: m.senderId === bot.buyer ? 'user' : 'assistant', content: m.text }; });
  }

  function addMsg(extra, label) {
    bot.ts = Math.max(Date.now(), (bot.ts || 0) + 1);
    var rec = Object.assign({ senderId: bot.vendor, receiverId: bot.buyer, timestamp: bot.ts, bot: true }, extra);
    return roomRef().collection('messages').add(rec).then(function () {
      return roomRef().set({ lastMessage: label, lastMessageTime: Date.now(), lastSenderId: bot.vendor, members: [bot.buyer, bot.vendor] }, { merge: true });
    });
  }

  /* language of the customer's LAST message — decided here, so the model can never drift into the wrong language */
  function detectLang(t) {
    var w = String(t || '').toLowerCase().match(/[a-zā-ǿ'ƙɓɗ]+/g) || [];
    var ha = { ina: 1, kana: 1, kuna: 1, yaya: 1, yaushe: 1, nawa: 1, wane: 1, wace: 1, zan: 1, zamu: 1, muna: 1, kuma: 1, sai: 1, nake: 1, akwai: 1, babu: 1, farashi: 1, gode: 1, sannu: 1, barka: 1, kaya: 1, kayan: 1, wannan: 1, domin: 1, don: 1, ban: 1, yi: 1, mai: 1, shago: 1, kudi: 1, kudin: 1, nan: 1, ina: 1, masu: 1, daga: 1, tafi: 1, aiko: 1, tura: 1, mene: 1, menene: 1, hotuna: 1, hoto: 1, ake: 1, ya: 0, ni: 1, ka: 0, na: 0, da: 0, a: 0 };
    var hits = 0; w.forEach(function (x) { if (ha[x]) hits++; });
    return hits >= 1 && hits >= Math.ceil(w.length * 0.2) ? 'Hausa' : 'English';
  }
  function buildPrompt(storeName, businessType, productList, vendorInfo, learningExamples, lang) {
    return `You are "Ali", the sales and customer-service representative of "${storeName}" (${businessType}). You are a real, experienced salesperson chatting with a customer on a messaging app. You never reveal or hint that you are an AI.

LANGUAGE (absolute rule): this reply MUST be written in ${lang}. Always answer in the language of the customer's latest message — English message, English reply; Hausa message, clean natural Hausa reply. You understand English and Hausa perfectly; never say you do not understand a language, never mix languages inside one reply, and never switch to Hausa unless the customer's latest message is in Hausa.

WRITING STYLE (strict):
- Plain text only, exactly like a WhatsApp message from a polished professional. NEVER use asterisks, markdown, bold, headings, bullet symbols, numbered lists, underscores, hashtags or code formatting. If you must name several options, write them in one flowing sentence or on separate short lines without any symbols.
- Short, warm, confident messages (2–4 short sentences). Answer the exact question first, then guide the customer one step forward. Use at most one emoji, and only when it feels natural.

HOW A TOP SALESPERSON BEHAVES:
- Greet briefly and personally, listen to what the customer really needs, then recommend the best matching item from the catalogue below and say why it suits them (quality, benefit, value, use) using only facts written in the catalogue.
- Build trust and desire: highlight real benefits, mention what makes the item a smart choice, suggest one useful companion item when it truly fits, and gently create momentum ("this one is popular", "I can get this ready for you today") WITHOUT lying or inventing scarcity.
- Handle objections calmly: if the price feels high, explain the value; if undecided, ask what matters most and narrow the choice for them. Never argue, never pressure, never beg.
- Always close: end with ONE clear next step or question (which option they prefer, size/quantity, or whether to place the order).
- To complete an order, collect these one question at a time: (1) full name, (2) phone number, (3) delivery address or location, (4) quantity. Then confirm the summary and thank them.

FACTS (never break these):
- Everything you know about stock, prices, options and descriptions is the catalogue below, read live from the business profile. Never invent products, prices, colours, sizes, materials or delivery terms. Match the customer's words to catalogue items by meaning (for example panties = underwear or briefs, shoes = sneakers or sandals, bag = handbag).
- Never say the shop has nothing or is out of stock unless the catalogue truly shows nothing relevant or marks the item SOLD OUT. If the exact thing is not listed, say so honestly in one line and offer the closest items that ARE listed, with prices.
- Prices: quote them exactly as written.
- If the customer sends a photo, look at it, say what you see and relate it to the catalogue.
- Photos: if the customer asks to see items, describe them in words and ask "Would you like me to send you the photos?". Only after the customer clearly agrees (yes, ok, go ahead, send, ee, tura), end your message with a separate last line exactly like [SEND_PHOTO: exact item name from the catalogue] and write nothing after it.
- Hand over to the owner when the customer asks for a human, is upset or complaining, wants a bigger discount than you can give, or asks something you cannot know. In that case reply only with a short courteous line saying you are bringing in the owner right now (in ${lang}), and add a separate last line [ESCALATE].
- Stay inside this business (${businessType}); never behave like a different kind of business.

CATALOGUE (live):
${productList}
${vendorInfo}${learningExamples}`;
  }

  function aiReply(userText) {
    var d = db(), vendor = bot.vendor;
    return Promise.all([
      loadKnowledge(vendor, '', 15000),
      d.collection('vendors').doc(vendor).get().catch(function () { return null; }),
      d.collection('vendors').doc(vendor).collection('learningExamples').orderBy('time', 'desc').limit(5).get().catch(function () { return null; })
    ]).then(function (r) {
      var k = r[0] || { cards: [], catalogue: '' }, list = k.cards, vd = r[1] && r[1].exists ? r[1].data() : null, ls = r[2], pv = k.prov || {};
      var productList = k.catalogue || 'No items are listed in the shop yet.';
      var businessType = pv.categoryLabel || 'general store', vendorInfo = '', storeName = vendor.charAt(0).toUpperCase() + vendor.slice(1);
      storeName = (vd && vd.storeName) || pv.businessName || storeName; businessType = (vd && vd.businessType) || businessType;
      var where = [pv.address, pv.city, pv.state, pv.country].filter(Boolean).join(', ') || pv.location || '';
      var hours = pv.operatingHours ? JSON.stringify(pv.operatingHours) : '';
      vd = vd || {};
      vendorInfo = `
BUSINESS TYPE: ${businessType}
ABOUT THE BUSINESS: ${pv.bio || 'not provided'}
OPENING HOURS: ${vd.businessHours || hours || 'not set'}
RETURNS / REFUNDS: ${vd.returnPolicy || 'no returns unless a defect is confirmed'}
LOCATION: ${vd.location || where || 'not provided'}
CONTACT: ${[pv.phone, pv.email, pv.website].filter(Boolean).join(' · ') || 'not provided'}
PAYMENT METHODS: ${vd.paymentMethods || 'Bank transfer / Cash on delivery'}
CURRENCY: ${pv.currency || 'as written in the prices'}
CATEGORIES: ${(k.categories || []).join(', ') || 'none'}
OWNER'S FAQ:
${(vd.customFAQs || []).map(function (f) { return 'Q: ' + f.q + '\nA: ' + f.a; }).join('\n\n')}
OWNER'S PREFERRED TONE: ${vd.toneInstructions || 'polite, calm, direct'}`;
      var learning = '';
      if (ls) {
        var ex = []; ls.forEach(function (x) { var y = x.data(); ex.push('Customer: "' + y.customerMsg + '"\nOwner replied: "' + y.vendorReply + '"'); });
        if (ex.length) learning = '\n\nHOW THE OWNER PERSONALLY ANSWERS IN SIMILAR SITUATIONS — COPY THIS STYLE (but keep the language rule above):\n' + ex.join('\n\n');
      }
      var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 25000);
      return fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ systemPrompt: buildPrompt(storeName, businessType, productList, vendorInfo, learning, detectLang(userText)), messages: history() }) })
        .then(function (res) { clearTimeout(to); return res.json(); })
        .then(function (data) { return { reply: data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content, list: list }; });
    });
  }

  function sendPhoto(name, list) {
    var n = name.toLowerCase(), m = null;
    for (var i = 0; i < list.length && !m; i++) if (list[i].name.toLowerCase().indexOf(n) > -1) m = list[i];
    for (var j = 0; j < list.length && !m; j++) if (n.indexOf(list[j].name.toLowerCase()) > -1) m = list[j];
    if (!m) return Promise.resolve(false);
    return addMsg({ type: 'image', mediaUrl: m.img, mimeType: 'image/jpeg', caption: m.name + ' — ' + priceTxt(m.price) }, '📷 Photo').then(function () { return true; });
  }

  /* the customer must never see markdown symbols */
  function cleanText(t) {
    return String(t || '').replace(/\r/g, '').replace(/```[\s\S]*?```/g, '').replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/gm, '')
      .replace(/\*\*?([^*\n]+)\*\*?/g, '$1').replace(/__?([^_\n]+)__?/g, '$1').replace(/[*`~]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  }
  function onBuyerText(text) {
    if (!bot.active) return;
    if (bot.busy) { bot.again = true; return; }
    bot.busy = true; bot.again = false;
    var fallback = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
    aiReply(text).then(function (r) {
      var reply = r.reply || fallback, img = null, esc2 = false, m;
      if ((m = reply.match(/\[(?:SEND_PHOTO|TURA_HOTO):\s*(.+?)\]/i))) { img = m[1].trim(); reply = reply.replace(/\[(?:SEND_PHOTO|TURA_HOTO):.+?\]/i, '').trim(); }
      if (/\[ESCALATE\]/i.test(reply)) { esc2 = true; reply = reply.replace(/\[ESCALATE\]/i, '').trim(); }
      reply = cleanText(reply) || fallback;
      return addMsg({ text: reply, encrypted: false }, reply.substring(0, 60)).then(function () {
        if (img) return sendPhoto(img, r.list).then(function (ok) { if (!ok) return addMsg({ text: "Sorry, I couldn't pull up that photo right now — let me know if you'd like to see something else from what we have in stock.", encrypted: false }, 'Sorry, I couldn\'t pull up that photo'); });
      }).then(function () {
        if (esc2) {
          roomRef().set({ botActive: false }, { merge: true });
          fetch(PUSH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: bot.vendor, title: '⚠️ A customer needs you', body: String(text).slice(0, 80), data: { url: location.href } }) }).catch(function () {});
        }
      });
    }).catch(function (e) { console.error('Market AI failed:', e && e.message); })
      .then(function () { bot.busy = false; if (bot.again) { bot.again = false; var last = lastBuyerText(); if (last) onBuyerText(last); } });
  }
  function lastBuyerText() {
    var a = Object.keys(bot.docs).map(function (k) { return bot.docs[k]; }).filter(function (m) { return m.senderId === bot.buyer && m.text && !m.encrypted && !m.type; }).sort(function (x, y) { return y.timestamp - x.timestamp; });
    return a.length ? a[0].text : '';
  }

  function onSellerMsg(m) {
    if (m.bot) return;
    roomRef().set({ botActive: false }, { merge: true });                 // vendor took over → bot stays silent
    if (m.text && !m.encrypted && !m.type) {
      var prev = lastBuyerText();
      if (prev) db().collection('vendors').doc(bot.vendor).collection('learningExamples').add({ customerMsg: prev, vendorReply: m.text, time: Date.now() }).catch(function () {});
    }
  }

  function botStart(p, onFirstMsg) {
    var u = me(), peer = p.get('with'), vendor = p.get('vendor') || peer, d = db();
    if (!d || !u || !peer || !vendor) return;
    botStop();
    bot.u = u; bot.vendor = vendor; bot.seller = vendor === u; bot.buyer = bot.seller ? peer : u; bot.room = bizRoom(u, peer);
    bot.runsub = roomRef().onSnapshot(function (s) { var x = s.data() || {}; bot.active = x.botActive !== false; paintPill(); }, function () {});
    bot.unsub = roomRef().collection('messages').orderBy('timestamp', 'desc').limit(30).onSnapshot(function (sn) {
      sn.forEach(function (doc) { bot.docs[doc.id] = doc.data(); });
      if (sn.size && onFirstMsg && !bot.marked) { bot.marked = true; onFirstMsg(); }
      if (!bot.ready) { sn.forEach(function (doc) { bot.seen[doc.id] = 1; }); bot.ready = true; return; }
      sn.docChanges().forEach(function (ch) {
        if (ch.type !== 'added' || bot.seen[ch.doc.id]) return; bot.seen[ch.doc.id] = 1;
        var m = ch.doc.data();
        if (m.senderId === u && !m.bot) roomRef().set({ lastSenderId: u }, { merge: true }).catch(function () {});
        if (bot.seller) { if (m.senderId === u) onSellerMsg(m); }
        else if (m.senderId === u && !m.bot && m.text && !m.encrypted && !m.type) onBuyerText(m.text);
      });
    }, function () {});
  }

  /* chat-interior is a SPA page: watch the URL / header instead of relying on a load event */
  setInterval(function () {
    var p = qp(), key = location.pathname.split('/').pop() + location.search, hdr = document.getElementById('chat-header-bar');
    if (!hdr || p.get('market') !== '1') { if (builtFor) { clear(); botStop(); builtFor = ''; } return; }
    if (builtFor === key) return;
    clear(); botStop(); builtFor = key; start(p, key);
  }, 600);
})();
