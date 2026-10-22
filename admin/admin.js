const loginCard = document.querySelector('#loginCard');
const loginForm = document.querySelector('#loginForm');
const loginStatus = document.querySelector('#loginStatus');
const setupCard = document.querySelector('#setupCard');
const setupForm = document.querySelector('#setupForm');
const setupStatus = document.querySelector('#setupStatus');
const dashboard = document.querySelector('#dashboard');
const dashboardStatus = document.querySelector('#dashboardStatus');
const bookingList = document.querySelector('#bookingList');
const bookingCount = document.querySelector('#bookingCount');
const passwordInput = document.querySelector('#password');

function setStatus(element, text, success = false) {
  element.textContent = text;
  element.classList.toggle('success', success);
}

function showDashboard() {
  loginCard.classList.add('hidden');
  setupCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  loadBookings();
}

function showLogin() {
  setupCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  loginForm.classList.remove('hidden');
}

function renderBookings(bookings) {
  bookingList.replaceChildren();
  bookingCount.textContent = `${bookings.length} ${bookings.length === 1 ? 'pedido' : 'pedidos'}`;
  if (!bookings.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Nenhum agendamento recebido ainda.';
    bookingList.append(empty);
    return;
  }

  bookings.forEach(booking => {
    const card = document.createElement('article');
    card.className = 'booking-card';
    const head = document.createElement('div');
    head.className = 'booking-card-head';
    const title = document.createElement('h2');
    title.textContent = `${booking.name} · ${booking.time}`;
    const protocol = document.createElement('span');
    protocol.className = 'eyebrow';
    protocol.textContent = `#${booking.id}`;
    head.append(title, protocol);
    card.append(head);

    const formattedDate = new Date(`${booking.date}T12:00:00`).toLocaleDateString('pt-BR', { dateStyle: 'long' });
    const details = [
      ['Data', formattedDate], ['WhatsApp', booking.phone], ['Moto', `${booking.motorcycle} · ${booking.engine}`],
      ['Serviço', booking.service], ['Observação', booking.notes || 'Nenhuma'], ['Situação', booking.status === 'pending' ? 'Aguardando confirmação' : booking.status]
    ];
    details.forEach(([label, value]) => {
      const line = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      line.append(strong, document.createTextNode(value));
      card.append(line);
    });
    const phoneDigits = booking.phone.replace(/\D/g, '');
    const internationalPhone = phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`;
    if (phoneDigits.length >= 10) {
      const contact = document.createElement('a');
      contact.className = 'contact-link';
      contact.href = `https://wa.me/${internationalPhone}`;
      contact.target = '_blank';
      contact.rel = 'noopener noreferrer';
      contact.textContent = 'Chamar cliente pelo WhatsApp ↗';
      card.append(contact);
    }
    const created = document.createElement('p');
    created.className = 'booking-meta';
    created.textContent = `Recebido em ${new Date(booking.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`;
    card.append(created);
    bookingList.append(card);
  });
}

async function loadBookings() {
  setStatus(dashboardStatus, 'Carregando agendamentos…');
  try {
    const response = await fetch('/api/admin/bookings', { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401) {
      dashboard.classList.add('hidden');
      loginCard.classList.remove('hidden');
      setStatus(loginStatus, 'Sua sessão expirou. Entre novamente.');
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível carregar a agenda.');
    renderBookings(data.bookings);
    setStatus(dashboardStatus, `Agenda atualizada às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`, true);
  } catch (error) {
    setStatus(dashboardStatus, error.message || 'Não foi possível carregar a agenda.');
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  setStatus(loginStatus, 'Verificando acesso…');
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível entrar.');
    passwordInput.value = '';
    showDashboard();
  } catch (error) {
    setStatus(loginStatus, error.message || 'Não foi possível entrar.');
  } finally {
    button.disabled = false;
  }
});

setupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = setupForm.querySelector('button');
  const codeInput = document.querySelector('#setupCode');
  const newPassword = document.querySelector('#newPassword');
  const confirmPassword = document.querySelector('#confirmPassword');
  if (newPassword.value !== confirmPassword.value) {
    setStatus(setupStatus, 'As senhas não são iguais. Confira e tente de novo.');
    return;
  }
  button.disabled = true;
  setStatus(setupStatus, 'Configurando seu acesso…');
  try {
    const response = await fetch('/api/admin/setup', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput.value, password: newPassword.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível configurar o acesso.');
    codeInput.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    showDashboard();
  } catch (error) {
    setStatus(setupStatus, error.message || 'Não foi possível configurar o acesso.');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refreshButton').addEventListener('click', loadBookings);
document.querySelector('#logoutButton').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
  dashboard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  setStatus(loginStatus, 'Você saiu do painel.', true);
});

async function initialize() {
  try {
    const response = await fetch('/api/admin/status', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível verificar o painel.');
    if (data.mode === 'setup') {
      loginCard.classList.add('hidden');
      setupCard.classList.remove('hidden');
      return;
    }
    if (data.mode === 'disabled') {
      loginCard.classList.add('hidden');
      setupCard.classList.remove('hidden');
      setupForm.classList.add('hidden');
      setStatus(setupStatus, 'A configuração inicial está pendente. O responsável precisa ativar o código privado na Netlify.');
      return;
    }
    showLogin();
    const session = await fetch('/api/admin/bookings', { credentials: 'same-origin', cache: 'no-store' });
    if (session.ok) showDashboard();
  } catch (error) {
    loginCard.classList.remove('hidden');
    loginForm.classList.add('hidden');
    setStatus(loginStatus, error.message || 'O painel não está disponível agora.');
  }
}

initialize();
