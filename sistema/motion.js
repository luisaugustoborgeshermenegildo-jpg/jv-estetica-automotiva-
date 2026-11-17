/* JV Sistema — movimento com a identidade do site da JV.
   - Título de cada tela: letras sobem ao abrir e se afastam do mouse (como no site).
   - Barra azul do menu desliza até a tela escolhida.
   - Troca de tela curta; números dos cartões contam até o valor novo.
   - Topo com a moto da JV que acompanha o mouse.
   Quem prefere menos movimento vê tudo parado. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s) => document.querySelector(s);

  /* ---------- Letras vivas ---------- */
  function splitLetters(root) {
    const text = root.textContent;
    root.setAttribute("aria-label", text.replace(/\s+/g, " ").trim());
    const frag = document.createDocumentFragment();
    let i = 0;
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue;
      if (/^\s+$/.test(word)) {
        frag.append(" ");
        continue;
      }
      // Palavra inteira junta para não quebrar no meio.
      const w = document.createElement("span");
      w.className = "word";
      w.setAttribute("aria-hidden", "true");
      for (const char of word) {
        const ch = document.createElement("span");
        ch.className = "ch";
        ch.textContent = char;
        ch.style.setProperty("--i", i++);
        w.append(ch);
      }
      frag.append(w);
    }
    root.replaceChildren(frag);
    return [...root.querySelectorAll(".ch")];
  }

  function followPointer(title) {
    let centers = [];
    let frame = 0;
    title.addEventListener("pointerenter", () => {
      centers = [...title.querySelectorAll(".ch")].map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          size: r.height,
        };
      });
    });
    title.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        centers.forEach(({ el, x, y, size }) => {
          const dx = x - e.clientX;
          const dy = y - e.clientY;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.max(0, 1 - dist / (size * 1.4));
          const push = force * size * 0.16;
          el.style.setProperty("--tx", `${((dx / dist) * push).toFixed(1)}px`);
          el.style.setProperty(
            "--ty",
            `${((dy / dist) * push - force * size * 0.1).toFixed(1)}px`,
          );
        });
      });
    });
    title.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      title.querySelectorAll(".ch").forEach((el) => {
        el.style.removeProperty("--tx");
        el.style.removeProperty("--ty");
      });
    });
  }

  // O título muda a cada tela (sistema.js troca o texto): divide de novo e anima a entrada.
  function liveTitle(title) {
    if (!title) return;
    let busy = false;
    const run = () => {
      if (busy) return;
      busy = true;
      observer.disconnect();
      splitLetters(title);
      if (!reduce) {
        title.classList.remove("is-enter");
        void title.offsetWidth; // reinicia a animação
        title.classList.add("is-enter");
      }
      observer.observe(title, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      busy = false;
    };
    const observer = new MutationObserver(run);
    if (fine && !reduce) followPointer(title);
    run();
  }

  /* ---------- Barra do menu ---------- */
  function sliderBar() {
    const nav = $(".sidebar nav");
    if (!nav) return;
    const bar = document.createElement("span");
    bar.className = "nav-bar";
    bar.setAttribute("aria-hidden", "true");
    nav.append(bar);
    const place = () => {
      const current = nav.querySelector('[aria-current="page"]');
      bar.classList.toggle("is-on", Boolean(current));
      if (!current) return;
      bar.style.setProperty("--y", `${current.offsetTop + 8}px`);
      bar.style.setProperty("--h", `${current.offsetHeight - 16}px`);
    };
    new MutationObserver(place).observe(nav, {
      attributes: true,
      subtree: true,
      attributeFilter: ["aria-current"],
    });
    window.addEventListener("resize", place);
    place();
  }

  /* ---------- Troca de tela ---------- */
  function pageSwap() {
    if (reduce) return;
    document.querySelectorAll(".page").forEach((page) =>
      new MutationObserver(() => {
        if (page.hidden) return;
        page.classList.remove("page-in");
        void page.offsetWidth;
        page.classList.add("page-in");
      }).observe(page, { attributes: true, attributeFilter: ["hidden"] }),
    );
  }

  /* ---------- Números que contam ---------- */
  function countUp() {
    if (reduce) return;
    const targets = document.querySelectorAll(
      ".kpi strong, .fin-big, .kpi-mini",
    );
    targets.forEach((el) => {
      let last = el.textContent;
      const observer = new MutationObserver(() => {
        const next = el.textContent;
        if (next === last || el.dataset.counting) return;
        const to = parseNumber(next);
        const from = parseNumber(last);
        last = next;
        if (to === null || from === null || to === from) return;
        animate(el, from, to, next, observer);
      });
      observer.observe(el, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
  }
  function parseNumber(text) {
    const digits = text.replace(/[^\d,-]/g, "").replace(",", ".");
    if (!digits || digits === "-") return null;
    const n = Number(digits);
    return Number.isFinite(n) ? n : null;
  }
  function animate(el, from, to, finalText, observer) {
    const money = finalText.includes("R$");
    const pad = /^0\d/.test(finalText.trim()) ? 2 : 0;
    const start = performance.now();
    const duration = 650;
    el.dataset.counting = "1";
    observer.disconnect();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (to - from) * eased;
      el.textContent =
        t === 1
          ? finalText
          : money
            ? value.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            : String(Math.round(value)).padStart(pad, "0");
      if (t < 1) requestAnimationFrame(step);
      else {
        delete el.dataset.counting;
        observer.observe(el, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
    };
    requestAnimationFrame(step);
  }

  /* ---------- Moto do topo acompanha o mouse ---------- */
  function heroParallax() {
    const top = $(".top");
    if (!top || reduce || !fine) return;
    let frame = 0;
    top.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = top.getBoundingClientRect();
        top.style.setProperty(
          "--mx",
          `${(((e.clientX - r.left) / r.width - 0.5) * -28).toFixed(1)}px`,
        );
        top.style.setProperty(
          "--my",
          `${(((e.clientY - r.top) / r.height - 0.5) * -16).toFixed(1)}px`,
        );
      });
    });
    top.addEventListener("pointerleave", () => {
      top.style.setProperty("--mx", "0px");
      top.style.setProperty("--my", "0px");
    });
  }

  const start = () => {
    liveTitle($("#pageTitle"));
    liveTitle($(".login-card h1"));
    sliderBar();
    pageSwap();
    countUp();
    heroParallax();
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
