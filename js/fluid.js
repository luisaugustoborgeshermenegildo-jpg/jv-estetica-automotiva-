/* Cartões fluidos (site e JV Sistema).
   - [data-tilt], .kpi e os cards do app (.chip, Meus horários) inclinam de leve seguindo o mouse, com um brilho no ponto do cursor.
   - [data-flow] liga os passos com uma linha que se preenche quando aparece na tela.
   Celular e "menos movimento": tudo parado, só o conteúdo. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Delegado no documento: vale também para cards criados depois (ex.: Meus horários).
  const SEL = "[data-tilt], .kpi, .chip, .mine-list li";
  let cur = null;
  let frame = 0;
  function rest(el) {
    el.classList.remove("is-tilting");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }
  function tilt() {
    document.addEventListener("pointermove", (e) => {
      const el = e.target instanceof Element ? e.target.closest(SEL) : null;
      if (cur && cur !== el) rest(cur);
      cur = el;
      cancelAnimationFrame(frame);
      if (!el) return;
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${x * 100}%`);
        el.style.setProperty("--my", `${y * 100}%`);
        el.style.setProperty("--ry", `${(x - 0.5) * 8}deg`);
        el.style.setProperty("--rx", `${(0.5 - y) * 8}deg`);
        el.classList.add("is-tilting");
      });
    });
    document.documentElement.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      if (cur) rest(cur);
      cur = null;
    });
  }

  function start() {
    if (!reduce && fine) tilt();

    const flows = document.querySelectorAll("[data-flow]");
    if (reduce || !("IntersectionObserver" in window)) {
      flows.forEach((f) => f.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }),
      { threshold: 0.35 },
    );
    flows.forEach((f) => io.observe(f));
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
