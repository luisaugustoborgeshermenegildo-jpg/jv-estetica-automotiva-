// Regras do agendamento (iguais às de netlify/functions/bookings.mjs e app.py).
// Quando a Netlify for desligada, este passa a ser o único lugar dessas regras.
export const TIMES = new Set(['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']);
export const SERVICES = new Set([
  'Lavagem completa',
  'Lavagem detalhada',
  'Lavagem premium',
  'Limpeza e lubrificação da corrente',
  'Revitalização de plásticos',
  'Clareamento do bacalhau',
  'Clareamento do motor',
]);
export const MOTO_ENGINES = new Set([
  'Até 160cc', '161cc a 400cc', 'Acima de 400cc',
  // Faixas antigas: aceitas por um tempo, para celulares com a página antiga em cache.
  '150cc – 400cc', '400cc – 900cc', 'Mais de 900cc',
]);
export const CAR_ENGINES = new Set(['Carro hatch ou sedã', 'Carro SUV ou picape']);
export const ENGINES = new Set([...MOTO_ENGINES, ...CAR_ENGINES]);
export const MOTO_ONLY_SERVICES = new Set([
  'Limpeza e lubrificação da corrente',
  'Revitalização de plásticos',
  'Clareamento do bacalhau',
  'Clareamento do motor',
]);
export const OPEN_DAYS = new Set([2, 3, 4, 5, 6, 0]); // terça a domingo
const TZ = 'America/Sao_Paulo';

export function localToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
