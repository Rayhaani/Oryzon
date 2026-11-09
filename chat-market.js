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
  var HEADER_MS = 30000, SPEED = 70, HOLD_FEW = 6000, MAX_CARDS = 20;
  var timers = [], builtFor = '', strip = null, anim = null, cards = null, cardsFor = '';

  function me() { return localStorage.getItem('nexus_user_session') || ''; }
  function qp() { return new URLSearchParams(location.search); }
  function db() { try { return firebase.firestore(); } catch (e) { return null; } }

  var st = document.createElement('style'); st.id = 'nxMktCss';
  st.textContent =
    '#nxMktStrip{position:fixed;top:0;left:0;right:0;background:#050505;overflow:hidden;pointer-events:auto}' +
    '#nxMktTrack{position:absolute;top:0;left:0;height:100%;display:flex;align-items:center;gap:8px;padding:0 8px;will-change:transform}' +
    '.nxm-card{position:relative;flex:none;height:calc(100% - 14px);aspect-ratio:1.25/1;border-radius:12px;overflow:hidden;background:#1a1a1a;cursor:pointer}' +
    '.nxm-card img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.nxm-card b{position:absolute;left:0;right:0;bottom:0;padding:10px 6px 4px;font:600 10.5px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.78));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  document.head.appendChild(st);


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
    var room = [u, peer].sort().join('__');
    var data = { source: 'market', marketVendor: vendor, marketBuyer: vendor === u ? peer : u };
    if (p.get('product')) data.marketProductId = p.get('product');
    var tries = 0;
    (function go() {
      if (builtFor !== key) return;
      var d = db(); tries++;
      if (!d) { if (tries < 10) timers.push(setTimeout(go, 1500)); return; }
      d.collection('personalChats').doc(room).set(data, { merge: true }).catch(function () { if (tries < 8) timers.push(setTimeout(go, 1500)); });
    })();
  }

  /* 2 — seller's products */
  function loadCards(vendor, productId) {
    if (cards && cardsFor === vendor) return Promise.resolve(cards);
    var d = db(); if (!d) return Promise.resolve([]);
    var fields = ['vendorId', 'vendor', 'sellerId', 'sellerUsername', 'vendorUsername'], out = {}, i = 0;
    function next() {
      if (i >= fields.length || Object.keys(out).length) return Promise.resolve();
      return d.collection('products').where(fields[i++], '==', vendor).limit(MAX_CARDS).get().then(function (sn) {
        sn.forEach(function (doc) { var x = doc.data(), img = x.image || x.img || x.imageUrl || ''; if (img && !x.isVideo && !/\.mp4(\?|$)/i.test(img)) out[doc.id] = { id: doc.id, img: img, name: x.name || x.title || 'Product', price: x.price, desc: x.description || x.desc || '' }; });
      }).catch(function () {}).then(next);
    }
    return next().then(function () {
      var list = Object.keys(out).map(function (k) { return out[k]; });
      list.sort(function (a, b) { return (b.id === productId) - (a.id === productId); });   // the product you came from first
      cards = list; cardsFor = vendor; return list;
    });
  }

  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function runPass(list, key) {
    var h = document.getElementById('chat-header-bar'), host = document.getElementById('page-content') || document.body;
    if (!h || builtFor !== key) return;
    var H = h.offsetHeight || 64, z = parseInt(getComputedStyle(h).zIndex, 10); z = (isNaN(z) ? 100 : z) + 1;
    strip = document.createElement('div'); strip.id = 'nxMktStrip'; strip.style.cssText = 'height:' + H + 'px;z-index:' + z;
    var track = document.createElement('div'); track.id = 'nxMktTrack';
    track.innerHTML = list.map(function (c, i) { return '<div class="nxm-card" data-i="' + i + '"><img src="' + esc(c.img) + '" alt=""><b>' + esc(c.name) + '</b></div>'; }).join('');
    strip.appendChild(track); host.appendChild(strip);
    strip.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('.nxm-card'); if (!el) return; var c = list[+el.dataset.i], i = document.getElementById('msgInput'); if (!c || !i) return;
      i.value = 'Tell me more about ' + c.name + ', and how I can place an order.'; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus();
    });
    h.style.visibility = 'hidden';
    var vw = strip.clientWidth, W = track.scrollWidth, few = list.length <= 2, a;
    if (few) {
      var mid = Math.max(0, (vw - W) / 2), total = 700 + HOLD_FEW + 700;
      a = track.animate([{ transform: 'translateX(' + vw + 'px)', easing: 'ease-out' }, { transform: 'translateX(' + mid + 'px)', offset: 700 / total }, { transform: 'translateX(' + mid + 'px)', offset: (700 + HOLD_FEW) / total, easing: 'ease-in' }, { transform: 'translateX(' + (-W) + 'px)' }], { duration: total, fill: 'forwards' });
    } else {
      a = track.animate([{ transform: 'translateX(' + vw + 'px)' }, { transform: 'translateX(' + (-W) + 'px)' }], { duration: ((vw + W) / SPEED) * 1000, easing: 'linear', fill: 'forwards' });
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
    loadCards(vendor, p.get('product')).then(function (list) { if (list.length && builtFor === key) schedule(list, key); });
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
      return roomRef().set({ lastMessage: label, lastMessageTime: Date.now(), members: [bot.buyer, bot.vendor] }, { merge: true });
    });
  }

  function buildPrompt(storeName, businessType, productList, vendorInfo, learningExamples) {
    return `Kai ne "Ali", business agent na "${storeName}" — wani ${businessType}. Kai NE mutum, ba robot ba — kana magana kai tsaye da customer kamar yadda gwanin sayarwa a WhatsApp ke yi: da hankali, da natsuwa, da kwarin gwiwa, kuma ba tare da yin roƙo ba.

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
  }

  function aiReply(userText) {
    var d = db(), vendor = bot.vendor;
    return Promise.all([
      loadCards(vendor, ''),
      d.collection('vendors').doc(vendor).get().catch(function () { return null; }),
      d.collection('vendors').doc(vendor).collection('learningExamples').orderBy('time', 'desc').limit(5).get().catch(function () { return null; })
    ]).then(function (r) {
      var list = r[0] || [], vd = r[1] && r[1].exists ? r[1].data() : null, ls = r[2];
      var productList = list.length ? list.map(function (c) { return '- ' + c.name + ': $' + String(c.price == null ? '?' : c.price).replace(/[₦$]/g, '').trim() + ' | ' + (c.desc || ''); }).join('\n') : 'No products listed yet.';
      var businessType = 'shago na gama-gari', vendorInfo = '', storeName = vendor.charAt(0).toUpperCase() + vendor.slice(1);
      if (vd) {
        storeName = vd.storeName || storeName; businessType = vd.businessType || businessType;
        vendorInfo = `
IRIN KASUWANCIN: ${businessType}
SA'O'IN AIKI: ${vd.businessHours || 'Ba a saita ba'}
MANUFOFIN DAWO DA KAYA/SERVICE: ${vd.returnPolicy || 'Babu dawowa sai an tabbatar da lahani'}
WURI: ${vd.location || 'Ba a bayar ba'}
HANYAR BIYAN KUDI: ${vd.paymentMethods || 'Bank transfer / Cash on delivery'}
FAQ NA MUSAMMAN:
${(vd.customFAQs || []).map(function (f) { return 'Q: ' + f.q + '\nA: ' + f.a; }).join('\n\n')}
TONE/HALIN VENDOR: ${vd.toneInstructions || 'Mai kirki, natsuwa, kai tsaye'}`;
      }
      var learning = '';
      if (ls) {
        var ex = []; ls.forEach(function (x) { var y = x.data(); ex.push('Customer: "' + y.customerMsg + '"\nVendor ya amsa: "' + y.vendorReply + '"'); });
        if (ex.length) learning = '\n\nGA YADDA VENDOR KANSA YAKE AMSAWA A IRIN WANNAN YANAYI — KA KWAIKWAYI WANNAN SALON:\n' + ex.join('\n\n');
      }
      var ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 25000);
      return fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ systemPrompt: buildPrompt(storeName, businessType, productList, vendorInfo, learning), messages: history() }) })
        .then(function (res) { clearTimeout(to); return res.json(); })
        .then(function (data) { return { reply: data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content, list: list }; });
    });
  }

  function sendPhoto(name, list) {
    var n = name.toLowerCase(), m = null;
    for (var i = 0; i < list.length && !m; i++) if (list[i].name.toLowerCase().indexOf(n) > -1) m = list[i];
    for (var j = 0; j < list.length && !m; j++) if (n.indexOf(list[j].name.toLowerCase()) > -1) m = list[j];
    if (!m) return Promise.resolve(false);
    return addMsg({ type: 'image', mediaUrl: m.img, mimeType: 'image/jpeg', caption: m.name + ' — $' + String(m.price == null ? '?' : m.price).replace(/[₦$]/g, '').trim() }, '📷 Photo').then(function () { return true; });
  }

  function onBuyerText(text) {
    if (!bot.active) return;
    if (bot.busy) { bot.again = true; return; }
    bot.busy = true; bot.again = false;
    var fallback = "Sorry, I'm having a small hiccup on my end. Please try again in a moment, or send your message once more.";
    aiReply(text).then(function (r) {
      var reply = r.reply || fallback, img = null, esc2 = false, m;
      if ((m = reply.match(/\[TURA_HOTO:\s*(.+?)\]/i))) { img = m[1].trim(); reply = reply.replace(/\[TURA_HOTO:.+?\]/i, '').trim(); }
      if (/\[ESCALATE\]/i.test(reply)) { esc2 = true; reply = reply.replace(/\[ESCALATE\]/i, '').trim(); }
      return addMsg({ text: reply, encrypted: false }, reply.substring(0, 60)).then(function () {
        if (img) return sendPhoto(img, r.list).then(function (ok) { if (!ok) return addMsg({ text: "Sorry, I couldn't pull up that photo right now — let me know if you'd like to see something else from what we have in stock.", encrypted: false }, 'Sorry, I couldn\'t pull up that photo'); });
      }).then(function () {
        if (esc2) {
          roomRef().set({ botActive: false }, { merge: true });
          fetch(PUSH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: bot.vendor, title: '⚠️ Customer yana bukatar ka', body: String(text).slice(0, 80), data: { url: location.href } }) }).catch(function () {});
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
    bot.u = u; bot.vendor = vendor; bot.seller = vendor === u; bot.buyer = bot.seller ? peer : u; bot.room = [u, peer].sort().join('__');
    bot.runsub = roomRef().onSnapshot(function (s) { var x = s.data() || {}; bot.active = x.botActive !== false; paintPill(); }, function () {});
    bot.unsub = roomRef().collection('messages').orderBy('timestamp', 'desc').limit(30).onSnapshot(function (sn) {
      sn.forEach(function (doc) { bot.docs[doc.id] = doc.data(); });
      if (sn.size && onFirstMsg && !bot.marked) { bot.marked = true; onFirstMsg(); }
      if (!bot.ready) { sn.forEach(function (doc) { bot.seen[doc.id] = 1; }); bot.ready = true; return; }
      sn.docChanges().forEach(function (ch) {
        if (ch.type !== 'added' || bot.seen[ch.doc.id]) return; bot.seen[ch.doc.id] = 1;
        var m = ch.doc.data();
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
