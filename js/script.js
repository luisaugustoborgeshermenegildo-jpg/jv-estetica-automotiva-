const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", isOpen);
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

document.getElementById("year").textContent = new Date().getFullYear();

const WHATSAPP_NUMBER = "553484266406";

const plans = [
  { select: "select-completa", price: "price-completa", cta: "cta-completa", name: "Lavagem Completa" },
  { select: "select-detalhada", price: "price-detalhada", cta: "cta-detalhada", name: "Lavagem Detalhada" },
  { select: "select-premium", price: "price-premium", cta: "cta-premium", name: "Lavagem Premium" },
];

function updatePlan(plan) {
  const select = document.getElementById(plan.select);
  const priceEl = document.getElementById(plan.price);
  const ctaEl = document.getElementById(plan.cta);

  const option = select.options[select.selectedIndex];
  const price = option.value;
  const range = option.dataset.range;
  const formattedPrice = Number(price).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  priceEl.textContent = `R$ ${formattedPrice}`;

  const message = `Olá! Quero agendar a ${plan.name} (${range}) — R$ ${formattedPrice}.`;
  ctaEl.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

plans.forEach((plan) => {
  const select = document.getElementById(plan.select);
  select.addEventListener("change", () => updatePlan(plan));
  updatePlan(plan);
});
