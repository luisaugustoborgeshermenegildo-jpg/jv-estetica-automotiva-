// Recursos de "app de celular": instalação (PWA), barra inferior, máscara do
// WhatsApp e lembrar dados no aparelho. Vale para as duas versões do site.
(() => {
  const STORE_KEY = "jv:cliente";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  document.documentElement.classList.toggle("is-app", standalone);

  /* ---------- Service worker (só em HTTPS ou localhost) ---------- */
  if (
    "serviceWorker" in navigator &&
    (location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1")
  ) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {}),
    );
  }

  /* ---------- Aviso rápido (toast) ---------- */
  function toast(text) {
    let el = document.getElementById("appToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "appToast";
      el.className = "app-toast";
      el.setAttribute("role", "status");
      document.body.append(el);
    }
    el.textContent = text;
    el.classList.add("is-visible");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-visible"), 6000);
  }

  /* ---------- Instalar o app ---------- */
  // Qualquer elemento com data-install abre a instalação. No Android/Chrome
  // aparece o aviso do próprio navegador; no iPhone e nos demais, uma janela
  // explica o passo a passo. O link /app (= ?instalar=1) já abre essa janela.
  const installBtn = document.getElementById("installBtn");
  installBtn?.setAttribute("data-install", "");
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) installBtn.hidden = false;
    if (sheet?.open) sheetMode();
  });
  if (installBtn && isIOS && !standalone) installBtn.hidden = false; // iPhone não tem o aviso automático

  let sheet = null;
  function buildSheet() {
    sheet = document.createElement("dialog");
    sheet.className = "install-sheet";
    sheet.setAttribute("aria-labelledby", "installTitle");
    sheet.innerHTML = `
      <button type="button" class="install-close" aria-label="Fechar">×</button>
      <img src="/icons/icon-192.png" alt="" width="64" height="64" />
      <h2 id="installTitle">Instale o app da JV</h2>
      <p>Agende sua lavagem em poucos toques, direto da tela do celular.</p>
      <button type="button" class="install-go">Instalar agora</button>
      <ol class="install-steps" data-for="ios">
        <li>Toque em <b>Compartilhar</b> <span class="install-share" aria-hidden="true"></span> na barra do Safari.</li>
        <li>Escolha <b>Adicionar à Tela de Início</b>.</li>
        <li>Toque em <b>Adicionar</b>. O ícone da JV aparece na sua tela.</li>
      </ol>
      <ol class="install-steps" data-for="other">
        <li>Abra o menu do navegador (<b>⋮</b> no canto da tela).</li>
        <li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li>
        <li>Confirme. O ícone da JV aparece na sua tela.</li>
      </ol>`;
    document.body.append(sheet);
    sheet
      .querySelector(".install-close")
      .addEventListener("click", () => sheet.close());
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet) sheet.close(); // toque fora fecha
    });
    sheet.querySelector(".install-go").addEventListener("click", promptInstall);
  }
  function sheetMode() {
    const mode = deferredPrompt ? "prompt" : isIOS ? "ios" : "other";
    sheet.dataset.mode = mode;
  }
  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
    sheet?.close();
    if (choice?.outcome !== "accepted") sheetMode();
  }
  function openInstall() {
    if (standalone) return toast("Você já está usando o app da JV.");
    if (!sheet) buildSheet();
    sheetMode();
    sheet.showModal();
  }
  // "Baixe o app" no site leva direto ao app de agendamento (modo app) e,
  // lá, abre a instalação. Já dentro do app, só abre a instalação.
  const APP_URL = "/monochrome?app=1&instalar=1";
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-install]")) return;
    if (document.documentElement.classList.contains("is-app")) openInstall();
    else location.href = APP_URL;
  });
  if (new URLSearchParams(location.search).has("instalar")) openInstall();
  window.addEventListener("appinstalled", () => {
    if (installBtn) installBtn.hidden = true;
    sheet?.close();
    toast("App instalado! Agora é só abrir pela tela inicial.");
  });

  /* ---------- Barra inferior: some quando o formulário está na tela ---------- */
  const bar = document.getElementById("appBar");
  const booking = document.getElementById("agendar");
  if (bar && booking) {
    new IntersectionObserver(
      ([entry]) => bar.classList.toggle("is-hidden", entry.isIntersecting),
      { rootMargin: "-45% 0px -45% 0px" },
    ).observe(booking);
  }

  /* ---------- Máscara do WhatsApp: (34) 99999-9999 ---------- */
  const phone = document.querySelector('#bookingForm [name="phone"]');
  phone?.addEventListener("input", () => {
    const d = phone.value.replace(/\D/g, "").slice(0, 11);
    let out = d;
    if (d.length > 2) out = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 7)
      out = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
    phone.value = out;
  });

  /* ---------- Lembrar nome e WhatsApp neste aparelho ---------- */
  const form = document.getElementById("bookingForm");
  const remember = document.getElementById("rememberMe");
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch {
      return null;
    }
  }
  function fill() {
    const saved = load();
    if (!saved || !form) return;
    if (saved.name) form.elements.name.value = saved.name;
    if (saved.phone) form.elements.phone.value = saved.phone;
    if (remember) remember.checked = true;
  }
  fill();
  // script.js avisa quando um agendamento foi salvo com sucesso.
  document.addEventListener("jv:booked", (event) => {
    try {
      if (remember?.checked)
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({
            name: event.detail.name,
            phone: event.detail.phone,
          }),
        );
      else localStorage.removeItem(STORE_KEY);
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
    setTimeout(fill, 0); // depois do form.reset() feito pelo script.js
  });
  remember?.addEventListener("change", () => {
    if (!remember.checked) {
      try {
        localStorage.removeItem(STORE_KEY);
      } catch {
        /* ignora */
      }
    }
  });
})();
