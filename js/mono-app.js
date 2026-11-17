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
  // Regras do agendamento online definidas no JV Sistema (cancelamento pelo app).
  let bookingConfig = { onlineCancel: false };
  fetch("/api/booking-config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (!cfg) return;
      bookingConfig = cfg;
      if (html.dataset.tab === "meus") renderMine(false);
    })
    .catch(() => {});

  async function cancelBooking(b, button) {
    if (!confirm(`Cancelar o agendamento de ${b.service} (protocolo ${b.id})?`)) return;
    button.disabled = true;
    try {
      const response = await fetch("/api/os/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: b.access }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Não foi possível cancelar.");
      const list = loadMine();
      const item = list.find((x) => x.id === b.id);
      if (item) item.status = "cancelled";
      try {
        localStorage.setItem(MINE_KEY, JSON.stringify(list));
      } catch {
        /* armazenamento bloqueado */
      }
      renderMine(false);
    } catch (error) {
      button.disabled = false;
      button.textContent = error.message;
    }
  }
  let refreshing = false;

  // Busca a etapa atual de cada agendamento que tem código e guarda junto.
  async function refreshStages() {
    if (refreshing) return;
    refreshing = true;
    const list = loadMine();
    // Até 30 dias depois: o cliente ainda vê a vistoria e as fotos de entrega.
    const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const open = list.filter(
      (b) =>
        ACCESS.test(b.access || "") &&
        b.status !== "cancelled" &&
        b.date >= cutoff,
    );
    let changed = false;
    let viewChanged = false;
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
          if (JSON.stringify(orders.get(b.id)) !== JSON.stringify(order)) {
            orders.set(b.id, order);
            viewChanged = true;
          }
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
    if (changed) {
      try {
        localStorage.setItem(MINE_KEY, JSON.stringify(list));
      } catch {
        /* armazenamento bloqueado */
      }
    }
    if ((changed || viewChanged) && html.dataset.tab === "meus")
      renderMine(false);
  }

  /* ---------- Vistoria no app do cliente ---------- */
  const orders = new Map(); // id → OS vinda da API (só na memória)
  const ANGLE_LABEL = {
    frente: "Frente",
    traseira: "Traseira",
    "lateral-esquerda": "Lateral esquerda",
    "lateral-direita": "Lateral direita",
    painel: "Painel",
    tanque: "Tanque",
    extra: "Detalhe",
  };

  async function osPost(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Não foi possível carregar.");
    }
    return response;
  }

  function photoList(b, photos, title) {
    const box = document.createElement("div");
    box.className = "mine-photos";
    const h = document.createElement("p");
    h.className = "mine-sub";
    h.textContent = title;
    const grid = document.createElement("div");
    grid.className = "mine-photo-grid";
    photos.forEach((photo) => {
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.alt = ANGLE_LABEL[photo.angle] || "Foto";
      const cap = document.createElement("figcaption");
      cap.textContent = ANGLE_LABEL[photo.angle] || "Foto";
      figure.append(img, cap);
      grid.append(figure);
      osPost("/api/os/photo", { code: b.access, photoId: photo.id })
        .then((r) => r.blob())
        .then((blob) => {
          img.src = URL.createObjectURL(blob);
        })
        .catch(() => figure.classList.add("is-error"));
    });
    box.append(h, grid);
    return box;
  }

  function inspectionView(b, order) {
    const details = document.createElement("details");
    details.className = "mine-vistoria";
    const summary = document.createElement("summary");
    const insp = order.inspection;
    summary.textContent = insp?.confirmedAt
      ? "Vistoria da moto · confirmada"
      : insp
        ? "Vistoria da moto · confira e confirme"
        : "Fotos da moto";
    details.append(summary);
    let built = false;
    details.addEventListener("toggle", () => {
      if (!details.open || built) return;
      built = true;
      const arrival = order.photos.filter((p) => p.kind === "arrival");
      const delivery = order.photos.filter((p) => p.kind === "delivery");
      if (arrival.length)
        details.append(photoList(b, arrival, "Como a moto chegou"));
      if (insp) {
        const damages = insp.items.filter((i) => i.damage);
        const p = document.createElement("p");
        p.className = "mine-sub";
        p.textContent = damages.length
          ? "Avarias anotadas na chegada"
          : "Nenhuma avaria anotada na chegada.";
        details.append(p);
        if (damages.length) {
          const ul = document.createElement("ul");
          ul.className = "mine-damages";
          damages.forEach((d) => {
            const li = document.createElement("li");
            li.textContent = d.note ? `${d.item}: ${d.note}` : d.item;
            ul.append(li);
          });
          details.append(ul);
        }
        if (insp.notes) {
          const n = document.createElement("p");
          n.className = "mine-notes";
          n.textContent = insp.notes;
          details.append(n);
        }
        if (insp.confirmedAt) {
          const ok = document.createElement("p");
          ok.className = "mine-confirmed";
          ok.textContent = `Você confirmou em ${new Date(insp.confirmedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.`;
          details.append(ok);
        } else {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn-accent mine-confirm";
          btn.textContent = "Confirmo o estado da moto";
          btn.addEventListener("click", async () => {
            btn.disabled = true;
            try {
              const r = await osPost("/api/os/confirm", { code: b.access });
              const data = await r.json();
              orders.set(b.id, { ...order, ...data });
              renderMine(false);
            } catch (error) {
              btn.disabled = false;
              btn.textContent = error.message;
            }
          });
          details.append(btn);
        }
      }
      if (delivery.length)
        details.append(photoList(b, delivery, "Como a moto foi entregue"));
    });
    return details;
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
        if (
          bookingConfig.onlineCancel &&
          ACCESS.test(b.access || "") &&
          ["pending", "confirmed"].includes(b.status) &&
          b.date >= today
        ) {
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.className = "mine-cancel";
          cancel.textContent = "Cancelar agendamento";
          cancel.addEventListener("click", () => cancelBooking(b, cancel));
          li.append(cancel);
        }
        const order = orders.get(b.id);
        if (order && (order.inspection || order.photos?.length))
          li.append(inspectionView(b, order));
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
