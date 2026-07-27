const crypto = require('crypto');

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Verifica o header "x-admin-key" contra ADMIN_PASSWORD.
// Retorna { ok: true } ou { ok: false, status, erro }.
function checarAcesso(headerValue) {
  const senha = process.env.ADMIN_PASSWORD;

  if (!senha) {
    return { ok: false, status: 500, erro: 'ADMIN_PASSWORD não configurado no servidor.' };
  }
  if (!headerValue || !timingSafeEqual(headerValue, senha)) {
    return { ok: false, status: 401, erro: 'Senha de administrador inválida.' };
  }
  return { ok: true };
}

module.exports = { checarAcesso };
