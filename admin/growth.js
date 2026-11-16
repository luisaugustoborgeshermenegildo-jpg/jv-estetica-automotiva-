/* Crescimento: orçamentos, pátio, estoque e vendas.
   Usa showLogin e setStatus de admin.js (mesmo escopo global). */
(() => {
  const view = document.querySelector("#growthView");
  const agenda = document.querySelector("#agendaView");
  const status = document.querySelector("#growthStatus");
  if (!view) return;
  let data = null;

  const brl = (centsValue) =>
    (centsValue / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  // "1.234,56" → 123456 centavos; vazio ou inválido → null
  const toCents = (value) => {
    const n = Number(String(value).trim().replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
  };
  const toQty = (value) => {
    const n = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const shortDate = (iso) =>
    iso
      ? new Date(
          iso.length === 10 ? `${iso}T12:00:00` : iso,
        ).toLocaleDateString("pt-BR")
      : "";
  const STAGE = {
    received: "Recebido",
    washing: "Em lavagem",
    ready: "Pronto para retirar",
  };
  const QUOTE = { open: "Aberto", approved: "Aprovado", declined: "Recusado" };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function empty(text) {
    return el("p", "empty", text);
  }

  /* ---------- Abas ---------- */
  document.querySelectorAll(".admin-tabs [data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      const growth = button.dataset.view === "growth";
      view.hidden = !growth;
      agenda.hidden = growth;
      document
        .querySelectorAll(".admin-tabs [data-view]")
        .forEach((b) =>
          b === button
            ? b.setAttribute("aria-current", "page")
            : b.removeAttribute("aria-current"),
        );
      if (growth) load();
    }),
  );
  view.querySelectorAll(".growth-tabs [data-sub]").forEach((button) =>
    button.addEventListener("click", () => {
      view
        .querySelectorAll(".growth-tabs [data-sub]")
        .forEach((b) => b.setAttribute("aria-selected", String(b === button)));
      view
        .querySelectorAll(".growth-panel")
        .forEach((p) => (p.hidden = p.dataset.panel !== button.dataset.sub));
    }),
  );
  document.querySelector("#growthRefresh").addEventListener("click", load);

  /* ---------- Comunicação com a API ---------- */
  async function call(path, body) {
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
    setStatus(status, "Carregando…");
    try {
      data = await call("/api/admin/growth");
      render();
      setStatus(status, "");
    } catch (error) {
      setStatus(status, error.message);
    }
  }
  async function save(path, body, message, form) {
    const button = form?.querySelector("button[type=submit]");
    if (button) button.disabled = true;
    try {
      data = await call(path, body);
      render();
      form?.reset();
      setStatus(status, message, true);
    } catch (error) {
      setStatus(status, error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  /* ---------- Formulários ---------- */
  document.querySelector("#quoteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const amountCents = toCents(f.get("amount"));
    if (amountCents === null)
      return setStatus(status, "Valor inválido. Use, por exemplo, 150,00.");
    save(
      "/api/admin/quotes",
      {
        customer: f.get("customer"),
        phone: f.get("phone"),
        vehicle: f.get("vehicle"),
        model: f.get("model"),
        service: f.get("service"),
        amountCents,
        validUntil: f.get("validUntil") || null,
        notes: f.get("notes"),
      },
      "Orçamento criado.",
      e.target,
    );
  });

  document.querySelector("#productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      name: f.get("name"),
      quantity: toQty(f.get("quantity")),
      minimum: toQty(f.get("minimum")),
      unit: f.get("unit"),
      unitCostCents: toCents(f.get("unitCost")),
    };
    if (
      body.quantity === null ||
      body.minimum === null ||
      body.unitCostCents === null
    )
      return setStatus(status, "Revise quantidade, mínimo e custo.");
    save("/api/admin/products", body, "Produto adicionado.", e.target);
  });

  document.querySelector("#moveForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const quantity = toQty(f.get("quantity"));
    if (!quantity) return setStatus(status, "Informe a quantidade.");
    save(
      "/api/admin/stock",
      {
        productId: Number(f.get("productId")),
        kind: f.get("kind"),
        quantity,
        bookingId: f.get("bookingId") || null,
        reason: f.get("reason"),
      },
      "Movimentação registrada.",
      e.target,
    );
  });

  /* ---------- Telas ---------- */
  function render() {
    renderQuotes();
    renderYard();
    renderStock();
    renderSales();
  }

  function renderQuotes() {
    const list = document.querySelector("#quoteList");
    list.replaceChildren();
    if (!data.quotes.length)
      return list.append(empty("Nenhum orçamento ainda."));
    data.quotes.forEach((q) => {
      const card = el("article", `row-card quote-${q.status}`);
      const head = el("div", "row-head");
      head.append(
        el("strong", "", `${q.customer} · ${brl(q.amountCents)}`),
        el("span", `pill pill-${q.status}`, QUOTE[q.status]),
      );
      card.append(head);
      card.append(
        el(
          "p",
          "",
          `${q.vehicle === "carro" ? "Carro" : "Moto"}${q.model ? ` ${q.model}` : ""} · ${q.service}`,
        ),
      );
      const meta = [`Criado em ${shortDate(q.createdAt)}`];
      if (q.validUntil) meta.push(`válido até ${shortDate(q.validUntil)}`);
      card.append(el("small", "", meta.join(" · ")));
      if (q.notes) card.append(el("p", "muted", q.notes));
      const actions = el("div", "stage-actions");
      if (q.status !== "approved")
        actions.append(quoteButton(q, "approved", "Aprovado", "stage-next"));
      if (q.status !== "declined")
        actions.append(quoteButton(q, "declined", "Recusado", "stage-cancel"));
      if (q.status !== "open")
        actions.append(quoteButton(q, "open", "Reabrir", "stage-cancel"));
      const digits = q.phone.replace(/\D/g, "");
      if (digits.length >= 10) {
        const phone = digits.startsWith("55") ? digits : `55${digits}`;
        const msg = `Olá, ${q.customer.split(" ")[0]}! Segue o orçamento da JV Estética Automotiva:\n${q.service} (${q.vehicle === "carro" ? "carro" : "moto"}${q.model ? ` ${q.model}` : ""}): ${brl(q.amountCents)}${q.validUntil ? `\nVálido até ${shortDate(q.validUntil)}.` : ""}${q.notes ? `\n${q.notes}` : ""}`;
        const link = el("a", "stage-whats", "Enviar no WhatsApp");
        link.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        actions.append(link);
      }
      card.append(actions);
      list.append(card);
    });
  }
  function quoteButton(q, next, label, className) {
    const b = el("button", className, label);
    b.type = "button";
    b.addEventListener("click", () =>
      save(
        "/api/admin/quotes/status",
        { id: q.id, status: next },
        `Orçamento: ${QUOTE[next]}.`,
      ),
    );
    return b;
  }

  function renderYard() {
    const list = document.querySelector("#yardList");
    list.replaceChildren();
    if (!data.yard.length)
      return list.append(empty("Nenhum veículo no pátio agora."));
    data.yard.forEach((b) => {
      const card = el("article", "row-card");
      const head = el("div", "row-head");
      head.append(
        el("strong", "", `${b.vehicle} · ${b.name}`),
        el("span", "pill", STAGE[b.status] || b.status),
      );
      card.append(
        head,
        el(
          "small",
          "",
          `#${b.id} · ${b.service} · ${shortDate(b.date)} ${b.time}`,
        ),
      );
      const form = el("form", "spot-form");
      const label = el("label", "", "Vaga");
      const input = document.createElement("input");
      input.maxLength = 20;
      input.value = b.spot;
      input.placeholder = "Ex.: Box 2";
      label.append(input);
      const button = el("button", "stage-cancel", "Salvar vaga");
      button.type = "submit";
      form.append(label, button);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        save(
          "/api/admin/yard",
          { id: b.id, spot: input.value },
          `Vaga de #${b.id} salva.`,
        );
      });
      card.append(form);
      list.append(card);
    });
  }

  function renderStock() {
    const list = document.querySelector("#productList");
    list.replaceChildren();
    if (!data.products.length) list.append(empty("Nenhum produto cadastrado."));
    data.products.forEach((p) => {
      const low = p.minimum > 0 && p.quantity <= p.minimum;
      const card = el("article", `row-card${low ? " is-low" : ""}`);
      const head = el("div", "row-head");
      head.append(
        el("strong", "", p.name),
        el("span", `pill${low ? " pill-declined" : ""}`, low ? "Repor" : "Ok"),
      );
      card.append(
        head,
        el(
          "small",
          "",
          `${p.quantity} ${p.unit} · mínimo ${p.minimum} · ${brl(p.unitCostCents)} por ${p.unit}`,
        ),
      );
      list.append(card);
    });

    const productSelect = document.querySelector("#moveForm [name=productId]");
    productSelect.replaceChildren(
      ...data.products.map((p) => {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = `${p.name} (${p.quantity} ${p.unit})`;
        return o;
      }),
    );
    const osSelect = document.querySelector("#moveForm [name=bookingId]");
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Sem vínculo";
    osSelect.replaceChildren(
      none,
      ...data.yard.map((b) => {
        const o = document.createElement("option");
        o.value = b.id;
        o.textContent = `#${b.id} · ${b.vehicle}`;
        return o;
      }),
    );

    const moves = document.querySelector("#moveList");
    moves.replaceChildren();
    if (!data.moves.length)
      return moves.append(empty("As entradas e os consumos aparecem aqui."));
    data.moves.forEach((m) => {
      const card = el("article", "row-card");
      const head = el("div", "row-head");
      head.append(
        el(
          "strong",
          "",
          `${m.kind === "in" ? "+" : "−"}${m.quantity} ${m.unit} · ${m.product}`,
        ),
        el(
          "span",
          `pill${m.kind === "in" ? " pill-approved" : ""}`,
          m.kind === "in" ? "Entrada" : "Consumo",
        ),
      );
      const meta = [
        shortDate(m.at),
        brl(Math.round(m.quantity * m.unitCostCents)),
      ];
      if (m.bookingId) meta.push(`OS #${m.bookingId}`);
      card.append(head, el("small", "", meta.join(" · ")));
      if (m.reason) card.append(el("p", "muted", m.reason));
      moves.append(card);
    });
  }

  function renderSales() {
    const s = data.sales;
    const cards = [
      ["Orçamentos abertos", String(s.openQuotes)],
      [
        "Taxa de fechamento",
        s.closingRate === null ? "—" : `${s.closingRate}%`,
      ],
      ["Aprovado no mês", brl(s.approvedMonthCents)],
      ["Produtos para repor", String(s.lowStock)],
      ["Custo de material no mês", brl(s.materialMonthCents)],
    ];
    document.querySelector("#salesCards").replaceChildren(
      ...cards.map(([label, value]) => {
        const card = el("article", "sales-card");
        card.append(el("span", "", label), el("strong", "", value));
        return card;
      }),
    );
  }
})();

/* ---------- Instalar o painel (Android/PC: botão; iPhone: instrução) ---------- */
(() => {
  const button = document.querySelector("#installPanel");
  if (!button) return;
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  const standalone =
    matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;
  let prompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    button.hidden = false;
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios) button.hidden = false;
  button.addEventListener("click", async () => {
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      prompt = null;
      button.hidden = true;
    } else if (ios) {
      alert(
        'No iPhone: toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".',
      );
    }
  });
})();
