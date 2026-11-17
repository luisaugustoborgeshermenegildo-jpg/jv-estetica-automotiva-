/* JV Sistema: agenda por Dia/Semana/Mês, Horários (expediente) e Novo agendamento.
   Usa window.jv (sistema.js), setStatus, showLogin e dashboardStatus. */
(() => {
  const $ = (s) => document.querySelector(s);
  const WEEKDAYS = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
  ];
  const HOURS = Array.from(
    { length: 17 },
    (_, i) => `${String(i + 6).padStart(2, "0")}:00`,
  ); // 06:00 a 22:00
  const ENGINES = {
    moto: ["Até 160cc", "160cc a 400cc", "Acima de 400cc"],
    carro: ["Carro hatch ou sedã", "Carro SUV ou picape"],
  };
  const SERVICES = {
    moto: [
      "Lavagem completa",
      "Lavagem detalhada",
      "Lavagem premium",
      "Limpeza e lubrificação da corrente",
      "Revitalização de plásticos",
      "Clareamento do bacalhau",
      "Clareamento do motor",
    ],
    carro: ["Lavagem completa", "Lavagem detalhada", "Lavagem premium"],
  };
  let range = "day";
  let schedule = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const iso = (d) => d.toISOString().slice(0, 10);
  const at = (value) => new Date(`${value}T12:00:00Z`);
  const addDays = (value, n) => {
    const d = at(value);
    d.setUTCDate(d.getUTCDate() + n);
    return iso(d);
  };
  const fmt = (value, opts) =>
    at(value).toLocaleDateString("pt-BR", { timeZone: "UTC", ...opts });
  const active = () =>
    window.jv.bookings.filter((b) => window.jv.status(b) !== "cancelled");

  async function api(path, body) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin();
      throw new Error("Entre novamente.");
    }
    if (!response.ok)
      throw new Error(data.error || "Não foi possível concluir.");
    return data;
  }

  /* ---------- Agenda: Dia / Semana / Mês ---------- */
  document.querySelectorAll(".view-tabs [data-range]").forEach((b) =>
    b.addEventListener("click", () => {
      range = b.dataset.range;
      document
        .querySelectorAll(".view-tabs [data-range]")
        .forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      window.jvAgendaRender();
    }),
  );
  // As setas andam 1 dia, 1 semana ou 1 mês conforme a visão.
  const step = (dir) => {
    const day = window.jv.day;
    if (range === "day") return window.jv.setDay(addDays(day, dir));
    if (range === "week") return window.jv.setDay(addDays(day, 7 * dir));
    const d = at(day);
    d.setUTCMonth(d.getUTCMonth() + dir, 1);
    window.jv.setDay(iso(d));
  };
  $("#dayPrev").addEventListener(
    "click",
    (e) => {
      if (range === "day") return;
      e.stopImmediatePropagation();
      step(-1);
    },
    true,
  );
  $("#dayNext").addEventListener(
    "click",
    (e) => {
      if (range === "day") return;
      e.stopImmediatePropagation();
      step(1);
    },
    true,
  );

  window.jvAgendaRender = () => {
    const day = window.jv.day;
    const list = active();
    $("#agendaList").hidden = range !== "day";
    $("#weekGrid").hidden = range !== "week";
    $("#monthGrid").hidden = range !== "month";
    if (range === "day") {
      const n = list.filter((b) => b.date === day).length;
      $("#rangeTitle").textContent = fmt(day, {
        day: "numeric",
        month: "long",
      });
      $("#rangeCount").textContent =
        `${n} ${n === 1 ? "atendimento" : "atendimentos"} neste dia`;
      if (!n) addEmptyAction($("#agendaList"));
    }
    if (range === "week") renderWeek(day, list);
    if (range === "month") renderMonth(day, list);
    renderToday(list);
    fillClientOptions();
  };

  function addEmptyAction(container) {
    const empty = container.querySelector(".empty");
    if (!empty || empty.querySelector("button")) return;
    empty.querySelector("strong").textContent = "Sua agenda está livre";
    const b = el("button", "btn-primary", "+ Novo agendamento");
    b.type = "button";
    b.dataset.newBooking = "";
    empty.append(b);
  }

  function renderWeek(day, list) {
    const start = addDays(day, -at(day).getUTCDay()); // começa no domingo
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const total = list.filter(
      (b) => b.date >= days[0] && b.date <= days[6],
    ).length;
    $("#rangeTitle").textContent =
      `${fmt(days[0], { day: "numeric", month: "short" })} a ${fmt(days[6], { day: "numeric", month: "short" })}`;
    $("#rangeCount").textContent =
      `${total} ${total === 1 ? "atendimento" : "atendimentos"} na semana`;
    $("#weekGrid").replaceChildren(
      ...days.map((d) => {
        const col = el(
          "div",
          `week-col${d === window.jv.localToday() ? " is-today" : ""}`,
        );
        const head = el("button", "week-head");
        head.type = "button";
        head.append(
          el("small", "", fmt(d, { weekday: "short" }).replace(".", "")),
          el("b", "", fmt(d, { day: "2-digit" })),
        );
        head.addEventListener("click", () => openDay(d));
        col.append(head);
        const items = list
          .filter((b) => b.date === d)
          .sort((a, b) => a.time.localeCompare(b.time));
        if (!items.length) col.append(el("p", "week-empty", "Livre"));
        items.forEach((b) => {
          const item = el("button", `week-item pill-${window.jv.status(b)}`);
          item.type = "button";
          item.append(
            el("b", "", b.time),
            el("span", "", b.name.split(" ")[0]),
          );
          item.title = `${b.time} · ${b.name} · ${b.motorcycle} · ${b.service}`;
          item.addEventListener("click", () => openDay(d));
          col.append(item);
        });
        return col;
      }),
    );
  }

  function renderMonth(day, list) {
    const first = `${day.slice(0, 7)}-01`;
    const start = addDays(first, -at(first).getUTCDay());
    const month = day.slice(0, 7);
    const total = list.filter((b) => b.date.startsWith(month)).length;
    $("#rangeTitle").textContent = fmt(first, {
      month: "long",
      year: "numeric",
    });
    $("#rangeCount").textContent =
      `${total} ${total === 1 ? "atendimento" : "atendimentos"} no mês`;
    const cells = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((w) =>
      el("span", "month-wd", w),
    );
    for (let i = 0; i < 42; i++) {
      const d = addDays(start, i);
      const n = list.filter((b) => b.date === d).length;
      const cell = el(
        "button",
        `month-day${d.startsWith(month) ? "" : " is-out"}${d === window.jv.localToday() ? " is-today" : ""}${n ? " has" : ""}`,
      );
      cell.type = "button";
      cell.append(el("b", "", String(at(d).getUTCDate())));
      if (n)
        cell.append(el("span", "", `${n} ${n === 1 ? "agend." : "agend."}`));
      cell.setAttribute(
        "aria-label",
        `${fmt(d, { day: "numeric", month: "long" })}: ${n} agendamentos`,
      );
      cell.addEventListener("click", () => openDay(d));
      cells.push(cell);
    }
    $("#monthGrid").replaceChildren(...cells);
  }

  function openDay(d) {
    range = "day";
    document
      .querySelectorAll(".view-tabs [data-range]")
      .forEach((x) =>
        x.setAttribute("aria-selected", String(x.dataset.range === "day")),
      );
    window.jv.setDay(d);
  }

  /* ---------- Horários ---------- */
  function hourSelect(value, onChange) {
    const s = document.createElement("select");
    HOURS.forEach((h) => {
      const o = document.createElement("option");
      o.value = h;
      o.textContent = h;
      s.append(o);
    });
    s.value = value;
    s.addEventListener("change", () => onChange(s.value));
    return s;
  }
  function toggle(checked, label, onChange) {
    const wrap = el("label", "switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => onChange(input.checked));
    wrap.append(input, el("span"));
    return wrap;
  }
  const slotsOf = (day) => {
    if (!day.on) return 0;
    let n = Number(day.close.slice(0, 2)) - Number(day.open.slice(0, 2));
    if (day.lunch)
      n -=
        Number(day.lunchEnd.slice(0, 2)) - Number(day.lunchStart.slice(0, 2));
    return Math.max(0, n);
  };

  function renderHours() {
    const order = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo
    $("#weekHours").replaceChildren(
      ...order.map((d) => {
        const day = schedule[d];
        const box = el("div", `day-hours${day.on ? "" : " is-off"}`);
        const head = el("div", "day-hours-head");
        head.append(
          el("strong", "", WEEKDAYS[d]),
          toggle(day.on, `${WEEKDAYS[d]} aberto`, (v) => {
            day.on = v;
            renderHours();
          }),
        );
        box.append(head);
        if (day.on) {
          const row = el("div", "hours-row");
          const from = el("label", "", "Das");
          from.append(hourSelect(day.open, (v) => (day.open = v)));
          const to = el("label", "", "Às");
          to.append(hourSelect(day.close, (v) => (day.close = v)));
          row.append(from, to);
          box.append(row);
          const lunch = el("div", "lunch");
          const lunchHead = el("div", "day-hours-head");
          lunchHead.append(
            el("span", "", "Pausa para almoço"),
            toggle(day.lunch, `Almoço ${WEEKDAYS[d]}`, (v) => {
              day.lunch = v;
              renderHours();
            }),
          );
          lunch.append(lunchHead);
          if (day.lunch) {
            const lrow = el("div", "hours-row");
            const ls = el("label", "", "Das");
            ls.append(hourSelect(day.lunchStart, (v) => (day.lunchStart = v)));
            const le = el("label", "", "Às");
            le.append(hourSelect(day.lunchEnd, (v) => (day.lunchEnd = v)));
            lrow.append(ls, le);
            lunch.append(lrow);
          }
          box.append(lunch);
        }
        return box;
      }),
    );
    const today = schedule[at(window.jv.localToday()).getUTCDay()];
    $("#hoursToday").textContent = today.on
      ? `${today.open} às ${today.close}`
      : "Fechado";
    const n = slotsOf(today);
    $("#hoursTodaySub").textContent = today.on
      ? `${n} ${n === 1 ? "horário disponível" : "horários disponíveis"} para atendimento hoje${today.lunch ? `, com almoço das ${today.lunchStart} às ${today.lunchEnd}` : ""}.`
      : "Hoje a JV não abre.";
  }

  $("#saveHours").addEventListener("click", async (e) => {
    e.target.disabled = true;
    try {
      const data = await api("/api/admin/settings", { schedule });
      schedule = structuredClone(data.settings.schedule);
      renderHours();
      setStatus(
        dashboardStatus,
        "Expediente salvo. O site já mostra os novos horários.",
        true,
      );
    } catch (error) {
      setStatus(
        dashboardStatus,
        error.message === "Configuração inválida."
          ? "Revise os horários: o fechamento precisa ser depois da abertura e o almoço dentro do expediente."
          : error.message,
      );
    } finally {
      e.target.disabled = false;
    }
  });

  function renderToday(list) {
    const today = window.jv.localToday();
    const items = list.filter((b) => b.date === today);
    $("#todayCount").textContent = String(items.length).padStart(2, "0");
    $("#todayName").textContent = fmt(today, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    window.jv.fillList(
      $("#todayStudio"),
      items,
      "Quando um veículo for agendado, ele aparece aqui.",
      true,
    );
    addEmptyAction($("#todayStudio"));
  }

  window.jvHoursLoad = async () => {
    try {
      schedule = structuredClone(
        (await api("/api/admin/settings")).settings.schedule,
      );
      renderHours();
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  };

  /* ---------- Clientes conhecidos (orçamento e novo agendamento) ---------- */
  function clients() {
    const map = new Map();
    window.jv.bookings.forEach((b) => {
      const prev = map.get(b.name);
      if (!prev || b.date > prev.date) map.set(b.name, b);
    });
    return map;
  }
  function fillClientOptions() {
    const list = $("#clientOptions");
    const names = [...clients().keys()].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
    if (list.dataset.count === String(names.length)) return;
    list.dataset.count = String(names.length);
    list.replaceChildren(
      ...names.map((n) => {
        const o = document.createElement("option");
        o.value = n;
        return o;
      }),
    );
  }
  // Escolheu um cliente conhecido: preenche WhatsApp, veículo e modelo.
  function autofill(form, nameField, map) {
    form
      .querySelector(`[name="${nameField}"]`)
      .addEventListener("change", (e) => {
        const b = clients().get(e.target.value.trim());
        if (!b) return;
        const phone = form.querySelector('[name="phone"]');
        if (phone && !phone.value) phone.value = b.phone;
        const vehicle = form.querySelector('[name="vehicle"]');
        const isCar = /^Carro/.test(b.engine);
        if (vehicle) {
          vehicle.value = isCar ? "carro" : "moto";
          vehicle.dispatchEvent(new Event("change"));
        }
        const model = form.querySelector(`[name="${map.model}"]`);
        if (model && !model.value) model.value = b.motorcycle;
        const engine = form.querySelector('[name="engine"]');
        if (engine) engine.value = b.engine;
      });
  }
  autofill($("#quoteForm"), "customer", { model: "model" });

  /* ---------- Novo agendamento ---------- */
  const dialog = $("#newBooking");
  const form = $("#newBookingForm");
  const fillOptions = (select, values, placeholder) => {
    select.replaceChildren(
      ...(placeholder
        ? [
            Object.assign(document.createElement("option"), {
              value: "",
              textContent: placeholder,
            }),
          ]
        : []),
      ...values.map((v) =>
        Object.assign(document.createElement("option"), {
          value: v,
          textContent: v,
        }),
      ),
    );
  };
  const setVehicle = () => {
    const v = form.vehicle.value;
    fillOptions(form.engine, ENGINES[v]);
    fillOptions(form.service, SERVICES[v]);
  };
  form.vehicle.addEventListener("change", setVehicle);
  autofill(form, "name", { model: "motorcycle" });

  async function loadSlots() {
    const date = form.date.value;
    fillOptions(form.time, [], "Carregando…");
    if (!date) return fillOptions(form.time, [], "Escolha o dia");
    try {
      const { slots } = await api(
        `/api/availability?date=${encodeURIComponent(date)}`,
      );
      // No sistema o João pode marcar em cima da hora: mostra todos os horários do expediente
      // que ainda têm vaga (a API do sistema ignora só a antecedência mínima).
      const free = slots.filter((s) => s.available).map((s) => s.time);
      const all = slots.map((s) => s.time);
      fillOptions(
        form.time,
        all.length ? all : [],
        all.length ? "Escolha o horário" : "Fechado neste dia",
      );
      [...form.time.options].forEach((o) => {
        if (o.value && !free.includes(o.value))
          o.textContent = `${o.value} (cheio ou passou do limite online)`;
      });
    } catch (error) {
      fillOptions(form.time, [], error.message);
    }
  }
  form.date.addEventListener("change", loadSlots);

  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-new-booking]")) return;
    form.reset();
    setVehicle();
    form.date.value =
      window.jv.day >= window.jv.localToday()
        ? window.jv.day
        : window.jv.localToday();
    form.date.min = window.jv.localToday();
    setStatus($("#newBookingStatus"), "");
    loadSlots();
    dialog.showModal();
    form.name.focus();
  });
  $("#newBookingClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    setStatus($("#newBookingStatus"), "Agendando…");
    try {
      const f = Object.fromEntries(new FormData(form));
      delete f.vehicle;
      const { booking } = await api("/api/admin/bookings/new", f);
      dialog.close();
      setStatus(
        dashboardStatus,
        `Agendado: ${f.name}, ${fmt(f.date, { day: "2-digit", month: "2-digit" })} às ${f.time} (#${booking.id}).`,
        true,
      );
      window.jv.setDay(f.date);
      await window.jv.reload();
    } catch (error) {
      setStatus($("#newBookingStatus"), error.message);
    } finally {
      button.disabled = false;
    }
  });
})();
