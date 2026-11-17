/* JV Sistema: instalar como app no celular (iPhone e Android) e no computador.
   - Android/Chrome/Edge: usa o aviso de instalação do navegador.
   - iPhone: o Safari não tem esse aviso, então mostra o passo a passo
     (Compartilhar → Adicionar à Tela de Início).
   - Fora do Safari no iPhone (Instagram, WhatsApp, Chrome antigo): pede para abrir no Safari.
   Mostra um aviso no topo (uma vez por aparelho, até instalar ou fechar) e um
   cartão em Configurações › Acesso com QR Code para abrir no celular. */
(() => {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const ua = navigator.userAgent;
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // No iPhone, só o Safari (e o Chrome/Edge a partir do iOS 16.4) instalam.
  // Navegadores dentro de outros apps não instalam.
  const iosInApp = isIOS && /Instagram|FBAN|FBAV|WhatsApp|Line\//i.test(ua);
  const isMobile = isIOS || /android/i.test(ua);
  const KEY = "jv:sistema:aviso-instalar";
  const url = location.origin + "/sistema/";
  let prompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
  });
  window.addEventListener("appinstalled", () => {
    prompt = null;
    banner?.remove();
    dialog?.close();
  });

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  /* ---------- Passo a passo ---------- */
  let dialog = null;
  function steps() {
    if (iosInApp)
      return [
        "Toque nos três pontinhos (⋯) no canto da tela.",
        "Escolha “Abrir no Safari” (ou copie o link e cole no Safari).",
        "No Safari, abra o JV Sistema de novo e toque em Instalar.",
      ];
    if (isIOS)
      return [
        "Toque no botão Compartilhar (o quadrado com a seta para cima ⬆︎), na barra do Safari.",
        "Role a lista e toque em “Adicionar à Tela de Início”.",
        "Confira o nome “JV Sistema” e toque em Adicionar.",
        "Abra pelo ícone preto da JV na tela de início e entre com a senha uma vez.",
      ];
    return [
      "Abra o menu do navegador (⋮) no canto da tela.",
      "Toque em “Instalar app” ou “Adicionar à tela inicial”.",
      "Abra pelo ícone preto da JV e entre com a senha uma vez.",
    ];
  }
  function openGuide() {
    if (standalone) return;
    if (prompt) {
      prompt.prompt();
      prompt.userChoice.finally(() => (prompt = null));
      return;
    }
    if (!dialog) {
      dialog = el("dialog", "install-dialog");
      dialog.setAttribute("aria-labelledby", "installTitle");
      const h = el("h2", null, "Instalar o JV Sistema");
      h.id = "installTitle";
      const ol = el("ol", "install-steps");
      steps().forEach((s) => ol.append(el("li", null, s)));
      const actions = el("div", "install-actions");
      if (iosInApp) {
        const copy = el("button", "btn-ghost", "Copiar link");
        copy.type = "button";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(url);
            copy.textContent = "Link copiado";
          } catch {
            copy.textContent = url;
          }
        });
        actions.append(copy);
      }
      const ok = el("button", "btn-primary", "Entendi");
      ok.type = "button";
      ok.addEventListener("click", () => dialog.close());
      actions.append(ok);
      dialog.append(h, ol, actions);
      document.body.append(dialog);
    }
    dialog.showModal();
  }
  window.jvInstall = openGuide;

  /* ---------- Aviso no topo (só no celular, fora do app) ---------- */
  let banner = null;
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(KEY) === "fechado";
  } catch {
    /* sem armazenamento: mostra o aviso */
  }
  function showBanner() {
    if (standalone || dismissed || !isMobile) return;
    banner = el("div", "install-banner");
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Instalar o app");
    const text = el(
      "p",
      null,
      "Instale o JV Sistema na tela de início do celular.",
    );
    const go = el("button", "btn-primary", "Instalar");
    go.type = "button";
    go.addEventListener("click", openGuide);
    const close = el("button", "install-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Fechar aviso");
    close.addEventListener("click", () => {
      banner.remove();
      try {
        localStorage.setItem(KEY, "fechado");
      } catch {
        /* sem armazenamento: só some agora */
      }
    });
    banner.append(text, go, close);
    document.body.prepend(banner);
  }

  /* ---------- Cartão em Configurações › Acesso ---------- */
  function drawQr(canvas) {
    if (typeof qrcode !== "function") return;
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const ctx = canvas.getContext("2d");
    const count = qr.getModuleCount();
    const cell = Math.floor(canvas.width / (count + 4));
    const offset = Math.floor((canvas.width - cell * count) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050608";
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++)
        if (qr.isDark(r, c))
          ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
  }
  function setupCard() {
    const card = document.getElementById("installCard");
    if (!card) return;
    const status = card.querySelector("[data-install-status]");
    const btn = card.querySelector("[data-install]");
    if (standalone) {
      status.textContent =
        "Você já está usando o JV Sistema como app neste aparelho.";
      btn.hidden = true;
    } else {
      btn.addEventListener("click", openGuide);
    }
    const canvas = card.querySelector("canvas");
    if (canvas) drawQr(canvas);
    const link = card.querySelector("[data-install-url]");
    if (link) link.textContent = url;
  }

  document.addEventListener("DOMContentLoaded", () => {
    showBanner();
    setupCard();
  });
})();
