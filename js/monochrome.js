// Interações exclusivas da variante Monochrome (o agendamento fica em script.js).
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".hero");
  document.documentElement.classList.add("js");
  requestAnimationFrame(() => hero?.classList.add("is-ready"));

  // Parallax da foto do hero e marca gigante que se abre com a rolagem.
  const heroImg = document.querySelector(".hero-media img");
  const giant = document.querySelector(".giant");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    if (heroImg && y < window.innerHeight * 1.2)
      heroImg.parentElement.style.transform = `translateY(${y * 0.25}px)`;
    if (giant) {
      const r = giant.getBoundingClientRect();
      const progress = 1 - Math.min(Math.max(r.top / window.innerHeight, 0), 1); // 0 → 1 ao entrar na tela
      giant.style.setProperty(
        "--shift",
        String(Math.round((1 - progress) * 120)),
      );
    }
  }
  if (!reduce) {
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true },
    );
    onScroll();
  }

  // Fotos "Motos/Carros" levam ao serviço já filtrado.
  document.querySelectorAll(".shot[data-vehicle]").forEach((shot) =>
    shot.addEventListener("click", () => {
      document
        .querySelector(`.toggle-opt[data-vehicle="${shot.dataset.vehicle}"]`)
        ?.click();
    }),
  );

  // Como funciona: passos com setas e teclado.
  const steps = [...document.querySelectorAll(".step")];
  const now = document.getElementById("stepNow");
  let current = 0;
  function show(i) {
    current = (i + steps.length) % steps.length;
    steps.forEach((s, n) => {
      s.classList.toggle("is-active", n === current);
      s.setAttribute("aria-hidden", String(n !== current));
    });
    now.textContent = String(current + 1).padStart(2, "0");
  }
  document
    .getElementById("stepPrev")
    ?.addEventListener("click", () => show(current - 1));
  document
    .getElementById("stepNext")
    ?.addEventListener("click", () => show(current + 1));
  document.getElementById("stepper")?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === "ArrowLeft") show(current - 1);
  });
  if (steps.length) show(0);

  // Letras vivas nos títulos grandes: com mouse, elas se afastam do cursor;
  // em tela de toque, fazem uma onda única quando o título aparece.
  if (!reduce) {
    const titles = [...document.querySelectorAll(".hero-title, .wordmark")];
    const fine = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    titles.forEach((title) => {
      if (title.id)
        title.setAttribute(
          "aria-label",
          title.textContent.replace(/\s+/g, " ").trim(),
        );
      const letters = splitLetters(title);
      if (fine) followPointer(title, letters);
      else waveOnce(title);
    });
    setTimeout(() => hero?.classList.add("is-revealed"), 1500);
  }

  function splitLetters(root) {
    const letters = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      for (const char of node.textContent) {
        if (/\s/.test(char)) {
          frag.append(char);
          continue;
        }
        const span = document.createElement("span");
        span.className = "ch";
        span.setAttribute("aria-hidden", "true");
        span.textContent = char;
        span.style.setProperty("--i", letters.length);
        letters.push(span);
        frag.append(span);
      }
      node.replaceWith(frag);
    });
    return letters;
  }

  function followPointer(title, letters) {
    let centers = [];
    let frame = 0;
    const measure = () => {
      centers = letters.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          el,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          size: r.height,
        };
      });
    };
    title.addEventListener("pointerenter", measure);
    title.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        centers.forEach(({ el, x, y, size }) => {
          const dx = x - e.clientX;
          const dy = y - e.clientY;
          const dist = Math.hypot(dx, dy) || 1;
          const reach = size * 1.4;
          const force = Math.max(0, 1 - dist / reach);
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
      letters.forEach((el) => {
        el.style.removeProperty("--tx");
        el.style.removeProperty("--ty");
      });
    });
  }

  function waveOnce(title) {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        // No topo, espera a entrada do título terminar antes da onda.
        const delay = title.classList.contains("hero-title") ? 1300 : 0;
        setTimeout(() => title.classList.add("is-wave"), delay);
      },
      { threshold: 0.6 },
    );
    io.observe(title);
  }
})();
