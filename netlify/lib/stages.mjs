import { createHash, randomBytes } from 'node:crypto';

// Etapas da ordem de serviço. "confirmed" fica por compatibilidade com pedidos antigos.
export const STATUSES = new Set(['pending', 'confirmed', 'received', 'washing', 'ready', 'delivered', 'cancelled']);

// Código que o cliente usa para acompanhar a OS: 144 bits aleatórios; o banco guarda só o hash.
export const newAccessCode = () => randomBytes(18).toString('base64url');
export const hashAccessCode = code => createHash('sha256').update(code).digest('hex');
export const isAccessCode = code => typeof code === 'string' && /^[A-Za-z0-9_-]{24}$/.test(code);
