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
})();
