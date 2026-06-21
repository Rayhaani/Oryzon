// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDExSOnFbN-wJbT1UFgB-kBs37bEa3KiWc",
    authDomain: "oryzon-50ea4.firebaseapp.com",
    projectId: "oryzon-50ea4",
    storageBucket: "oryzon-50ea4.firebasestorage.app",
    messagingSenderId: "782106742622",
    appId: "1:782106742622:web:902d512bfe42dd4cf289cf"
});

const messaging = firebase.messaging();

// Background notification handler
messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification;
    self.registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: payload.data
    });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data && event.notification.data.url 
        ? event.notification.data.url 
        : '/services.html';
    event.waitUntil(clients.openWindow(url));
});
