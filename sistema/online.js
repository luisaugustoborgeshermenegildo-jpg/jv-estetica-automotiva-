/* JV Sistema: Agendamento online (link, QR, regras) e Automações (mensagens com 1 toque).
   Usa setStatus, showLogin e dashboardStatus de sistema.js. */
(() => {
  const $ = (s) => document.querySelector(s);
  const SERVICES = [
    "Lavagem completa",
    "Lavagem detalhada",
    "Lavagem premium",
    "Limpeza e lubrificação da corrente",
    "Revitalização de plásticos",
    "Clareamento do bacalhau",
    "Clareamento do motor",
  ];
  const bookingUrl = `${location.origin}/monochrome?app=1`;
  const vitrineUrl = `${location.origin}/monochrome#servicos`;
  let settings = null;

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

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
  async function save(patch, message) {
    try {
      settings = (await api("/api/admin/settings", patch)).settings;
      setStatus(dashboardStatus, message, true);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }
  async function copy(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(dashboardStatus, message, true);
    } catch {
      setStatus(dashboardStatus, text);
    }
  }

  /* ---------- Agendamento online ---------- */
  $("#bookingUrl").textContent = bookingUrl.replace(/^https?:\/\//, "");
  $("#openBooking").href = bookingUrl;
  $("#openVitrine").href = vitrineUrl;

  document
    .querySelector('[data-view="online"]')
    .addEventListener("click", async (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "copy") copy(bookingUrl, "Link de agendamento copiado.");
      if (act === "copy-vitrine") copy(vitrineUrl, "Link da vitrine copiado.");
      if (act === "share") {
        if (navigator.share) {
          navigator
            .share({
              title: "JV Estética Automotiva",
              text: "Agende a lavagem da sua moto ou carro:",
              url: bookingUrl,
            })
            .catch(() => {});
        } else copy(bookingUrl, "Link copiado. Cole onde quiser compartilhar.");
      }
      if (act === "qr") drawQr();
    });

  function drawQr() {
    const box = $("#qrBox");
    box.hidden = !box.hidden;
    if (box.hidden || typeof qrcode !== "function") return;
    const qr = qrcode(0, "M");
    qr.addData(bookingUrl);
    qr.make();
    const canvas = $("#qrCanvas");
    const ctx = canvas.getContext("2d");
    const count = qr.getModuleCount();
    const margin = 2;
    const cell = Math.floor(canvas.width / (count + margin * 2));
    const offset = Math.floor((canvas.width - cell * count) / 2);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050608";
    for (let r = 0; r < count; r++)
      for (let c = 0; c < count; c++)
        if (qr.isDark(r, c))
          ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
    $("#qrDownload").href = canvas.toDataURL("image/png");
  }

  function renderSettings() {
    $("#setCancel").checked = settings.onlineCancel;
    $("#setNotice").value = String(settings.minNoticeHours);
    $("#setCapacity").value = String(settings.capacity);
    const box = $("#serviceToggles");
    box.replaceChildren(
      ...SERVICES.map((service) => {
        const row = el("div", "setting setting-small");
        row.append(el("span", "", service));
        const label = el("label", "switch");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !settings.disabledServices.includes(service);
        input.setAttribute("aria-label", `${service} no agendamento online`);
        input.addEventListener("change", () => {
          const off = new Set(settings.disabledServices);
          input.checked ? off.delete(service) : off.add(service);
          save(
            { disabledServices: [...off] },
            `${service}: ${input.checked ? "aparece" : "não aparece"} no agendamento online.`,
          );
        });
        label.append(input, el("span"));
        row.append(label);
        return row;
      }),
    );
  }
  $("#setCancel").addEventListener("change", (e) =>
    save(
      { onlineCancel: e.target.checked },
      e.target.checked
        ? "Cancelamento online ligado."
        : "Cancelamento online desligado.",
    ),
  );
  $("#setNotice").addEventListener("change", (e) =>
    save(
      { minNoticeHours: Number(e.target.value) },
      "Antecedência mínima salva.",
    ),
  );
  $("#setCapacity").addEventListener("change", (e) =>
    save(
      { capacity: Number(e.target.value) },
      "Atendimentos simultâneos salvos.",
    ),
  );

  window.jvOnlineLoad = async () => {
    try {
      settings = (await api("/api/admin/settings")).settings;
      renderSettings();
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  };

  /* ---------- Automações ---------- */
  const AUTO = [
    [
      "confirm",
      "Confirmação do agendamento",
      "Mensagem depois que o cliente agenda.",
    ],
    [
      "reminder",
      "Lembrete do atendimento",
      "No dia do agendamento, antes do horário.",
    ],
    ["ready", "Veículo pronto", "Avisa o cliente quando o serviço termina."],
    ["survey", "Pesquisa de satisfação", "Pede uma nota depois da entrega."],
    [
      "return",
      "Lembrete de retorno",
      "Chama quem não volta há um tempo e não tem horário marcado.",
    ],
  ];
  const VARS =
    "Use {nome}, {veiculo}, {servico}, {data}, {hora} e {protocolo}.";
  const open = new Set(["return"]);

  const fill = (text, item) =>
    text
      .replaceAll("{nome}", item.name.split(" ")[0])
      .replaceAll("{veiculo}", item.vehicle || "moto")
      .replaceAll("{servico}", item.service || "")
      .replaceAll(
        "{data}",
        item.date
          ? new Date(`${item.date}T12:00:00`).toLocaleDateString("pt-BR")
          : "",
      )
      .replaceAll("{hora}", item.time || "")
      .replaceAll("{protocolo}", item.id || "");
  const wa = (phone) => {
    const d = phone.replace(/\D/g, "");
    return d.length >= 10 ? (d.startsWith("55") ? d : `55${d}`) : "";
  };

  function renderAuto(data) {
    const total = AUTO.reduce(
      (s, [k]) => s + (data.settings[k].on ? data.queue[k].length : 0),
      0,
    );
    $("#countAuto").textContent = total;
    $("#countAuto").hidden = total === 0;
    $("#autoList").replaceChildren(
      ...AUTO.map(([kind, title, desc]) => {
        const conf = data.settings[kind];
        const items = data.queue[kind];
        const card = el(
          "article",
          `auto-card${open.has(kind) ? " is-open" : ""}`,
        );
        const head = el("div", "auto-head");
        const text = el("div");
        text.append(el("h3", "", title), el("p", "", desc));
        const count = el(
          "span",
          `pill${conf.on && items.length ? " pill-open" : ""}`,
          conf.on ? `${items.length} para enviar` : "Desligada",
        );
        const toggle = el("label", "switch");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = conf.on;
        input.setAttribute("aria-label", `Ligar ${title}`);
        input.addEventListener("change", async () => {
          await save(
            { automations: { [kind]: { on: input.checked } } },
            `${title}: ${input.checked ? "ligada" : "desligada"}.`,
          );
          window.jvAutoLoad();
        });
        toggle.append(input, el("span"));
        const more = el(
          "button",
          "auto-more",
          open.has(kind) ? "Fechar" : "Abrir",
        );
        more.type = "button";
        more.addEventListener("click", () => {
          open.has(kind) ? open.delete(kind) : open.add(kind);
          renderAuto(data);
        });
        head.append(text, count, toggle, more);
        card.append(head);

        if (open.has(kind)) {
          const body = el("div", "auto-body");
          if (kind === "return") {
            body.append(el("p", "auto-label", "Regra de disparo"));
            body.append(
              el(
                "p",
                "hint",
                `Quando completarem ${conf.days} dias desde o último serviço e o cliente não tiver agendamento novo.`,
              ),
            );
            const days = el("div", "day-chips");
            [30, 45, 60, 90].forEach((d) => {
              const b = el(
                "button",
                d === conf.days ? "is-on" : "",
                `${d} dias`,
              );
              b.type = "button";
              b.addEventListener("click", async () => {
                await save(
                  { automations: { return: { days: d } } },
                  `Lembrete de retorno: ${d} dias.`,
                );
                window.jvAutoLoad();
              });
              days.append(b);
            });
            body.append(days);
          }
          body.append(el("p", "auto-label", "Mensagem enviada"));
          const area = document.createElement("textarea");
          area.rows = 3;
          area.maxLength = 600;
          area.value = conf.text;
          const saveText = el("button", "btn-ghost", "Salvar mensagem");
          saveText.type = "button";
          saveText.addEventListener("click", async () => {
            await save(
              { automations: { [kind]: { text: area.value } } },
              "Mensagem salva.",
            );
            window.jvAutoLoad();
          });
          body.append(area, el("p", "hint", VARS), saveText);

          body.append(
            el("p", "auto-label", `Para enviar agora (${items.length})`),
          );
          if (!items.length)
            body.append(el("p", "hint", "Ninguém na fila agora."));
          items.forEach((item) => {
            const row = el("div", "auto-item");
            const who = el("div");
            who.append(
              el("strong", "", item.name),
              el(
                "small",
                "",
                [
                  item.vehicle,
                  item.service,
                  item.date &&
                    new Date(`${item.date}T12:00:00`).toLocaleDateString(
                      "pt-BR",
                    ),
                  item.time,
                ]
                  .filter(Boolean)
                  .join(" · "),
              ),
            );
            row.append(who);
            const phone = wa(item.phone);
            if (phone) {
              const send = el("a", "btn-whats", "Enviar");
              send.href = `https://wa.me/${phone}?text=${encodeURIComponent(fill(conf.text, item))}`;
              send.target = "_blank";
              send.rel = "noopener noreferrer";
              send.addEventListener("click", () =>
                markSent(kind, item.ref, false),
              );
              const skip = el("button", "btn-ghost", "Já enviei");
              skip.type = "button";
              skip.addEventListener("click", () =>
                markSent(kind, item.ref, true),
              );
              row.append(send, skip);
            } else row.append(el("small", "", "Sem WhatsApp válido"));
            body.append(row);
          });
          body.append(
            el(
              "p",
              "hint",
              `Enviadas nos últimos 30 dias: ${data.sent30[kind] ?? 0}`,
            ),
          );
          card.append(body);
        }
        return card;
      }),
    );
  }

  async function markSent(kind, ref, reload) {
    try {
      await api("/api/admin/automations/sent", { kind, ref });
      setStatus(dashboardStatus, "Marcado como enviado.", true);
      // Depois de abrir o WhatsApp, atualiza a fila ao voltar para o sistema.
      if (reload) window.jvAutoLoad();
      else setTimeout(() => window.jvAutoLoad(), 1500);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  }

  window.jvAutoLoad = async () => {
    try {
      const data = await api("/api/admin/automations");
      if (!settings) settings = (await api("/api/admin/settings")).settings;
      renderAuto(data);
    } catch (error) {
      setStatus(dashboardStatus, error.message);
    }
  };
})();
