// Modo aplicativo da versão Monochrome: abas embaixo, agendamento em 3 telas
// e "Meus horários". Liga quando o site é aberto pelo ícone instalado
// (classe is-app, posta por app.js) ou pelo link de demonstração ?app=1.
(() => {
  const html = document.documentElement;
  const demo = new URLSearchParams(location.search).get("app") === "1";
  if (demo) html.classList.add("is-app");
  if (!html.classList.contains("is-app")) return;

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
    const { id, service, date, time, vehicle } = e.detail;
    try {
      const list = loadMine().filter((b) => b.id !== id);
      list.unshift({ id, service, date, time, vehicle });
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
  function renderMine() {
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
        code.textContent = `Protocolo ${b.id}${b.date < today ? " · já passou" : ""}`;
        li.append(when, what, code);
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
