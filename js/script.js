// JV Estética Automotiva — navegação, seções interativas e agendamento.
const WHATSAPP = "5534984266406";
let OPEN_DAYS = new Set([0, 2, 3, 4, 5, 6]); // padrão; o expediente do JV Sistema substitui ao carregar
const DAYS_AHEAD = 21;
// Tabela de preços da JV para moto, por faixa de cilindrada (mesma ordem de ENGINES.moto).
const SERVICES = {
  "Lavagem completa": { moto: [70, 100, 120] },
  "Lavagem detalhada": { moto: [110, 130, 150] },
  "Lavagem premium": { moto: [125, 140, 170] },
  "Limpeza e lubrificação da corrente": {
    moto: 20,
    fixed: true,
    motoOnly: true,
  },
  "Revitalização de plásticos": { moto: 40, fixed: true, motoOnly: true },
  "Clareamento do bacalhau": { moto: 25, fixed: true, motoOnly: true },
  "Clareamento do motor": { moto: 30, fixed: true, motoOnly: true },
};
const ENGINES = {
  moto: {
    label: "Cilindrada",
    placeholder: "Ex.: Honda CB 300",
    options: ["Até 160cc", "160cc a 400cc", "Acima de 400cc"],
  },
  carro: {
    label: "Porte",
    placeholder: "Ex.: Fiat Argo",
    options: ["Carro hatch ou sedã", "Carro SUV ou picape"],
  },
};
const brl = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

$("#year").textContent = new Date().getFullYear();

/* ---------- Cabeçalho ---------- */
const header = $(".header");
const nav = $("#nav");
const menuToggle = $(".menu-toggle");
const onScroll = () =>
  header.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
function closeMenu() {
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menu");
}
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
});
$$("a", nav).forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

/* ---------- Luz que segue o cursor nos cartões ---------- */
$$(".service, .about-cards li").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

/* ---------- Como funciona: passos ligados às camadas ---------- */
(() => {
  const steps = $$(".step");
  const slabs = $$(".slab");
  const box = $("#process");
  if (!box) return; // seção não existe nesta versão da página
  let current = 0,
    timer = 0,
    paused = false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(i) {
    current = i;
    steps.forEach((s, n) => s.classList.toggle("is-active", n === i));
    slabs.forEach((s, n) => s.classList.toggle("is-active", n === i));
  }
  function play() {
    if (reduce) return;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!paused) show((current + 1) % steps.length);
    }, 3200);
  }
  steps.forEach((step, i) => {
    step.addEventListener("pointerenter", () => {
      paused = true;
      show(i);
    });
    step.addEventListener("pointerleave", () => {
      paused = false;
    });
  });
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) play();
      else clearInterval(timer);
    },
    { threshold: 0.35 },
  ).observe(box);
  show(0);
})();

/* ---------- Serviços: Moto / Carro ---------- */
const servicesSection = $("#servicos");
function setServicesVehicle(vehicle) {
  servicesSection.dataset.vehicle = vehicle;
  $$(".toggle-opt").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.vehicle === vehicle)),
  );
}
$$(".toggle-opt").forEach((btn) =>
  btn.addEventListener("click", () => {
    setServicesVehicle(btn.dataset.vehicle);
    setFormVehicle(btn.dataset.vehicle);
  }),
);

/* ---------- Agendamento ---------- */
const form = $("#bookingForm");
const engineSelect = $("#engineSelect");
const engineLabel = $("#engineLabel");
const modelInput = $("#modelInput");
const daysEl = $("#days");
const dateInput = $("#dateInput");
const slotsEl = $("#slots");
const timeInput = $("#timeInput");
const feedback = $("#formFeedback");
const sum = {
  vehicle: $("#sumVehicle"),
  service: $("#sumService"),
  date: $("#sumDate"),
  time: $("#sumTime"),
  price: $("#sumPrice"),
};
const vehicle = () => form.elements.vehicle.value;
const selectedService = () => form.elements.service.value;
// Adicionais marcados (app: caixinhas "extras"; vários ao mesmo tempo).
const selectedExtras = () =>
  $$('input[name="extras"]:checked', form).map((i) => i.value);
const engineField = $("#engineField");
const washChips = $("#washChips");
// Faixas de cilindrada (ou porte) com o preço, abertas embaixo da lavagem escolhida.
const bandPick = washChips ? document.createElement("div") : null;
if (bandPick) {
  bandPick.className = "band-pick";
  bandPick.setAttribute("role", "radiogroup");
  bandPick.setAttribute("aria-label", "Cilindrada ou porte");
}
const serviceText = () =>
  [selectedService(), ...selectedExtras()].filter(Boolean).join(" + ") || "—";

function setSummary(key, text) {
  const el = sum[key];
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

function priceLabel(service, v = vehicle()) {
  const info = SERVICES[service];
  if (!info) return "—";
  if (v === "carro") {
    // Preço do carro vem do catálogo do JV Sistema; sem preço, continua "sob consulta".
    if (!Array.isArray(info.carro)) return "Sob consulta";
    const t = ENGINES.carro.options.indexOf(engineSelect.value);
    return t >= 0 ? brl(info.carro[t]) : `A partir de ${brl(Math.min(...info.carro))}`;
  }
  if (info.fixed) return brl(info.moto);
  // Com a cilindrada escolhida, mostra o valor exato da tabela.
  const tier = ENGINES.moto.options.indexOf(engineSelect.value);
  return tier >= 0 ? brl(info.moto[tier]) : `A partir de ${brl(info.moto[0])}`;
}

// Valor da lavagem (pela faixa) + adicionais. Sem faixa escolhida: "A partir de".
function totalLabel() {
  const items = [selectedService(), ...selectedExtras()].filter(Boolean);
  if (!items.length) return "—";
  if (items.length === 1) return priceLabel(items[0]);
  const v = vehicle();
  let fixed = 0;
  let wash = 0;
  let exact = true;
  for (const s of items) {
    const info = SERVICES[s];
    if (!info) return "—";
    if (info.fixed) {
      fixed += info.moto;
      continue;
    }
    const table = v === "carro" ? info.carro : info.moto;
    if (!Array.isArray(table)) return "Sob consulta";
    const t = ENGINES[v].options.indexOf(engineSelect.value);
    if (t < 0) exact = false;
    wash += table[t < 0 ? 0 : t];
  }
  return exact ? brl(wash + fixed) : `A partir de ${brl(wash + fixed)}`;
}

function renderBands() {
  if (!bandPick) return;
  const service = selectedService();
  const chip = service
    ? $(`input[name="service"][value="${CSS.escape(service)}"]`, form)?.closest(".chip")
    : null;
  if (engineField) engineField.hidden = Boolean(chip);
  if (!chip) {
    bandPick.hidden = true;
    return;
  }
  const v = vehicle();
  const info = SERVICES[service];
  const table = v === "carro" ? info.carro : info.moto;
  bandPick.replaceChildren(
    ...ENGINES[v].options.map((opt, i) => {
      const label = document.createElement("label");
      label.className = "band";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "band";
      input.value = opt;
      input.checked = engineSelect.value === opt;
      const name = document.createElement("span");
      name.textContent = opt;
      const price = document.createElement("b");
      price.textContent = Array.isArray(table) ? brl(table[i]) : "Sob consulta";
      label.append(input, name, price);
      return label;
    }),
  );
  bandPick.hidden = false;
  chip.after(bandPick);
}

function refreshPrices() {
  $$("[data-price]", form).forEach((el) => {
    el.textContent = priceLabel(el.dataset.price);
  });
  setSummary("price", totalLabel());
  renderBands();
}

function setFormVehicle(v) {
  const radio = $(`input[name="vehicle"][value="${v}"]`, form);
  if (radio && !radio.checked) radio.checked = true;
  const cfg = ENGINES[v];
  const previous = engineSelect.value;
  engineLabel.textContent = cfg.label;
  modelInput.placeholder = cfg.placeholder;
  engineSelect.replaceChildren(
    new Option("Selecione", ""),
    ...cfg.options.map((o) => new Option(o, o)),
  );
  if (cfg.options.includes(previous)) engineSelect.value = previous;
  $$(".moto-only", form).forEach((box) => {
    box.hidden = v !== "moto";
    $$("input", box).forEach((input) => {
      input.disabled = v !== "moto";
      if (input.disabled && input.checked) input.checked = false;
    });
  });
  setSummary("service", serviceText());
  setSummary("vehicle", v === "moto" ? "Moto" : "Carro");
  refreshPrices();
}

form.addEventListener("change", (e) => {
  if (e.target.name === "vehicle") {
    setFormVehicle(e.target.value);
    setServicesVehicle(e.target.value);
  }
  if (e.target.name === "engine") refreshPrices(); // valor exato pela cilindrada
  if (e.target.name === "band") {
    engineSelect.value = e.target.value;
    engineSelect.removeAttribute("aria-invalid");
    refreshPrices();
  }
  if (e.target.name === "extras") {
    setSummary("service", serviceText());
    refreshPrices();
  }
  if (e.target.name === "service") {
    setSummary("service", serviceText());
    refreshPrices();
  }
  if (e.target.matches("[aria-invalid]"))
    e.target.removeAttribute("aria-invalid");
});

// Botões "Agendar este" dos cartões de serviço
$$(".pick").forEach((btn) =>
  btn.addEventListener("click", () => {
    const service = btn.dataset.service;
    const v = SERVICES[service]?.motoOnly
      ? "moto"
      : servicesSection.dataset.vehicle;
    setFormVehicle(v);
    const input = $$('input[name="service"], input[name="extras"]', form).find(
      (i) => i.value === service,
    );
    if (input) {
      input.checked = true;
      setSummary("service", serviceText());
      refreshPrices();
    }
    $("#agendar").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => modelInput.focus({ preventScroll: true }), 600);
  }),
);

// Faixa de dias (só dias de atendimento)
const isoLocal = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
const longDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
function buildDays() {
  const today = new Date();
  daysEl.replaceChildren();
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i,
    );
    if (!OPEN_DAYS.has(d.getDay())) continue;
    const iso = isoLocal(d);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day";
    btn.dataset.date = iso;
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute(
      "aria-label",
      d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    );
    const wd = document.createElement("small");
    wd.textContent =
      i === 0
        ? "hoje"
        : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    const dn = document.createElement("b");
    dn.textContent = String(d.getDate()).padStart(2, "0");
    const mo = document.createElement("small");
    mo.textContent = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "");
    btn.append(wd, dn, mo);
    btn.addEventListener("click", () => selectDay(btn));
    daysEl.append(btn);
  }
}
function selectDay(btn) {
  $$(".day", daysEl).forEach((b) =>
    b.setAttribute("aria-pressed", String(b === btn)),
  );
  dateInput.value = btn.dataset.date;
  setSummary("date", longDate(btn.dataset.date));
  loadSlots();
}

function hint(text) {
  const span = document.createElement("span");
  span.className = "slot-hint";
  span.textContent = text;
  slotsEl.replaceChildren(span);
}

let slotsRequest = 0;
async function loadSlots() {
  timeInput.value = "";
  setSummary("time", "—");
  const date = dateInput.value;
  if (!date) {
    hint("Escolha um dia para ver os horários livres.");
    return;
  }
  const request = ++slotsRequest;
  hint("Consultando horários…");
  try {
    const response = await fetch(
      `/api/availability?date=${encodeURIComponent(date)}`,
    );
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (request !== slotsRequest) return; // resposta de um dia anterior
    if (!data.slots.length) {
      hint("Sem horários neste dia. Escolha outra data.");
      return;
    }
    slotsEl.replaceChildren();
    data.slots.forEach((slot, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "slot";
      button.textContent = slot.time;
      button.style.setProperty("--i", i);
      button.disabled = !slot.available;
      button.setAttribute(
        "aria-label",
        slot.available ? `${slot.time} livre` : `${slot.time} ocupado`,
      );
      button.addEventListener("click", () => {
        $$(".slot", slotsEl).forEach((item) =>
          item.classList.remove("selected"),
        );
        button.classList.add("selected");
        timeInput.value = slot.time;
        setSummary("time", slot.time);
      });
      slotsEl.append(button);
    });
  } catch {
    if (request === slotsRequest)
      hint(
        "Não foi possível consultar a agenda agora. Tente de novo em instantes ou chame no WhatsApp.",
      );
  }
}

function message(text, type = "error") {
  feedback.className = `form-feedback visible ${type}`;
  feedback.textContent = text;
}

function validate() {
  const required = ["motorcycle", "engine", "name", "phone"];
  let firstInvalid = null;
  required.forEach((name) => {
    const el = form.elements[name];
    const ok = el.value.trim() && el.checkValidity();
    if (ok) el.removeAttribute("aria-invalid");
    else el.setAttribute("aria-invalid", "true");
    if (!ok && !firstInvalid) firstInvalid = el;
  });
  if (!selectedService() && !selectedExtras().length)
    return "Escolha um serviço.";
  if (!dateInput.value) return "Escolha um dia.";
  if (!timeInput.value) return "Escolha um dos horários livres.";
  if (firstInvalid) {
    firstInvalid.focus();
    return "Preencha os campos destacados.";
  }
  if (!form.elements.consent.checked)
    return "Marque a autorização de uso dos dados para continuar.";
  return "";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedback.className = "form-feedback";
  const problem = validate();
  if (problem) {
    message(problem);
    return;
  }

  // Reserva a aba enquanto ainda há gesto do usuário; navegadores bloqueiam
  // janelas abertas só depois da resposta da API.
  const whatsappWindow = window.open("about:blank", "_blank");
  if (whatsappWindow) {
    whatsappWindow.opener = null;
    whatsappWindow.document.title = "Preparando seu WhatsApp…";
    whatsappWindow.document.body.textContent =
      "Agendamento sendo salvo. Aguarde…";
  }
  const submit = $('[type="submit"]', form);
  submit.disabled = true;
  submit.textContent = "Enviando solicitação…";
  const payload = Object.fromEntries(new FormData(form).entries());
  delete payload.vehicle;
  delete payload.band;
  // Lavagem + adicionais: sem lavagem, o primeiro adicional vira o serviço.
  const extras = selectedExtras();
  payload.service = selectedService() || extras.shift() || "";
  payload.extras = extras;
  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.error || "Não foi possível concluir o pedido.");
    message(
      `Pedido salvo! Protocolo ${result.booking.id}. O WhatsApp vai abrir com os dados; toque em Enviar para avisar a equipe.`,
      "success",
    );
    const text = [
      `Olá! Fiz uma solicitação de agendamento na JV. Protocolo ${result.booking.id}.`,
      `${payload.name} — ${payload.phone}`,
      `${payload.motorcycle} (${payload.engine})`,
      `${[payload.service, ...extras].join(" + ")} — ${longDate(payload.date)} às ${payload.time}`,
      payload.notes ? `Observação: ${payload.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const whatsappUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
    if (whatsappWindow) whatsappWindow.location.replace(whatsappUrl);
    const link = document.createElement("a");
    link.href = whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir WhatsApp novamente ↗";
    feedback.append(document.createElement("br"), link);
    document.dispatchEvent(
      new CustomEvent("jv:booked", {
        detail: {
          ...payload,
          service: [payload.service, ...extras].join(" + "),
          id: result.booking.id,
          access: result.booking.access,
          vehicle: vehicle(),
        },
      }),
    );
    const v = vehicle();
    form.reset();
    setFormVehicle(v);
    $$(".day", daysEl).forEach((b) => b.setAttribute("aria-pressed", "false"));
    dateInput.value = "";
    timeInput.value = "";
    ["service", "date", "time"].forEach((k) => setSummary(k, "—"));
    hint("Escolha um dia para ver os horários livres.");
  } catch (error) {
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
    message(
      error.message ||
        "Não foi possível enviar. Confira sua conexão e tente novamente.",
    );
    if (/horário/i.test(error.message)) loadSlots();
  } finally {
    submit.disabled = false;
    submit.innerHTML =
      'Solicitar agendamento <span aria-hidden="true">↗</span>';
  }
});

buildDays();
setFormVehicle("moto");

// Serviços desligados pelo João no JV Sistema somem do agendamento online.
fetch("/api/booking-config", { cache: "no-store" })
  .then((r) => (r.ok ? r.json() : null))
  .then((cfg) => {
    if (Array.isArray(cfg?.openDays)) {
      const days = new Set(cfg.openDays);
      if ([...days].join() !== [...OPEN_DAYS].join()) {
        OPEN_DAYS = days;
        buildDays();
      }
    }
    if (cfg?.prices) applyPrices(cfg.prices);
    const off = cfg?.disabledServices ?? [];
    if (!off.length) return;
    $$('input[name="service"]', form).forEach((input) => {
      if (!off.includes(input.value)) return;
      input.checked = false;
      input.disabled = true;
      input.closest("label").style.display = "none";
    });
    $$(".pick").forEach((btn) => {
      if (off.includes(btn.dataset.service)) btn.style.display = "none";
    });
  })
  .catch(() => {});

// Preços editados no JV Sistema: atualiza a tabela usada no agendamento e os
// textos dos cartões de serviço (as duas versões do site).
function applyPrices(prices) {
  const reais = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
  Object.entries(prices).forEach(([service, p]) => {
    const info = SERVICES[service];
    if (!info) return;
    info.moto = p.moto;
    info.carro = p.carro;
    const btn = document.querySelector(`.pick[data-service="${CSS.escape(service)}"]`);
    // O cartão inteiro do serviço (inclui o resumo com o preço "a partir de").
    let box = btn?.closest("details, article, li");
    if (!box?.querySelector(".tiers, .extra-price, .row-price")) {
      box = btn;
      for (let i = 0; box && i < 5; i++) {
        box = box.parentElement;
        if (box?.querySelector(".tiers, .extra-price, .row-price")) break;
      }
    }
    if (box) {
      if (Array.isArray(p.moto)) {
        const tiers = box.querySelector(".tiers");
        if (tiers) {
          const labels = ["Até 160cc", "160 a 400cc", "Acima de 400cc"];
          tiers.replaceChildren();
          // Uma faixa por linha, com o preço do lado.
          labels.forEach((label, i) => {
            const row = document.createElement("span");
            row.className = "tier";
            const b = document.createElement("b");
            b.textContent = reais(p.moto[i]);
            row.append(`${label} `, b);
            tiers.append(row);
          });
        }
        const from = [...box.querySelectorAll(".only-moto")].find((el) => !el.classList.contains("tiers"));
        if (from) {
          const small = from.querySelector("small");
          if (small) from.replaceChildren(small, `R$ ${Number(p.moto[0]).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          else from.textContent = `a partir de ${reais(p.moto[0])}`;
        }
        const car = box.querySelector(".only-carro");
        if (car && Array.isArray(p.carro)) {
          const small = car.querySelector("small");
          const value = `R$ ${Number(Math.min(...p.carro)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
          if (small) car.replaceChildren(small, value);
          else car.textContent = `a partir de ${reais(Math.min(...p.carro))}`;
        }
      } else {
        const fixed = box.querySelector(".extra-price") || box.querySelector(".row-price");
        if (fixed) fixed.textContent = fixed.classList.contains("extra-price")
          ? `R$ ${Number(p.moto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : reais(p.moto);
      }
    }
    // Chips dos adicionais no formulário (preço fixo).
    const chip = document.querySelector(`input[name="service"][value="${CSS.escape(service)}"]`)?.closest("label")?.querySelector("small:not([data-price])");
    if (chip && !Array.isArray(p.moto)) chip.textContent = `R$ ${Number(p.moto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  });
  refreshPrices();
}
