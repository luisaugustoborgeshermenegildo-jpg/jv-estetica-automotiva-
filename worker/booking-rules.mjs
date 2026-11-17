// Validação dos campos de um agendamento (site do cliente e "Novo agendamento" do sistema).
import { SERVICES, ENGINES, MOTO_ENGINES, MOTO_ONLY_SERVICES, localToday } from './rules.mjs';

const KEYS = ['name', 'phone', 'motorcycle', 'service', 'engine', 'date', 'time', 'notes'];

export function checkFields(body) {
  const f = Object.fromEntries(KEYS.map(key => [key, typeof body[key] === 'string' ? body[key].trim() : '']));
  if (KEYS.slice(0, 7).some(key => !f[key])) return { error: 'Preencha todos os campos obrigatórios.' };
  if (!SERVICES.has(f.service) || !ENGINES.has(f.engine) || !/^\d{2}:\d{2}$/.test(f.time)) return { error: 'Serviço, cilindrada/porte ou horário inválido.' };
  if (MOTO_ONLY_SERVICES.has(f.service) && !MOTO_ENGINES.has(f.engine)) return { error: 'Esse serviço adicional é só para motos.' };
  if (f.name.length > 80 || f.phone.length > 20 || f.motorcycle.length > 80 || f.notes.length > 500) return { error: 'Revise os campos: um deles excede o tamanho permitido.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: 'Informe uma data válida.' };
  const chosen = new Date(`${f.date}T12:00:00Z`);
  if (Number.isNaN(chosen.valueOf()) || chosen.toISOString().slice(0, 10) !== f.date || f.date < localToday()) return { error: 'A data escolhida não está disponível. Selecione outro dia.' };
  const digits = (f.phone.match(/\d/g) ?? []).length;
  if (!/^\+?[\d\s().-]+$/.test(f.phone) || digits < 10 || digits > 13) return { error: 'Informe um número de WhatsApp válido.' };
  return { f };
}
