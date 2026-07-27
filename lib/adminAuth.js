const crypto = require('crypto');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Gera um token assinado (HMAC) com expiração, sem precisar guardar sessão no servidor.
function gerarToken() {
  const senha = process.env.ADMIN_PASSWORD;
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  const assinatura = crypto.createHmac('sha256', senha).update(payload).digest('hex');
  const token = Buffer.from(`${payload}.${assinatura}`, 'utf8').toString('base64url');
  return { token, expiresAt };
}

function verificarToken(token) {
  const senha = process.env.ADMIN_PASSWORD;
  if (!senha || !token) return false;

  let decodificado;
  try {
    decodificado = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  const [payload, assinatura] = decodificado.split('.');
  if (!payload || !assinatura) return false;

  const esperada = crypto.createHmac('sha256', senha).update(payload).digest('hex');
  if (!timingSafeEqualStr(assinatura, esperada)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

// Verifica a senha enviada no login (POST, nunca em URL) e emite um token temporário.
function login(senhaEnviada) {
  const senhaConfigurada = process.env.ADMIN_PASSWORD;

  if (!senhaConfigurada) {
    return { ok: false, status: 500, erro: 'ADMIN_PASSWORD não configurado no servidor.' };
  }
  if (!senhaEnviada || !timingSafeEqualStr(senhaEnviada, senhaConfigurada)) {
    return { ok: false, status: 401, erro: 'Senha de administrador inválida.' };
  }

  const { token, expiresAt } = gerarToken();
  return { ok: true, token, expiresAt };
}

// Verifica o header "x-admin-token" (emitido pelo login) nas demais rotas do painel.
function checarAcesso(tokenHeaderValue) {
  if (!process.env.ADMIN_PASSWORD) {
    return { ok: false, status: 500, erro: 'ADMIN_PASSWORD não configurado no servidor.' };
  }
  if (!verificarToken(tokenHeaderValue)) {
    return { ok: false, status: 401, erro: 'Sessão inválida ou expirada. Faça login novamente.' };
  }
  return { ok: true };
}

module.exports = { login, checarAcesso };
