'use strict';
document.documentElement.classList.add('js');

const form = document.querySelector('#bookingForm');
const dateInput = document.querySelector('#dateInput');
const serviceSelect = document.querySelector('#serviceSelect');
const slotsEl = document.querySelector('#slots');
const timeInput = document.querySelector('#timeInput');
const feedback = document.querySelector('#formFeedback');
const submit = form.querySelector('[type="submit"]');
const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const prices = {
  'Lavagem completa': 'A partir de R$ 50,00',
  'Lavagem detalhada': 'A partir de R$ 100,00',
  'Lavagem premium': 'A partir de R$ 115,00',
  'Limpeza e lubrificação da corrente': 'R$ 20,00',
  'Revitalização de plásticos': 'R$ 40,00'
};
let slotRequest;
let slotVersion = 0;
let sending = false;
let selectedDate = '';
document.querySelector('#year').textContent = new Date().getFullYear();
submit.disabled = false;

function closeMenu(restoreFocus = false) {
  nav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Abrir menu');
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.header')) closeMenu();
});
matchMedia('(min-width: 901px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});
document.querySelectorAll('[data-vehicle]').forEach(button => {
  button.addEventListener('click', () => {
    const car = button.dataset.vehicle === 'carro';
    document.querySelector('#moto-services').hidden = car;
    document.querySelector('#car-services').hidden = !car;
    document.querySelectorAll('[data-vehicle]').forEach(item =>
      item.setAttribute('aria-pressed', String(item === button)));
  });
});

function localToday() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}
dateInput.min = localToday();
function summary() {
  document.querySelector('#selectedService').textContent =
    serviceSelect.value || 'Escolha um cuidado para começar.';
  document.querySelector('#selectedPrice').textContent = prices[serviceSelect.value] || '—';
}
document.querySelectorAll('.pick-service').forEach(button => {
  button.addEventListener('click', () => {
    if (sending) return;
    serviceSelect.value = button.dataset.service;
    serviceSelect.dispatchEvent(new Event('change'));
    // Keep focus and the visible field together, including below a sticky header.
    serviceSelect.scrollIntoView({ behavior: 'instant', block: 'center' });
    serviceSelect.focus({ preventScroll: true });
  });
});

function hint(text) {
  const span = document.createElement('span');
  span.className = 'slot-hint';
  span.textContent = text;
  slotsEl.replaceChildren(span);
}
function message(text, type = 'error') {
  feedback.className = 'form-feedback visible ' + type;
  feedback.textContent = text;
  feedback.focus({ preventScroll: false });
}
function validDay() {
  dateInput.min = localToday();
  dateInput.setCustomValidity('');
  const date = dateInput.value;
  if (!date) return false;
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  if (date < dateInput.min) {
    dateInput.setCustomValidity('Escolha uma data a partir de hoje.');
    return false;
  }
  if (day === 1) {
    dateInput.setCustomValidity('A JV atende de terça a domingo. Escolha outro dia.');
    return false;
  }
  return true;
}
async function loadSlots() {
  const version = ++slotVersion;
  slotRequest?.abort();
  slotsEl.removeAttribute('aria-busy');
  timeInput.value = '';
  selectedDate = '';
  dateInput.setCustomValidity('');
  if (!dateInput.value || !serviceSelect.value) {
    hint('Selecione um serviço e um dia para consultar.');
    return;
  }
  if (!validDay()) {
    hint(dateInput.validationMessage);
    return;
  }
  slotRequest = new AbortController();
  const controller = slotRequest;
  const requestedDate = dateInput.value;
  hint('Consultando horários…');
  slotsEl.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/availability?date=' + encodeURIComponent(requestedDate),
      { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error('Agenda indisponível.');
    const data = await response.json();
    if (version !== slotVersion) return;
    if (!Array.isArray(data.slots)) throw new Error('Resposta inválida.');
    const slots = data.slots.filter(slot =>
      typeof slot.time === 'string' && /^\d{2}:\d{2}$/.test(slot.time) &&
      typeof slot.available === 'boolean');
    if (!slots.length || !slots.some(slot => slot.available)) {
      hint('Sem horários livres neste dia. Escolha outra data.');
      return;
    }
    slotsEl.replaceChildren();
    slots.forEach(slot => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slot';
      button.textContent = slot.time;
      button.disabled = !slot.available;
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', slot.time + (slot.available ? ' disponível' : ' indisponível'));
      button.addEventListener('click', () => {
        slotsEl.querySelectorAll('.slot').forEach(item => {
          item.classList.remove('selected');
          item.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
        timeInput.value = slot.time;
        selectedDate = requestedDate;
      });
      slotsEl.append(button);
    });
  } catch (error) {
    if (version !== slotVersion || error.name === 'AbortError') return;
    hint('Não foi possível consultar a agenda. Tente outra vez ou fale com a equipe pelo WhatsApp.');
  } finally {
    if (version === slotVersion) slotsEl.removeAttribute('aria-busy');
  }
}
slotsEl.setAttribute('aria-live', 'polite');
dateInput.addEventListener('change', loadSlots);
serviceSelect.addEventListener('change', () => { summary(); loadSlots(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  feedback.className = 'form-feedback';
  feedback.replaceChildren();
  if (!validDay()) { dateInput.reportValidity(); return; }
  const phone = form.elements.phone;
  const digits = phone.value.replace(/\D/g, '');
  phone.setCustomValidity(digits.length >= 10 && digits.length <= 13
    ? '' : 'Informe seu WhatsApp com DDD.');
  if (!form.reportValidity()) return;
  if (!timeInput.value || selectedDate !== dateInput.value) {
    message('Selecione um dos horários livres antes de continuar.');
    return;
  }
  const payload = Object.fromEntries(new FormData(form).entries());
  const originalContent = submit.innerHTML;
  sending = true;
  submit.disabled = true;
  submit.textContent = 'Enviando solicitação…';
  // Keep the submitted values stable while the request is pending.
  const controls = Array.from(form.elements).filter(control => control !== submit && !control.disabled);
  controls.forEach(control => { control.disabled = true; });
  let whatsappWindow = null;
  try {
    whatsappWindow = window.open('about:blank', '_blank');
    if (whatsappWindow) {
      whatsappWindow.opener = null;
      whatsappWindow.document.title = 'Preparando seu WhatsApp…';
      whatsappWindow.document.body.textContent = 'Salvando sua solicitação. Aguarde…';
    }
    const response = await fetch('/api/bookings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('Não foi possível ler a resposta. Consulte a equipe antes de reenviar.'); }
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar. Confira sua conexão e tente novamente.');
    if (typeof result.booking?.id !== 'string' || !result.booking.id) {
      throw new Error('A confirmação não chegou completa. Consulte a equipe antes de reenviar.');
    }
    const id = result.booking.id;
    const whatsappMessage = [
      'Olá! Solicitei um agendamento na JV. Protocolo ' + id + '.',
      payload.name + ' — ' + payload.phone,
      payload.motorcycle + ' (' + payload.engine + ')',
      payload.service + ' — ' + payload.date + ' às ' + payload.time,
      payload.notes ? 'Observação: ' + payload.notes : ''
    ].filter(Boolean).join('\n');
    const url = 'https://wa.me/5534984266406?text=' + encodeURIComponent(whatsappMessage);
    message('Pedido salvo! Protocolo ' + id + '. A equipe ainda precisa confirmar. Envie a mensagem no WhatsApp para combinar os detalhes.', 'success');
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.location.replace(url);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Abrir mensagem no WhatsApp';
    feedback.append(link);
    controls.forEach(control => { control.disabled = false; });
    form.reset();
    ++slotVersion;
    slotRequest?.abort();
    timeInput.value = '';
    selectedDate = '';
    hint('Selecione um serviço e um dia para consultar.');
    dateInput.min = localToday();
    summary();
  } catch (error) {
    if (whatsappWindow && !whatsappWindow.closed) whatsappWindow.close();
    message(error.message || 'Não foi possível enviar. Confira sua conexão e tente novamente.');
    if (error.message?.includes('horário')) {
      await loadSlots();
    }
  } finally {
    controls.forEach(control => { control.disabled = false; });
    submit.disabled = false;
    submit.innerHTML = originalContent;
    sending = false;
  }
});
form.elements.phone.addEventListener('input', event => event.target.setCustomValidity(''));
