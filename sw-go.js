self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
// fetch handler 让 Chrome 判定为可安装（beforeinstallprompt 需要），实现"安装到桌面"原生弹窗
self.addEventListener("fetch", event => {
  event.respondWith(fetch(event.request));
});

