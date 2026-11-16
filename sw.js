// Service worker do app JV Estética.
// Guarda a "casca" do site para abrir rápido e funcionar com internet fraca.
// Agenda (/api) e painel (/admin) NUNCA passam pelo cache: sempre vão à rede.
// A marca de versão abaixo é trocada automaticamente por um código dos arquivos
// do site (build.mjs na Netlify, app.py no modo local). Mudou um arquivo → cache novo.
const VERSION = "jv-__VERSAO__";
const SHELL = [
  "/",
  "/monochrome",
  "/css/monochrome.css",
  "/css/mono-app.css",
  "/js/monochrome.js",
  "/js/mono-app.js",
  "/assets/moto.webp",
  "/css/style.css",
  "/css/forms.css",
  "/css/app.css",
  "/js/foam.js",
  "/js/script.js",
  "/js/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin"))
    return;

  // Páginas: rede primeiro (conteúdo sempre atualizado); sem rede, usa a cópia guardada.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          if (response.ok)
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          // O app abre em /monochrome?origem=app: ignora o "?..." ao procurar a cópia.
          caches
            .match(request, { ignoreSearch: true })
            .then((hit) => hit || caches.match("/monochrome")),
        ),
    );
    return;
  }

  // CSS, JS, imagens: cache primeiro e atualiza em segundo plano.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    }),
  );
});
