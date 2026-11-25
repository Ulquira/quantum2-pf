import crypto from 'crypto';

export const hashPassword = (plain: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
};

export const verificarPassword = (
  plain: string,
  hashGuardado: string | null,
  dniFallback: string
): boolean => {
  if (!hashGuardado) return plain === dniFallback;
  if (!hashGuardado.includes(':')) return plain === hashGuardado;
  const [salt, key] = hashGuardado.split(':');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
};
