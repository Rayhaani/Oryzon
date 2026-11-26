/* health-sw.js — offline support for Medical City ONLY.
   It never touches other pages: any request not listed below is left to the browser (no respondWith).
   Load it from your existing sw.js with ONE line at the very top:   importScripts('health-sw.js');   */
const V = 'nexus-health-v2';
const OWN = ['health.html', 'health.js', 'health-upgrade.js', 'health-care.js', 'health-premium.js', 'health-telehealth.js', 'health-reach.js', 'health.css'];
const CDN = /^https:\/\/(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs)\//;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => Promise.all(OWN.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('nexus-health-') && x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const own = u.origin === location.origin && OWN.some(n => u.pathname.endsWith('/' + n));
  if (own) {   // network-first (updates apply), cache when offline
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r, { ignoreSearch: true })));
  } else if (CDN.test(r.url)) {   // stale-while-revalidate
    e.respondWith(caches.open(V).then(c => c.match(r).then(hit => { const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => hit); return hit || net; })));
  }
});
