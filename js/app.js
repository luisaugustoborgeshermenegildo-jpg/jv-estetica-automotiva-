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

  /* ---------- Botão "Instalar app" ---------- */
  const installBtn = document.getElementById("installBtn");
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn && isIOS && !standalone) installBtn.hidden = false; // iPhone não tem o aviso automático
  installBtn?.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      installBtn.hidden = true;
    } else if (isIOS) {
      toast(
        'No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início".',
      );
    }
  });
  window.addEventListener("appinstalled", () => {
    if (installBtn) installBtn.hidden = true;
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
