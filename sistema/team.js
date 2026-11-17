/* JV Sistema: Equipe e comissões + Serviços e configurações.
   Usa window.jv, setStatus, showLogin e dashboardStatus de sistema.js. */
(() => {
  const $ = (s) => document.querySelector(s);
  const MOTO_BANDS = ["Até 160cc", "160 a 400cc", "Acima de 400cc"];
  const CAR_BANDS = ["Hatch ou sedã", "SUV ou picape"];
  let team = null;
  let settings = null;

  const brl = (cents) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const toNum = (v) => {
    const t = String(v).trim();
    if (!t) return null;
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };
  const money = (v) =>
    Number(v).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

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

  /* ---------- Quem executa (na OS) ---------- */
  window.jvStaffPicker = (b) => {
    if (!team || !team.staff.some((s) => s.active)) return null;
    if (
      !["received", "washing", "ready", "delivered"].includes(
        window.jv.status(b),
      )
    )
      return null;
    const label = el("label", "staff-pick", "Quem executa");
    const select = document.createElement("select");
    select.append(
      Object.assign(document.createElement("option"), {
        value: "",
        textContent: "Proprietário (sem comissão)",
      }),
    );
    team.staff
      .filter((s) => s.active || s.id === b.staffId)
      .forEach((s) =>
        select.append(
          Object.assign(document.createElement("option"), {
            value: String(s.id),
            textContent: s.name,
          }),
        ),
      );
    select.value = b.staffId ? String(b.staffId) : "";
    select.addEventListener("change", async () => {
      try {
        await api("/api/admin/team/assign", {
          bookingId: b.id,
          staffId: select.value ? Number(select.value) : null,
        });
        b.staffId = select.value ? Number(select.value) : null;
        setStatus(
          dashboardStatus,
          `#${b.id}: ${select.value ? select.selectedOptions[0].textContent : "proprietário"}.`,
          true,
        );
      } catch (error) {
        setStatus(dashboardStatus, error.message);
        select.value = b.staffId ? String(b.staffId) : "";
      }
    });
    label.append(select);
    return label;
  };

  /* ---------- Equipe ---------- */
  async function loadTeam(rerenderCards = false) {
    try {
      team = await api("/api/admin/team");
      renderTeam();
      if (rerenderCards) window.jv.setDay(window.jv.day);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }
  window.jvTeamLoad = () => loadTeam();

  function renderTeam() {
    $("#tmActive").textContent = team.kpis.activeStaff;
    $("#tmPending").textContent = brl(team.kpis.pendingCents);
    $("#tmServices").textContent = team.kpis.servicesMonth;
    $("#tmAvg").textContent = brl(team.kpis.avgCommissionCents);

    const owner = el("article", "row-card person");
    const oh = el("div", "row-head");
    oh.append(
      el("strong", "", "João (JV)"),
      el("span", "pill pill-delivered", "Proprietário"),
    );
    owner.append(
      oh,
      stats([
        [String(team.owner.servicesMonth), "serviços no mês"],
        [brl(team.owner.generatedMonthCents), "gerados no mês"],
        ["—", "sem comissão"],
      ]),
    );

    const cards = team.staff.map((s) => {
      const card = el("article", `row-card person${s.active ? "" : " is-off"}`);
      const head = el("div", "row-head");
      head.append(
        el("strong", "", s.name),
        el(
          "span",
          `pill ${s.active ? "pill-open" : ""}`,
          s.active ? "Funcionário" : "Inativo",
        ),
      );
      card.append(head);
      if (s.phone) card.append(el("small", "", s.phone));
      card.append(
        stats([
          [String(s.servicesMonth), "serviços no mês"],
          [brl(s.generatedMonthCents), "gerados no mês"],
          [brl(s.pendingCents), "comissão a pagar"],
        ]),
      );
      if (s.pendingJobs.length) {
        const det = el("details", "jobs");
        det.append(
          el(
            "summary",
            "",
            `Ver ${s.pendingJobs.length} ${s.pendingJobs.length === 1 ? "serviço pendente" : "serviços pendentes"}`,
          ),
        );
        s.pendingJobs.forEach((j) =>
          det.append(
            el(
              "p",
              "",
              `${new Date(`${j.date}T12:00:00`).toLocaleDateString("pt-BR")} · ${j.customer} · ${j.service} · ${brl(j.baseCents)} × ${j.pct}% = ${brl(j.commissionCents)}`,
            ),
          ),
        );
        card.append(det);
      }
      const actions = el("div", "stage-actions");
      if (s.pendingCents) {
        const pay = el("button", "btn-primary", `Pagar ${brl(s.pendingCents)}`);
        pay.type = "button";
        pay.addEventListener("click", async () => {
          if (
            !confirm(
              `Pagar ${brl(s.pendingCents)} de comissão para ${s.name}? A despesa entra no Financeiro.`,
            )
          )
            return;
          try {
            team = await api("/api/admin/team/pay", { staffId: s.id });
            renderTeam();
            setStatus(
              dashboardStatus,
              `Comissão de ${s.name} paga e lançada no Financeiro.`,
              true,
            );
          } catch (error) {
            setStatus(dashboardStatus, error.message);
          }
        });
        actions.append(pay);
      }
      const toggle = el(
        "button",
        "btn-ghost",
        s.active ? "Desativar" : "Reativar",
      );
      toggle.type = "button";
      toggle.addEventListener("click", async () => {
        try {
          team = await api("/api/admin/team/staff/update", {
            id: s.id,
            active: !s.active,
          });
          renderTeam();
          window.jv.setDay(window.jv.day);
        } catch (error) {
          setStatus(dashboardStatus, error.message);
        }
      });
      actions.append(toggle);
      card.append(actions);
      return card;
    });
    $("#tmList").replaceChildren(owner, ...cards);
    $("#tmAddForm button").textContent =
      `+ Adicionar funcionário (${team.kpis.activeStaff}/${team.maxStaff})`;

    $("#tmRules").replaceChildren(
      ...team.rules.map((r) => {
        const row = el("div", "rule-row");
        row.append(
          el("span", "", r.service),
          el("b", "", `${String(r.pct).replace(".", ",")}%`),
        );
        return row;
      }),
    );
  }
  function stats(items) {
    const box = el("div", "person-stats");
    items.forEach(([value, label]) => {
      const s = el("div");
      s.append(el("b", "", value), el("small", "", label));
      box.append(s);
    });
    return box;
  }
  $("#tmAddForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      team = await api("/api/admin/team/staff", f);
      e.target.reset();
      renderTeam();
      window.jv.setDay(window.jv.day);
      setStatus(dashboardStatus, `${f.name} adicionado à equipe.`, true);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  });

  /* ---------- Serviços e configurações ---------- */
  document.querySelectorAll("[data-cfg]").forEach((b) =>
    b.addEventListener("click", () => {
      document
        .querySelectorAll("[data-cfg]")
        .forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      document
        .querySelectorAll("[data-cfg-panel]")
        .forEach((p) => (p.hidden = p.dataset.cfgPanel !== b.dataset.cfg));
    }),
  );

  async function saveSettings(patch, message) {
    try {
      settings = (await api("/api/admin/settings", patch)).settings;
      setStatus(dashboardStatus, message, true);
      return true;
    } catch (error) {
      setStatus(
        dashboardStatus,
        error.message === "Configuração inválida."
          ? "Revise os valores: preços até R$ 100.000, tempo de 5 a 600 min e comissão até 60%."
          : error.message,
      );
      return false;
    }
  }

  function serviceCard(name, item, vehicle) {
    const off = settings.disabledServices.includes(name);
    const card = el("article", "svc-card");
    const head = el("div", "row-head");
    head.append(el("h3", "", name));
    const sw = el("label", "switch");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !off;
    input.setAttribute("aria-label", `${name} no agendamento online`);
    input.addEventListener("change", async () => {
      const set = new Set(settings.disabledServices);
      input.checked ? set.delete(name) : set.add(name);
      if (
        !(await saveSettings(
          { disabledServices: [...set] },
          `${name}: ${input.checked ? "aparece" : "não aparece"} no agendamento online.`,
        ))
      )
        input.checked = !input.checked;
      renderConfig();
    });
    sw.append(input, el("span"));
    const online = el("div", "svc-online");
    online.append(el("small", "", "Online"), sw);
    head.append(online);
    card.append(head);

    let price;
    if (vehicle === "carro")
      price = Array.isArray(item.carro)
        ? `A partir de R$ ${money(Math.min(...item.carro))}`
        : "Sob consulta";
    else
      price =
        typeof item.moto === "number"
          ? `R$ ${money(item.moto)}`
          : `A partir de R$ ${money(item.moto[0])}`;
    const meta = el("p", "svc-meta");
    meta.append(
      el("span", "", `Média ${item.minutes} min`),
      el("span", "", price),
      el("span", "", `Comissão ${String(item.commission).replace(".", ",")}%`),
    );
    card.append(meta);

    const edit = el("button", "btn-ghost", "Editar");
    edit.type = "button";
    const form = el("form", "svc-form");
    form.hidden = true;
    const field = (label, nameAttr, value, wide) => {
      const l = el("label", wide ? "wide" : "", label);
      const i = document.createElement("input");
      i.name = nameAttr;
      i.inputMode = "decimal";
      i.value = value ?? "";
      l.append(i);
      form.append(l);
    };
    if (vehicle === "moto") {
      if (typeof item.moto === "number")
        field("Preço (R$)", "m0", money(item.moto));
      else
        MOTO_BANDS.forEach((b, i) =>
          field(`${b} (R$)`, `m${i}`, money(item.moto[i])),
        );
    } else {
      CAR_BANDS.forEach((b, i) =>
        field(
          `${b} (R$)`,
          `c${i}`,
          Array.isArray(item.carro) ? money(item.carro[i]) : "",
        ),
      );
    }
    field("Tempo médio (min)", "minutes", String(item.minutes));
    field(
      "Comissão (%)",
      "commission",
      String(item.commission).replace(".", ","),
    );
    const save = el("button", "btn-primary", "Salvar");
    save.type = "submit";
    form.append(save);
    edit.addEventListener("click", () => {
      form.hidden = !form.hidden;
      edit.textContent = form.hidden ? "Editar" : "Fechar";
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = form.elements;
      const patch = {
        minutes: Math.round(toNum(f.minutes.value)),
        commission: toNum(f.commission.value),
      };
      if (vehicle === "moto") {
        patch.moto =
          typeof item.moto === "number"
            ? toNum(f.m0.value)
            : [0, 1, 2].map((i) => toNum(f[`m${i}`].value));
      } else {
        const car = [0, 1].map((i) => toNum(f[`c${i}`].value));
        if (car.every((v) => v === null)) patch.carro = null;
        else if (car.some((v) => v === null))
          return setStatus(
            dashboardStatus,
            "Preencha os dois portes do carro ou deixe os dois em branco.",
          );
        else patch.carro = car;
      }
      const values = [
        patch.minutes,
        patch.commission,
        ...[].concat(patch.moto ?? [], patch.carro ?? []),
      ];
      if (values.some((v) => v === null || Number.isNaN(v)))
        return setStatus(
          dashboardStatus,
          "Revise os números (use vírgula para centavos).",
        );
      if (
        await saveSettings(
          { catalog: { [name]: patch } },
          `${name} atualizado. O site já mostra o novo preço.`,
        )
      )
        renderConfig();
    });
    card.append(edit, form);
    return card;
  }

  function renderConfig() {
    const group = (title, vehicle, names) => {
      const box = el("div", "svc-group");
      const head = el("div", "block-head");
      head.append(
        el("h2", "", title),
        el("small", "", `${names.length} serviços`),
      );
      const grid = el("div", "svc-grid");
      names.forEach((n) =>
        grid.append(serviceCard(n, settings.catalog[n], vehicle)),
      );
      box.append(head, grid);
      return box;
    };
    const all = Object.keys(settings.catalog);
    $("#cfgMoto").replaceChildren(group("Moto", "moto", all));
    $("#cfgCarro").replaceChildren(
      group(
        "Carro",
        "carro",
        all.filter((n) => !settings.catalog[n].motoOnly),
      ),
    );
    const c = $("#cfgCompany").elements;
    ["name", "whatsapp", "address", "instagram"].forEach(
      (k) => (c[k].value = settings.company[k] ?? ""),
    );
  }
  window.jvConfigLoad = async () => {
    try {
      settings = (await api("/api/admin/settings")).settings;
      renderConfig();
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  };
  $("#cfgCompany").addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveSettings(
      { company: Object.fromEntries(new FormData(e.target)) },
      "Dados da empresa salvos.",
    );
  });

  // Carrega a equipe ao abrir o sistema (para o seletor "Quem executa" nas OS).
  const start = () => {
    if (!document.querySelector("#shell").hidden) loadTeam(true);
    else setTimeout(start, 800);
  };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
