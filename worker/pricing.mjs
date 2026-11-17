// Catálogo de serviços da JV: preços (em reais), tempo médio e comissão.
// Os 7 serviços são os que o site oferece; o João edita preços e regras no JV Sistema.
export const MOTO_BANDS = ['Até 160cc', '160cc a 400cc', 'Acima de 400cc'];
export const CAR_BANDS = ['Carro hatch ou sedã', 'Carro SUV ou picape'];
// Faixas antigas que ainda podem existir em agendamentos guardados.
const OLD_MOTO = { '161cc a 400cc': 1, '150cc – 400cc': 1, '400cc – 900cc': 2, 'Mais de 900cc': 2 };

export const DEFAULT_CATALOG = {
  'Lavagem completa': { moto: [70, 100, 120], carro: null, minutes: 105, commission: 15 },
  'Lavagem detalhada': { moto: [110, 130, 150], carro: null, minutes: 165, commission: 15 },
  'Lavagem premium': { moto: [125, 140, 170], carro: null, minutes: 255, commission: 15 },
  'Limpeza e lubrificação da corrente': { moto: 20, minutes: 20, commission: 10, motoOnly: true },
  'Revitalização de plásticos': { moto: 40, minutes: 30, commission: 10, motoOnly: true },
  'Clareamento do bacalhau': { moto: 25, minutes: 30, commission: 10, motoOnly: true },
  'Clareamento do motor': { moto: 30, minutes: 30, commission: 10, motoOnly: true },
};

// Preço (centavos) de um serviço para a cilindrada/porte escolhido; 0 quando "sob consulta".
export function priceCents(catalog, service, engine) {
  const item = catalog[service];
  if (!item) return 0;
  if (CAR_BANDS.includes(engine)) {
    const i = CAR_BANDS.indexOf(engine);
    return Array.isArray(item.carro) ? Math.round((item.carro[i] ?? 0) * 100) : 0;
  }
  if (typeof item.moto === 'number') return Math.round(item.moto * 100);
  const i = MOTO_BANDS.includes(engine) ? MOTO_BANDS.indexOf(engine) : OLD_MOTO[engine] ?? 0;
  return Math.round((item.moto[i] ?? 0) * 100);
}

const price = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000;

// Valida a edição de um serviço; devolve o item novo ou null.
export function editCatalogItem(current, patch) {
  const next = structuredClone(current);
  if (patch.moto !== undefined) {
    if (typeof current.moto === 'number') {
      if (!price(patch.moto)) return null;
      next.moto = Math.round(patch.moto * 100) / 100;
    } else {
      if (!Array.isArray(patch.moto) || patch.moto.length !== 3 || !patch.moto.every(price)) return null;
      next.moto = patch.moto.map(v => Math.round(v * 100) / 100);
    }
  }
  if (patch.carro !== undefined && !current.motoOnly) {
    if (patch.carro === null) next.carro = null;
    else if (Array.isArray(patch.carro) && patch.carro.length === 2 && patch.carro.every(price)) next.carro = patch.carro.map(v => Math.round(v * 100) / 100);
    else return null;
  }
  if (patch.minutes !== undefined) {
    if (!Number.isInteger(patch.minutes) || patch.minutes < 5 || patch.minutes > 600) return null;
    next.minutes = patch.minutes;
  }
  if (patch.commission !== undefined) {
    if (typeof patch.commission !== 'number' || patch.commission < 0 || patch.commission > 60) return null;
    next.commission = Math.round(patch.commission * 10) / 10;
  }
  return next;
}
