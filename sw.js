// ═══════════════════════════════════════════════════
//  NEXUS Service Worker — Call Notifications
// ═══════════════════════════════════════════════════

const CACHE_NAME = 'nexus-v1';

self.addEventListener('install', e => {
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(clients.claim());
});

// ── Listen for messages from app ──────────────────
self.addEventListener('message', e => {
    const data = e.data;

    if (data.type === 'INCOMING_CALL') {
        showCallNotification(data);
    }

    if (data.type === 'CALL_ENDED') {
        // Close any open call notifications
        self.registration.getNotifications({ tag: 'nexus-call' })
            .then(notifications => notifications.forEach(n => n.close()));
    }
});

// ── Show Call Notification ─────────────────────────
function showCallNotification({ callerName, callerAvatar, docId, callType }) {
    const options = {
        body: callType === 'video' ? '📹 Incoming Video Call' : '📞 Incoming Voice Call',
        icon: callerAvatar || '/Oryzon/icon.png',
        badge: '/Oryzon/icon.png',
        image: callerAvatar,
        tag: 'nexus-call',
        renotify: true,
        requireInteraction: true,  // Notification stays until user acts
        vibrate: [300, 100, 300, 100, 300],
        actions: [
            {
                action: 'decline',
                title: '❌ Decline',
            },
            {
                action: 'accept',
                title: '✅ Accept',
            }
        ],
        data: { docId, callType, callerName, callerAvatar }
    };

    self.registration.showNotification(`${callerName} is calling...`, options);
}

// ── Handle Notification Click ──────────────────────
self.addEventListener('notificationclick', e => {
    const notification = e.notification;
    const action = e.action;
    const data = notification.data;

    notification.close();

    if (action === 'decline') {
        // Aika decline message zuwa app
        e.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                clientList.forEach(client => {
                    client.postMessage({
                        type: 'DECLINE_CALL',
                        docId: data.docId
                    });
                });
            })
        );
    } else {
        // Accept — buɗe app a call screen
        e.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                // Idan app tana buɗe, focus ta
                for (const client of clientList) {
                    if (client.url.includes('chat-interior') || client.url.includes('Oryzon')) {
                        client.focus();
                        client.postMessage({
                            type: 'ACCEPT_CALL',
                            docId: data.docId,
                            callerName: data.callerName,
                            callerAvatar: data.callerAvatar,
                            callType: data.callType
                        });
                        return;
                    }
                }
                // Idan ba a buɗe ba, buɗe sabon tab
                clients.openWindow(`/Oryzon/chat-interior.html?accept_call=${data.docId}&type=${data.callType}`);
            })
        );
    }
});

// ── Handle notification close ──────────────────────
self.addEventListener('notificationclose', e => {
    const data = e.notification.data;
    // Auto-decline idan user ya goge notification
    clients.matchAll({ type: 'window' }).then(clientList => {
        clientList.forEach(client => {
            client.postMessage({ type: 'DECLINE_CALL', docId: data.docId });
        });
    });
});
