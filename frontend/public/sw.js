const CACHE = "schoolcloud-shell-v2";
const STATIC = /\.(?:js|css|svg|png|webp|woff2?)$/;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const response = await fetch("/", { cache: "reload" });
    if (!response.ok) throw new Error("Unable to cache the application shell");
    await cache.put("/", response.clone());
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)]
      .map((match) => new URL(match[1], self.location.origin).href)
      .filter((url) => new URL(url).origin === self.location.origin);
    await Promise.all(assets.map(async (url) => {
      try {
        const asset = await fetch(url, { cache: "reload" });
        if (asset.ok) await cache.put(url, asset);
      } catch { /* A failed optional asset stays available online on the next visit. */ }
    }));
    await Promise.all(["/manifest.webmanifest", "/icons/icon.svg"].map(async (url) => {
      try { const item = await fetch(url); if (item.ok) await cache.put(url, item); } catch { /* optional shell files */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key.startsWith("schoolcloud-shell-") && key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put("/", response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("/"))));
    return;
  }
  if (STATIC.test(url.pathname)) {
    event.respondWith(caches.match(request).then(async (cached) => {
      const update = fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      });
      if (cached) { void update.catch(() => undefined); return cached; }
      return update;
    }));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || "لديك إشعار جديد." }; }
  const title = typeof data.title === "string" ? data.title : "SchoolCloud";
  const body = typeof data.body === "string" ? data.body : "لديك إشعار جديد.";
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/";
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: typeof data.tag === "string" ? data.tag : undefined,
    data: { url },
    dir: "rtl",
    lang: "ar",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    for (const client of clients) {
      if ("focus" in client) {
        if ("navigate" in client) await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  }));
});
