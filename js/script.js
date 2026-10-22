const form = document.querySelector('#bookingForm');
const dateInput = document.querySelector('#dateInput');
const serviceSelect = document.querySelector('#serviceSelect');
const slotsEl = document.querySelector('#slots');
const timeInput = document.querySelector('#timeInput');
const feedback = document.querySelector('#formFeedback');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.header nav');
document.querySelector('#year').textContent = new Date().getFullYear();

menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false');
}));

const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localDate;

function message(text, type = 'error') {
  feedback.className = `form-feedback visible ${type}`;
  feedback.textContent = text;
}

async function loadSlots() {
  timeInput.value = '';
  const date = dateInput.value;
  if (!date || !serviceSelect.value) {
    slotsEl.innerHTML = '<span class="slot-hint">Selecione um serviço e um dia para consultar.</span>';
    return;
  }
  slotsEl.innerHTML = '<span class="slot-hint">Consultando horários…</span>';
  try {
    const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
    if (!response.ok) throw new Error('Não foi possível consultar a agenda.');
    const data = await response.json();
    slotsEl.replaceChildren();
    if (!data.slots.length) {
      slotsEl.innerHTML = '<span class="slot-hint">Sem horários para este dia. Escolha outra data.</span>';
      return;
    }
    data.slots.forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'slot'; button.textContent = slot.time;
      button.disabled = !slot.available;
      if (!slot.available) button.setAttribute('aria-label', `${slot.time} indisponível`);
      button.addEventListener('click', () => {
        slotsEl.querySelectorAll('.slot').forEach(item => item.classList.remove('selected'));
        button.classList.add('selected'); timeInput.value = slot.time;
      });
      slotsEl.append(button);
    });
  } catch (error) {
    slotsEl.innerHTML = '<span class="slot-hint">Agenda indisponível agora. Inicie o site pelo servidor JV para consultar horários.</span>';
  }
}
dateInput.addEventListener('change', loadSlots);
serviceSelect.addEventListener('change', loadSlots);

form.addEventListener('submit', async event => {
  event.preventDefault();
  feedback.className = 'form-feedback';
  if (!timeInput.value) { message('Selecione um dos horários disponíveis antes de continuar.'); return; }
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true; submit.textContent = 'Enviando solicitação…';
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir o pedido.');
    message(`Pedido recebido! Protocolo ${result.booking.id}. Vamos confirmar seu horário pelo WhatsApp.`, 'success');
    const whatsappMessage = [
      `Olá! Fiz uma solicitação de agendamento na JV. Protocolo ${result.booking.id}.`,
      `${payload.name} — ${payload.phone}`,
      `${payload.motorcycle} (${payload.engine})`,
      `${payload.service} — ${payload.date} às ${payload.time}`,
      payload.notes ? `Observação: ${payload.notes}` : ''
    ].filter(Boolean).join('\n');
    const contactLink = document.createElement('a');
    contactLink.href = `https://wa.me/5534984266406?text=${encodeURIComponent(whatsappMessage)}`;
    contactLink.target = '_blank'; contactLink.rel = 'noopener noreferrer';
    contactLink.textContent = 'Avisar a equipe pelo WhatsApp ↗';
    feedback.append(contactLink);
    form.reset(); timeInput.value = ''; slotsEl.innerHTML = '<span class="slot-hint">Selecione um serviço e um dia para consultar.</span>';
    dateInput.min = localDate;
  } catch (error) {
    message(error.message || 'Não foi possível enviar. Confira sua conexão e tente novamente.');
  } finally {
    submit.disabled = false; submit.innerHTML = 'Solicitar agendamento <span>↗</span>';
  }
});
