// Modo aplicativo da versão Monochrome: abas embaixo, agendamento em 3 telas
// e "Meus horários". Liga quando o site é aberto pelo ícone instalado
// (classe is-app, posta por app.js) ou pelo link de demonstração ?app=1.
(() => {
  const html = document.documentElement;
  const demo = new URLSearchParams(location.search).get("app") === "1";
  if (demo) html.classList.add("is-app");
  if (!html.classList.contains("is-app")) return;

  /* ---------- Abertura do app (uma vez por sessão) ---------- */
  let seen = false;
  try {
    seen = sessionStorage.getItem("jv:abertura") === "1";
    sessionStorage.setItem("jv:abertura", "1");
  } catch {
    /* sem armazenamento: mostra a abertura */
  }
  if (!seen) {
    const splash = document.createElement("div");
    splash.className = "splash";
    splash.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.src = "assets/moto.webp";
    img.alt = "";
    const word = document.createElement("p");
    word.className = "splash-word";
    let i = 0;
    for (const [text, accent] of [
      ["JV", false],
      ["Estética", true],
    ]) {
      const part = document.createElement(accent ? "em" : "span");
      for (const char of text) {
        const ch = document.createElement("span");
        ch.textContent = char;
        ch.style.setProperty("--i", i++);
        part.append(ch);
      }
      word.append(part, " ");
    }
    const tag = document.createElement("p");
    tag.className = "splash-tag";
    tag.textContent = "Agende a lavagem da sua moto ou carro";
    splash.append(img, word, tag);
    document.body.append(splash);
    setTimeout(() => splash.classList.add("is-out"), 1700);
    setTimeout(() => splash.remove(), 2300);
  }

  const MINE_KEY = "jv:agendamentos";
  const form = document.getElementById("bookingForm");
  const feedback = document.getElementById("formFeedback");
  const steps = [...form.querySelectorAll(".wiz-step")];
  const back = document.getElementById("wizBack");
  const next = document.getElementById("wizNext");
  const again = document.getElementById("wizAgain");
  const TITLES = ["Escolha o serviço", "Escolha o horário", "Seus dados"];
  let step = 1;

  /* ---------- Abas ---------- */
  const tabs = [...document.querySelectorAll(".tabbar [data-go]")];
  function go(tab) {
    html.dataset.tab = tab;
    tabs.forEach((t) =>
      t.dataset.go === tab
        ? t.setAttribute("aria-current", "page")
        : t.removeAttribute("aria-current"),
    );
    if (tab === "meus") renderMine();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-go]");
    if (target) go(target.dataset.go);
  });
  // "Agendar este" na lista de serviços: troca para a aba Agendar antes de
  // script.js marcar o serviço (fase de captura, roda primeiro).
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest(".pick")) {
        go("agendar");
        show(1);
      }
    },
    true,
  );
  // Âncoras antigas (#agendar, #servicos...) viram troca de aba.
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (["agendar", "servicos", "duvidas", "meus"].includes(id)) {
      e.preventDefault();
      go(id === "duvidas" ? "servicos" : id);
    }
  });

  /* ---------- Agendamento em 3 telas ---------- */
  function show(n) {
    step = n;
    form.dataset.step = String(n);
    steps.forEach((s) => (s.hidden = Number(s.dataset.step) !== n));
    document.getElementById("wizNow").textContent = String(Math.min(n, 3));
    document.getElementById("wizTitle").textContent =
      n === 4 ? "Agendamento enviado" : TITLES[n - 1];
    document
      .getElementById("wizFill")
      .style.setProperty("--p", n >= 3 ? 1 : n / 3);
    back.hidden = n === 1 || n === 4;
    next.hidden = n >= 3;
    again.hidden = n !== 4;
    if (n !== 4 && !feedback.classList.contains("success"))
      feedback.className = "form-feedback";
  }

  function problem(n) {
    const el = form.elements;
    if (n === 1) {
      if (!el.service.value) return "Escolha um serviço.";
      if (!el.motorcycle.value.trim())
        return mark(el.motorcycle, "Informe o modelo do veículo.");
      if (!el.engine.value)
        return mark(el.engine, "Escolha a cilindrada ou o porte.");
    }
    if (n === 2) {
      if (!el.date.value) return "Escolha um dia.";
      if (!el.time.value) return "Escolha um dos horários livres.";
    }
    return "";
  }
  function mark(field, text) {
    field.setAttribute("aria-invalid", "true");
    field.focus();
    return text;
  }
  function say(text) {
    feedback.className = "form-feedback visible error";
    feedback.textContent = text;
  }

  next.addEventListener("click", () => {
    const text = problem(step);
    if (text) return say(text);
    show(step + 1);
  });
  back.addEventListener("click", () => show(step - 1));
  again.addEventListener("click", () => {
    feedback.className = "form-feedback";
    feedback.textContent = "";
    show(1);
  });

  // Agendamento salvo (script.js): guarda em "Meus horários" e mostra a confirmação.
  document.addEventListener("jv:booked", (e) => {
    const { id, access, service, date, time, vehicle } = e.detail;
    try {
      const list = loadMine().filter((b) => b.id !== id);
      list.unshift({
        id,
        access,
        service,
        date,
        time,
        vehicle,
        status: "pending",
      });
      localStorage.setItem(MINE_KEY, JSON.stringify(list.slice(0, 20)));
    } catch {
      /* armazenamento bloqueado: segue sem guardar */
    }
    show(4);
  });

  /* ---------- Meus horários ---------- */
  function loadMine() {
    try {
      const list = JSON.parse(localStorage.getItem(MINE_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  // Etapas da ordem de serviço, vindas do painel da JV.
  const STAGES = ["pending", "received", "washing", "ready", "delivered"];
  const STAGE_LABEL = {
    pending: "Agendado",
    received: "Recebido",
    washing: "Em lavagem",
    ready: "Pronto",
    delivered: "Entregue",
  };
  const ACCESS = /^[A-Za-z0-9_-]{24}$/;
  let refreshing = false;

  // Busca a etapa atual de cada agendamento que tem código e guarda junto.
  async function refreshStages() {
    if (refreshing) return;
    refreshing = true;
    const list = loadMine();
    const open = list.filter(
      (b) =>
        ACCESS.test(b.access || "") &&
        !["delivered", "cancelled"].includes(b.status),
    );
    let changed = false;
    await Promise.all(
      open.map(async (b) => {
        try {
          const response = await fetch("/api/os", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: b.access }),
            cache: "no-store",
          });
          if (!response.ok) return;
          const { order } = await response.json();
          if (order?.status && order.status !== b.status) {
            b.status = order.status;
            changed = true;
          }
        } catch {
          /* sem internet: mantém a última etapa conhecida */
        }
      }),
    );
    refreshing = false;
    if (!changed) return;
    try {
      localStorage.setItem(MINE_KEY, JSON.stringify(list));
    } catch {
      /* armazenamento bloqueado */
    }
    if (html.dataset.tab === "meus") renderMine(false);
  }

  function stageTrack(status) {
    const current = status === "confirmed" ? "pending" : status;
    if (current === "cancelled") {
      const p = document.createElement("p");
      p.className = "mine-cancelled";
      p.textContent = "Cancelado";
      return p;
    }
    const position = STAGES.indexOf(current);
    const ol = document.createElement("ol");
    ol.className = "mine-stages";
    ol.setAttribute(
      "aria-label",
      `Etapa: ${STAGE_LABEL[current] || "Agendado"}`,
    );
    STAGES.forEach((stage, index) => {
      const li = document.createElement("li");
      li.textContent = STAGE_LABEL[stage];
      if (index < position) li.className = "done";
      if (index === position) {
        li.className = "now";
        li.setAttribute("aria-current", "step");
      }
      ol.append(li);
    });
    return ol;
  }

  function renderMine(fetchStages = true) {
    if (fetchStages) refreshStages();
    const ul = document.getElementById("mineList");
    const today = new Date().toISOString().slice(0, 10);
    const list = loadMine().sort(
      (a, b) =>
        (a.date < today) - (b.date < today) ||
        (a.date + a.time).localeCompare(b.date + b.time),
    );
    ul.replaceChildren(
      ...list.map((b) => {
        const li = document.createElement("li");
        if (b.date < today) li.className = "is-past";
        const when = document.createElement("p");
        when.className = "mine-when";
        when.textContent = `${new Date(`${b.date}T12:00:00`).toLocaleDateString(
          "pt-BR",
          {
            weekday: "short",
            day: "2-digit",
            month: "short",
          },
        )} às ${b.time}`;
        const what = document.createElement("p");
        what.textContent = `${b.service} · ${b.vehicle === "carro" ? "Carro" : "Moto"}`;
        const code = document.createElement("small");
        const active =
          b.status && !["delivered", "cancelled"].includes(b.status);
        const past = b.date < today && !active;
        if (!past) li.classList.remove("is-past");
        code.textContent = `Protocolo ${b.id}${past ? " · já passou" : ""}`;
        li.append(when, what);
        if (b.status) li.append(stageTrack(b.status));
        li.append(code);
        return li;
      }),
    );
    document.getElementById("mineEmpty").hidden = list.length > 0;
  }

  show(1);
  go(
    location.hash === "#meus"
      ? "meus"
      : location.hash === "#servicos"
        ? "servicos"
        : "agendar",
  );
})();
