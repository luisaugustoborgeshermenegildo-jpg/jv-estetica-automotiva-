/* JV Sistema: gestão da JV (separado do site). Usa a mesma API do painel.
   setStatus, showLogin e dashboardStatus ficam globais: inspection.js e growth.js usam. */
const dashboardStatus = document.querySelector("#dashboardStatus");

function setStatus(element, text, success = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle("success", success);
}

function showLogin() {
  document.querySelector("#shell").hidden = true;
  document.querySelector("#login").hidden = false;
  document.querySelector("#password").focus();
}

(() => {
  const $ = (s) => document.querySelector(s);
  const STAGES = ["pending", "received", "washing", "ready", "delivered"];
  const STAGE_LABEL = {
    pending: "Agendado",
    confirmed: "Agendado",
    received: "Recebido",
    washing: "Em lavagem",
    ready: "Pronto para retirar",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  const NEXT_ACTION = {
    received: "Marcar como recebido",
    washing: "Começar lavagem",
    ready: "Marcar como pronto",
    delivered: "Marcar como entregue",
  };
  const PAGES = {
    visao: ["01 / Visão geral", "Visão geral", ""],
    agenda: [
      "02 / Agenda",
      "Agenda",
      "Atendimentos do dia escolhido, com as etapas de cada veículo.",
    ],
    os: [
      "03 / Ordens de serviço",
      "Ordens de serviço",
      "Veículos no estúdio: etapas, vistoria e fotos.",
    ],
    clientes: [
      "04 / Clientes",
      "Clientes",
      "Quem já agendou com a JV, com o histórico de cada um.",
    ],
    crescimento: [
      "05 / Crescimento",
      "Orçamentos e pátio",
      "Orçamentos por veículo, carros no pátio, estoque e vendas.",
    ],
  };
  let bookings = [];
  let day = localToday();

  function localToday() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
  }
  const status = (b) => (b.status === "confirmed" ? "pending" : b.status);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const capital = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const pad = (n) => String(n).padStart(2, "0");
  const longDate = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  const whatsappOf = (phone) => {
    const d = phone.replace(/\D/g, "");
    return d.length >= 10 ? (d.startsWith("55") ? d : `55${d}`) : "";
  };

  /* ---------- Entrada ---------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    setStatus($("#loginStatus"), "Entrando…");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: $("#password").value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.error || "Não foi possível entrar.");
      $("#password").value = "";
      setStatus($("#loginStatus"), "");
      openShell();
    } catch (error) {
      setStatus($("#loginStatus"), error.message);
    } finally {
      button.disabled = false;
    }
  });
  $("#logout").addEventListener("click", async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
    showLogin();
  });

  async function openShell() {
    $("#login").hidden = true;
    $("#shell").hidden = false;
    await loadBookings();
    route();
  }

  /* ---------- Menu e telas ---------- */
  function route() {
    const page = PAGES[location.hash.slice(1)]
      ? location.hash.slice(1)
      : "visao";
    document
      .querySelectorAll(".page")
      .forEach((p) => (p.hidden = p.dataset.view !== page));
    document
      .querySelectorAll(".sidebar [data-page]")
      .forEach((a) =>
        a.dataset.page === page
          ? a.setAttribute("aria-current", "page")
          : a.removeAttribute("aria-current"),
      );
    const [kicker, title, sub] = PAGES[page];
    $("#kicker").textContent = kicker;
    $("#crumb").textContent = title;
    $("#pageTitle").textContent = page === "visao" ? greeting() : title;
    $("#pageSub").textContent = page === "visao" ? capital(longDate(localToday())) : sub;
    closeMenu();
    if (page === "crescimento") window.jvGrowthLoad?.();
    render();
  }
  window.addEventListener("hashchange", route);

  function greeting() {
    const h = Number(
      new Intl.DateTimeFormat("pt-BR", {
        hour: "numeric",
        hour12: false,
        timeZone: "America/Sao_Paulo",
      }).format(new Date()),
    );
    return `${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}, João`;
  }

  const sidebar = $("#sidebar");
  function closeMenu() {
    sidebar.classList.remove("is-open");
    $("#scrim").hidden = true;
    $("#menuBtn").setAttribute("aria-expanded", "false");
  }
  $("#menuBtn").addEventListener("click", () => {
    sidebar.classList.add("is-open");
    $("#scrim").hidden = false;
    $("#menuBtn").setAttribute("aria-expanded", "true");
  });
  $("#scrim").addEventListener("click", closeMenu);

  /* ---------- Dados ---------- */
  async function loadBookings() {
    try {
      const response = await fetch("/api/admin/bookings", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) return showLogin();
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível carregar a agenda.");
      bookings = result.bookings;
      setStatus(dashboardStatus, "");
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }

  function render() {
    const today = localToday();
    const active = bookings.filter((b) => status(b) !== "cancelled");
    const todays = active.filter((b) => b.date === today);
    const inShop = active.filter((b) =>
      ["received", "washing", "ready"].includes(status(b)),
    );
    $("#countToday").textContent = todays.length;
    $("#countOs").textContent = inShop.length;
    $("#todayLabel").textContent = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    $("#kpiToday").textContent = pad(todays.length);
    $("#kpiWashing").textContent = pad(
      active.filter((b) => status(b) === "washing").length,
    );
    $("#kpiReady").textContent = pad(
      active.filter((b) => status(b) === "ready").length,
    );
    $("#kpiDelivered").textContent = pad(
      todays.filter((b) => status(b) === "delivered").length,
    );

    fillList(
      $("#todayList"),
      todays,
      "Nenhum veículo agendado para hoje.",
      true,
    );

    const rhythm = [
      [
        "Agendados",
        todays.filter((b) => status(b) === "pending").length,
        "r-pending",
      ],
      [
        "Recebidos",
        active.filter((b) => status(b) === "received").length,
        "r-received",
      ],
      [
        "Em lavagem",
        active.filter((b) => status(b) === "washing").length,
        "r-washing",
      ],
      [
        "Prontos",
        active.filter((b) => status(b) === "ready").length,
        "r-ready",
      ],
    ];
    const total = rhythm.reduce((s, r) => s + r[1], 0);
    $("#rhythmBar").replaceChildren(
      ...rhythm.map(([, n, cls]) => {
        const seg = el("i", cls);
        seg.style.setProperty("--w", total ? n / total : 0.25);
        return seg;
      }),
    );
    $("#rhythmList").replaceChildren(
      ...rhythm.map(([label, n, cls]) => {
        const li = el("li", cls);
        li.append(el("span", "", label), el("b", "", pad(n)));
        return li;
      }),
    );

    $("#dayPick").value = day;
    fillList(
      $("#agendaList"),
      active
        .filter((b) => b.date === day)
        .concat(
          bookings.filter((b) => b.date === day && status(b) === "cancelled"),
        ),
      `Nenhum atendimento em ${longDate(day)}.`,
    );
    fillList($("#osList"), inShop, "Nenhum veículo no estúdio agora.");
    renderClients();
  }

  /* ---------- Cartão de atendimento ---------- */
  function fillList(list, items, emptyText, compact = false) {
    list.replaceChildren();
    if (!items.length) {
      const empty = el("div", "empty");
      empty.append(
        el("strong", "", "Nenhum resultado encontrado"),
        el("span", "", emptyText),
      );
      list.append(empty);
      return;
    }
    items
      .slice()
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .forEach((b) => list.append(compact ? compactCard(b) : fullCard(b)));
  }

  function compactCard(b) {
    const card = el("a", "row-card row-link");
    card.href = "#agenda";
    card.addEventListener("click", () => (day = b.date));
    const head = el("div", "row-head");
    head.append(
      el("strong", "", `${b.time} · ${b.name}`),
      el("span", `pill pill-${status(b)}`, STAGE_LABEL[status(b)]),
    );
    card.append(head, el("small", "", `${b.motorcycle} · ${b.service}`));
    return card;
  }

  function fullCard(b) {
    const card = el("article", "row-card");
    const head = el("div", "row-head");
    head.append(
      el("strong", "", `${b.time} · ${b.name}`),
      el("span", "protocol", `#${b.id}`),
    );
    card.append(head);
    card.append(el("p", "", `${b.motorcycle} · ${b.engine}`));
    card.append(el("small", "", `${b.service} · ${longDate(b.date)}`));
    if (b.notes) card.append(el("p", "muted", `Obs.: ${b.notes}`));
    card.append(stageControls(b));
    if (
      ["received", "washing", "ready", "delivered"].includes(status(b)) &&
      typeof inspectionPanel === "function"
    )
      card.append(inspectionPanel(b));
    return card;
  }

  function stageControls(b) {
    const box = el("div", "stage-box");
    const current = status(b);
    const position = STAGES.indexOf(current);
    const track = el("ol", "stage-track");
    STAGES.forEach((stage, i) => {
      const li = el(
        "li",
        i < position ? "done" : i === position ? "now" : "",
        STAGE_LABEL[stage],
      );
      if (i === position) li.setAttribute("aria-current", "step");
      track.append(li);
    });
    box.append(track);
    if (current === "cancelled")
      box.append(el("p", "stage-cancelled", "Agendamento cancelado."));
    const actions = el("div", "stage-actions");
    const next = position >= 0 ? STAGES[position + 1] : null;
    if (next)
      actions.append(stageButton(b, next, NEXT_ACTION[next], "btn-primary"));
    const wa = whatsappOf(b.phone);
    if (current === "ready" && wa) {
      const text = `Olá, ${b.name.split(" ")[0]}! Sua ${b.motorcycle} está pronta para retirada na JV Estética Automotiva. Protocolo #${b.id}.`;
      actions.append(
        link(
          `https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
          "Avisar que está pronto",
          "btn-whats",
        ),
      );
    } else if (wa) {
      actions.append(link(`https://wa.me/${wa}`, "WhatsApp", "btn-ghost"));
    }
    if (current === "pending")
      actions.append(stageButton(b, "cancelled", "Cancelar", "btn-ghost"));
    if (current === "cancelled")
      actions.append(stageButton(b, "pending", "Reativar", "btn-ghost"));
    box.append(actions);
    return box;
  }
  function link(href, text, className) {
    const a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }
  function stageButton(b, next, label, className) {
    const button = el("button", className, label);
    button.type = "button";
    button.addEventListener("click", async () => {
      if (
        next === "cancelled" &&
        !confirm(
          `Cancelar o agendamento #${b.id}? O horário volta a ficar livre.`,
        )
      )
        return;
      button.disabled = true;
      try {
        const response = await fetch("/api/admin/bookings/status", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.id, status: next }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) return showLogin();
        if (!response.ok)
          throw new Error(result.error || "Não foi possível salvar a etapa.");
        setStatus(dashboardStatus, `#${b.id}: ${STAGE_LABEL[next]}.`, true);
        await loadBookings();
        render();
      } catch (error) {
        setStatus(dashboardStatus, error.message);
        button.disabled = false;
      }
    });
    return button;
  }

  /* ---------- Clientes ---------- */
  function renderClients() {
    const term = $("#clientSearch").value.trim().toLowerCase();
    const map = new Map();
    bookings.forEach((b) => {
      const key = b.phone.replace(/\D/g, "") || b.name.toLowerCase();
      const c = map.get(key) ?? {
        name: b.name,
        phone: b.phone,
        vehicles: new Set(),
        visits: 0,
        last: "",
      };
      c.vehicles.add(b.motorcycle);
      if (status(b) !== "cancelled") c.visits += 1;
      if (b.date > c.last) {
        c.last = b.date;
        c.name = b.name;
      }
      map.set(key, c);
    });
    const clients = [...map.values()]
      .filter(
        (c) =>
          !term ||
          `${c.name} ${c.phone} ${[...c.vehicles].join(" ")}`
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => b.last.localeCompare(a.last));
    const list = $("#clientList");
    list.replaceChildren();
    if (!clients.length) {
      const empty = el("div", "empty");
      empty.append(
        el("strong", "", "Nenhum cliente encontrado"),
        el(
          "span",
          "",
          "Os clientes aparecem aqui depois do primeiro agendamento.",
        ),
      );
      return list.append(empty);
    }
    clients.forEach((c) => {
      const card = el("article", "row-card");
      const head = el("div", "row-head");
      head.append(
        el("strong", "", c.name),
        el(
          "span",
          "pill",
          `${c.visits} ${c.visits === 1 ? "visita" : "visitas"}`,
        ),
      );
      card.append(
        head,
        el(
          "small",
          "",
          `${[...c.vehicles].join(", ")} · última vez em ${longDate(c.last)}`,
        ),
      );
      const wa = whatsappOf(c.phone);
      if (wa) {
        const actions = el("div", "stage-actions");
        actions.append(
          link(`https://wa.me/${wa}`, `WhatsApp ${c.phone}`, "btn-ghost"),
        );
        card.append(actions);
      }
      list.append(card);
    });
  }
  $("#clientSearch").addEventListener("input", renderClients);

  /* ---------- Agenda: troca de dia ---------- */
  const shift = (n) => {
    const d = new Date(`${day}T12:00:00`);
    d.setDate(d.getDate() + n);
    day = d.toISOString().slice(0, 10);
    render();
  };
  $("#dayPrev").addEventListener("click", () => shift(-1));
  $("#dayNext").addEventListener("click", () => shift(1));
  $("#dayToday").addEventListener("click", () => {
    day = localToday();
    render();
  });
  $("#dayPick").addEventListener("change", (e) => {
    if (e.target.value) day = e.target.value;
    render();
  });

  /* ---------- Link de agendamento ---------- */
  $("#copyLink").addEventListener("click", async () => {
    const url = `${location.origin}/monochrome#agendar`;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(dashboardStatus, "Link de agendamento copiado.", true);
    } catch {
      setStatus(dashboardStatus, url);
    }
  });

  /* ---------- Início ---------- */
  (async () => {
    try {
      const response = await fetch("/api/admin/bookings", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.ok) {
        bookings = (await response.json()).bookings;
        $("#login").hidden = true;
        $("#shell").hidden = false;
        route();
      } else showLogin();
    } catch {
      showLogin();
    }
  })();
})();
