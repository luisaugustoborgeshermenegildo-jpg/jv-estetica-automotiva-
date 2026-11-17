/* JV Sistema: Financeiro (entradas, despesas, taxas, meta e calculadora de preço).
   Usa setStatus, showLogin e dashboardStatus de sistema.js. */
(() => {
  const $ = (s) => document.querySelector(s);
  const METHOD = {
    pix: "Pix",
    dinheiro: "Dinheiro",
    debito: "Débito",
    credito: "Crédito",
    outro: "Outro",
  };
  const CATEGORY = {
    produtos: "Produtos e insumos",
    aluguel: "Aluguel",
    contas: "Água, luz e internet",
    equipe: "Equipe",
    manutencao: "Manutenção",
    marketing: "Marketing",
    impostos: "Impostos",
    outros: "Outros",
  };
  const today = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(),
    );
  let month = today().slice(0, 7);
  let data = null;

  const brl = (cents) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const toCents = (v) => {
    const n = Number(String(v).trim().replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };
  const num = (v) => {
    const n = Number(String(v).trim().replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const shortDate = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  async function api(path, body) {
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin();
      throw new Error("Entre novamente.");
    }
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir.");
    return result;
  }

  async function load() {
    try {
      data = await api(`/api/admin/finance?month=${month}`);
      render();
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }
  window.jvFinanceLoad = load;

  $("#finMonth").value = month;
  $("#finMonth").max = today().slice(0, 7);
  $("#finMonth").addEventListener("change", (e) => {
    if (!e.target.value) return;
    month = e.target.value;
    load();
  });

  /* ---------- Telas ---------- */
  function render() {
    const t = data.totals;
    $("#finRevenue").textContent = brl(t.revenueCents);
    $("#finExpenses").textContent = brl(t.expenseCents);
    $("#finFees").textContent = brl(t.feeCents);
    $("#finResult").textContent = brl(t.resultCents);
    $("#finResult").classList.toggle("is-negative", t.resultCents < 0);
    $("#finTicket").textContent =
      `Ticket médio ${brl(t.ticketCents)} · ${t.services} ${t.services === 1 ? "atendimento pago" : "atendimentos pagos"}`;

    const goal = data.goalCents;
    const pct = goal
      ? Math.min(100, Math.round((t.revenueCents / goal) * 100))
      : 0;
    $("#finGoalFill").style.setProperty("--p", pct / 100);
    $("#finGoalBar").setAttribute("aria-valuenow", String(pct));
    $("#finGoalText").textContent = goal
      ? `${pct}% da meta de ${brl(goal)}${t.revenueCents >= goal ? " · meta batida!" : ` · faltam ${brl(goal - t.revenueCents)}`}`
      : "Defina uma meta para acompanhar o mês.";

    // gráfico semanal
    const max = Math.max(
      1,
      ...data.weeks.flatMap((w) => [w.inCents, w.outCents]),
    );
    $("#finChart").replaceChildren(
      ...data.weeks.map((w) => {
        const col = el("div", "fin-col");
        const bars = el("div", "fin-bars");
        const bin = el("i", "bar-in");
        bin.style.setProperty("--h", w.inCents / max);
        bin.title = `Entradas: ${brl(w.inCents)}`;
        const bout = el("i", "bar-out");
        bout.style.setProperty("--h", w.outCents / max);
        bout.title = `Despesas: ${brl(w.outCents)}`;
        bars.append(bin, bout);
        col.append(
          bars,
          el("b", "", brl(w.inCents - w.outCents)),
          el("small", "", w.label),
        );
        return col;
      }),
    );

    // por forma de pagamento
    const methods = $("#finMethods");
    methods.replaceChildren();
    if (!data.byMethod.length) {
      const tr = el("tr");
      const td = el("td", "muted", "Nenhuma entrada neste mês.");
      td.colSpan = 4;
      tr.append(td);
      methods.append(tr);
    }
    data.byMethod.forEach((m) => {
      const tr = el("tr");
      tr.append(
        el("td", "", METHOD[m.method]),
        el("td", "", brl(m.grossCents)),
        el("td", "", brl(m.feeCents)),
        el("td", "", brl(m.grossCents - m.feeCents)),
      );
      methods.append(tr);
    });

    // por categoria
    const cats = $("#finCats");
    cats.replaceChildren();
    if (!data.byCategory.length)
      cats.append(el("p", "muted", "Nenhuma despesa neste mês."));
    const catMax = Math.max(1, ...data.byCategory.map((c) => c.totalCents));
    data.byCategory
      .sort((a, b) => b.totalCents - a.totalCents)
      .forEach((c) => {
        const row = el("div", "cat-row");
        const bar = el("i");
        bar.style.setProperty("--w", c.totalCents / catMax);
        row.append(
          el("span", "", CATEGORY[c.category]),
          el("b", "", brl(c.totalCents)),
          bar,
        );
        cats.append(row);
      });

    // atendimentos sem pagamento
    const unpaid = $("#finUnpaid");
    unpaid.replaceChildren();
    $("#finUnpaidBox").hidden = !data.unpaid.length;
    data.unpaid.forEach((b) => {
      const card = el("article", "row-card");
      const head = el("div", "row-head");
      const pay = el("button", "btn-primary", "Registrar pagamento");
      pay.type = "button";
      pay.addEventListener("click", () => openForm("in", b));
      head.append(el("strong", "", `${b.name} · ${b.vehicle}`), pay);
      card.append(
        head,
        el("small", "", `${b.service} · ${shortDate(b.date)} · #${b.id}`),
      );
      unpaid.append(card);
    });

    // lançamentos
    const list = $("#finEntries");
    list.replaceChildren();
    if (!data.entries.length) {
      const empty = el("div", "empty");
      empty.append(
        el("strong", "", "Nenhuma movimentação neste mês"),
        el("span", "", "Registre uma entrada ou despesa para começar."),
      );
      list.append(empty);
    }
    data.entries.forEach((e) => {
      const card = el("article", `row-card fin-entry is-${e.kind}`);
      const head = el("div", "row-head");
      head.append(
        el(
          "strong",
          "",
          `${e.kind === "in" ? "+" : "−"} ${brl(e.amountCents)}`,
        ),
        el(
          "span",
          `pill ${e.kind === "in" ? "pill-approved" : "pill-declined"}`,
          e.kind === "in" ? METHOD[e.method] : CATEGORY[e.category],
        ),
      );
      const meta = [shortDate(e.date)];
      if (e.description) meta.push(e.description);
      if (e.customer) meta.push(`${e.customer} (#${e.bookingId})`);
      if (e.feeCents) meta.push(`taxa ${brl(e.feeCents)}`);
      const del = el("button", "fin-del", "Apagar");
      del.type = "button";
      del.addEventListener("click", () => remove(e));
      card.append(head, el("small", "", meta.join(" · ")), del);
      list.append(card);
    });

    renderFees();
  }

  async function remove(e) {
    if (!confirm(`Apagar este lançamento de ${brl(e.amountCents)}?`)) return;
    try {
      data = await api("/api/admin/finance/delete", { id: e.id });
      render();
      setStatus(dashboardStatus, "Lançamento apagado.", true);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }

  /* ---------- Meta ---------- */
  $("#finGoalBtn").addEventListener("click", () => {
    const form = $("#finGoalForm");
    form.hidden = !form.hidden;
    if (!form.hidden) {
      form.goal.value = data?.goalCents
        ? (data.goalCents / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })
        : "";
      form.goal.focus();
    }
  });
  $("#finGoalForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const goalCents = toCents(e.target.goal.value || "0");
    if (goalCents === null)
      return setStatus(
        dashboardStatus,
        "Meta inválida. Use, por exemplo, 6.000,00.",
      );
    try {
      await api("/api/admin/settings", { finance: { goalCents } });
      e.target.hidden = true;
      setStatus(dashboardStatus, "Meta salva.", true);
      load();
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  });

  /* ---------- Taxas ---------- */
  function renderFees() {
    const form = $("#finFeesForm");
    if (form.dataset.ready) return;
    form.dataset.ready = "1";
    form.replaceChildren(
      ...Object.keys(METHOD).map((m) => {
        const label = el("label", "", `${METHOD[m]} (%)`);
        const input = document.createElement("input");
        input.name = m;
        input.inputMode = "decimal";
        input.value = String(data.fees[m] ?? 0).replace(".", ",");
        label.append(input);
        return label;
      }),
    );
    const save = el("button", "btn-primary", "Salvar taxas");
    save.type = "submit";
    form.append(save);
  }
  $("#finFeesForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fees = {};
    for (const m of Object.keys(METHOD)) fees[m] = num(e.target[m].value);
    try {
      await api("/api/admin/settings", { finance: { fees } });
      setStatus(
        dashboardStatus,
        "Taxas salvas. Valem para as próximas entradas.",
        true,
      );
      load();
    } catch (error) {
      setStatus(
        dashboardStatus,
        error.message === "Configuração inválida."
          ? "As taxas devem ficar entre 0% e 30%."
          : error.message,
      );
    }
  });

  /* ---------- Registrar entrada / despesa ---------- */
  const dialog = $("#finDialog");
  const form = $("#finForm");
  function openForm(kind, booking) {
    form.reset();
    form.elements.kind.value = kind;
    $("#finDialogTitle").textContent =
      kind === "in" ? "Registrar entrada" : "Registrar despesa";
    form
      .querySelectorAll("[data-only]")
      .forEach((label) => (label.hidden = label.dataset.only !== kind));
    form.elements.date.value = today();
    form.elements.date.max = today();
    const select = form.elements.bookingId;
    select.replaceChildren(
      Object.assign(document.createElement("option"), {
        value: "",
        textContent: "Sem vínculo",
      }),
      ...(data?.unpaid ?? []).map((b) =>
        Object.assign(document.createElement("option"), {
          value: b.id,
          textContent: `#${b.id} · ${b.name} · ${b.service}`,
        }),
      ),
    );
    if (booking) {
      select.value = booking.id;
      form.elements.description.value = `${booking.service} · ${booking.vehicle}`;
    }
    setStatus($("#finFormStatus"), "");
    dialog.showModal();
    form.elements.amount.focus();
  }
  document
    .querySelectorAll("[data-fin-new]")
    .forEach((b) =>
      b.addEventListener("click", () => openForm(b.dataset.finNew)),
    );
  $("#finFormClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const amountCents = toCents(f.amount);
    if (!amountCents)
      return setStatus($("#finFormStatus"), "Informe o valor. Ex.: 120,00");
    const body = {
      kind: f.kind,
      amountCents,
      date: f.date,
      description: f.description,
    };
    if (f.kind === "in")
      Object.assign(body, { method: f.method, bookingId: f.bookingId || null });
    else body.category = f.category;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      data = await api("/api/admin/finance/entry", body);
      month = f.date.slice(0, 7);
      $("#finMonth").value = month;
      render();
      dialog.close();
      setStatus(
        dashboardStatus,
        f.kind === "in"
          ? `Entrada de ${brl(amountCents)} registrada.`
          : `Despesa de ${brl(amountCents)} registrada.`,
        true,
      );
    } catch (error) {
      setStatus($("#finFormStatus"), error.message);
    } finally {
      button.disabled = false;
    }
  });

  /* ---------- Calculadora de preço ---------- */
  function calc() {
    const f = $("#calcForm").elements;
    const fixed = num(f.fixed.value);
    const hours = Math.max(1, num(f.hours.value));
    const tax = num(f.tax.value) / 100;
    const margin = num(f.margin.value) / 100;
    const minutes = Math.max(1, num(f.minutes.value));
    const products = num(f.products.value);
    const perHour = fixed / hours;
    const labor = (perHour * minutes) / 60;
    const base = labor + products;
    const divisor = 1 - tax - margin;
    const out = $("#calcOut");
    out.replaceChildren();
    if (divisor <= 0.05) {
      out.append(
        el("p", "", "Impostos + lucro passam de 95%. Diminua um dos dois."),
      );
      return;
    }
    const price = Math.ceil(base / divisor / 5) * 5; // arredonda para cima, de 5 em 5
    const fmt = (v) =>
      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    out.append(
      el("p", "kicker", "Preço sugerido"),
      el("strong", "fin-big", fmt(price)),
    );
    const rows = [
      ["Custo da sua hora", fmt(perHour)],
      [`Mão de obra (${minutes} min)`, fmt(labor)],
      ["Produtos", fmt(products)],
      ["Impostos e taxas", fmt(price * tax)],
      ["Lucro", fmt(price - base - price * tax)],
    ];
    const dl = el("dl", "calc-list");
    rows.forEach(([k, v]) => dl.append(el("dt", "", k), el("dd", "", v)));
    out.append(dl, el("small", "", "Arredondado para cima, de R$ 5 em R$ 5."));
  }
  $("#calcForm").addEventListener("input", calc);
  calc();
})();
