// Hero interativo: espuma desenhada em canvas que o visitante "limpa" com o cursor ou o dedo.
// A espuma volta devagar, como um vidro molhado. Respeita prefers-reduced-motion.
(() => {
  const canvas = document.getElementById("foam");
  const hero = document.querySelector(".hero");
  const hint = document.querySelector(".hero-hint");
  if (!canvas || !hero) return;

  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MASK_SCALE = 0.25; // máscara em baixa resolução (mais leve)
  const REFOAM = 0.012; // velocidade com que a espuma volta
  const foam = document.createElement("canvas");
  const mask = document.createElement("canvas");
  const fctx = foam.getContext("2d");
  const mctx = mask.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1,
    raf = 0,
    visible = true,
    lastWipe = 0,
    last = null,
    hinted = false;

  // Ruído simples (value noise) para agrupar a espuma em "nuvens".
  function noiseField(cols, rows) {
    const c = document.createElement("canvas");
    c.width = cols;
    c.height = rows;
    const g = c.getContext("2d");
    const img = g.createImageData(cols, rows);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function buildFoam() {
    foam.width = W;
    foam.height = H;
    // densidade: ruído suavizado ampliado
    const dens = document.createElement("canvas");
    dens.width = W;
    dens.height = H;
    const d = dens.getContext("2d");
    d.imageSmoothingEnabled = true;
    d.imageSmoothingQuality = "high";
    d.drawImage(noiseField(14, 8), 0, 0, W, H);
    d.globalAlpha = 0.5;
    d.drawImage(noiseField(40, 22), 0, 0, W, H);
    const data = d.getImageData(0, 0, W, H).data;

    fctx.clearRect(0, 0, W, H);
    const at = (x, y) => data[((y | 0) * W + (x | 0)) * 4] / 255;
    const bias = y => 0.15 + Math.pow(y / H, 1.4) * 1.2; // mais espuma embaixo

    // 1) nuvens suaves de espuma
    const clouds = Math.round((W * H) / (5000 * dpr * dpr));
    for (let i = 0; i < clouds; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const p = Math.pow(at(x, y), 1.6) * bias(y);
      if (Math.random() > p) continue;
      const r = (20 + Math.random() * 70) * dpr;
      const g = fctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(230,238,255,${0.05 + Math.random() * 0.09})`);
      g.addColorStop(1, 'rgba(230,238,255,0)');
      fctx.fillStyle = g;
      fctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 2) granulado fino (o "chiado" da espuma)
    const grains = Math.round((W * H) / 14);
    for (let i = 0; i < grains; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const p = Math.pow(at(x, y), 1.8) * bias(y);
      if (Math.random() > p) continue;
      const s = (Math.random() < 0.85 ? 1 : 2) * dpr;
      fctx.fillStyle = `rgba(240,245,255,${0.12 + Math.random() * 0.5})`;
      fctx.fillRect(x, y, s, s);
    }

    // 3) bolhas
    fctx.lineWidth = 0.8 * dpr;
    for (let i = 0; i < clouds / 3; i++) {
      const x = Math.random() * W, y = H * (0.3 + Math.random() * 0.7);
      if (Math.random() > at(x, y) * bias(y) * 0.8) continue;
      fctx.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`;
      fctx.beginPath();
      fctx.arc(x, y, (Math.random() * 5 + 1.5) * dpr, 0, Math.PI * 2);
      fctx.stroke();
    }
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(rect.width * dpr));
    H = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = W;
    canvas.height = H;
    mask.width = Math.ceil(W * MASK_SCALE);
    mask.height = Math.ceil(H * MASK_SCALE);
    buildFoam();
    render();
  }

  function render() {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(foam, 0, 0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(mask, 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }

  function wipe(x0, y0, x1, y1, radius) {
    const s = MASK_SCALE * dpr;
    mctx.globalCompositeOperation = "source-over";
    mctx.strokeStyle = "#fff";
    mctx.lineCap = "round";
    mctx.lineWidth = radius * s;
    mctx.shadowColor = "#fff";
    mctx.shadowBlur = radius * s * 0.6;
    mctx.beginPath();
    mctx.moveTo(x0 * s, y0 * s);
    mctx.lineTo(x1 * s, y1 * s);
    mctx.stroke();
    lastWipe = performance.now();
    start();
  }

  function tick() {
    raf = 0;
    if (!visible) return;
    if (!reduce) {
      mctx.globalCompositeOperation = "destination-out";
      mctx.shadowBlur = 0;
      mctx.fillStyle = `rgba(0,0,0,${REFOAM})`;
      mctx.fillRect(0, 0, mask.width, mask.height);
    }
    render();
    // continua animando enquanto a espuma ainda está voltando (~6 s)
    if (performance.now() - lastWipe < 6000) raf = requestAnimationFrame(tick);
  }
  function start() {
    if (!raf && visible) raf = requestAnimationFrame(tick);
  }

  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  hero.addEventListener("pointermove", (e) => {
    const p = point(e);
    const radius = e.pointerType === "touch" ? 70 : 56;
    if (last) wipe(last.x, last.y, p.x, p.y, radius);
    else wipe(p.x, p.y, p.x, p.y, radius);
    last = p;
    if (!hinted && hint) {
      hinted = true;
      setTimeout(() => hint.classList.add("is-hidden"), 1200);
    }
  });
  hero.addEventListener("pointerleave", () => {
    last = null;
  });
  hero.addEventListener("pointerdown", (e) => {
    last = point(e);
  });

  // Pausa quando o hero sai da tela.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(hero);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  resize();

  // Momento de abertura: um "rodo" invisível passa uma vez pelo meio do hero.
  function intro() {
    const rect = hero.getBoundingClientRect();
    const t0 = performance.now(),
      dur = 1500;
    let prev = null;
    (function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      const x = rect.width * (-0.05 + e * 1.1);
      const y = rect.height * (0.5 + Math.sin(e * Math.PI * 2) * 0.12);
      if (prev) wipe(prev.x, prev.y, x, y, Math.min(rect.height * 0.32, 180));
      prev = { x, y };
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }
  document.documentElement.classList.add("js");
  requestAnimationFrame(() => {
    hero.classList.add("is-ready");
    if (!reduce) setTimeout(intro, 250);
  });
})();
