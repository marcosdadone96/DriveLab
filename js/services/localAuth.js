const LS_USER = 'mdr-local-user-v1';

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(LS_USER);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object') return null;
    return u;
  } catch (_) {
    return null;
  }
}

export function registerLocalUser({ name, email, password }) {
  const nm = String(name || '').trim();
  const em = String(email || '').trim().toLowerCase();
  const pw = String(password || '');
  if (!nm || !em || !pw) throw new Error('Complete nombre, email y contraseña.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Email inválido.');
  if (pw.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const user = {
    id: `u_${Date.now()}`,
    name: nm,
    email: em,
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(LS_USER, JSON.stringify(user));
  } catch (_) {
    /* ignore */
  }
  return user;
}

export function clearLocalUser() {
  try {
    localStorage.removeItem(LS_USER);
  } catch (_) {
    /* ignore */
  }
}

