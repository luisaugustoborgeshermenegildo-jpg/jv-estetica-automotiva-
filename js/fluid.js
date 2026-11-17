/* Cartões fluidos (site e JV Sistema).
   - [data-tilt] e .kpi inclinam de leve seguindo o mouse, com um brilho no ponto do cursor.
   - [data-flow] liga os passos com uma linha que se preenche quando aparece na tela.
   Celular e "menos movimento": tudo parado, só o conteúdo. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function tilt(el) {
    if (el.dataset.fluid) return;
    el.dataset.fluid = "1";
    let frame = 0;
    el.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(frame);
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
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  }

  function start() {
    if (!reduce && fine)
      document.querySelectorAll("[data-tilt], .kpi").forEach(tilt);

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
