const { login } = require('../../lib/adminAuth');

// Serverless Function da Vercel: recebe a senha via POST (nunca em query string)
// e devolve um token temporário para as demais rotas do painel.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ erro: 'Método não permitido.' });
    return;
  }

  const { senha } = req.body || {};
  const resultado = login(senha);

  if (!resultado.ok) {
    res.status(resultado.status).json({ erro: resultado.erro });
    return;
  }

  res.status(200).json({ token: resultado.token, expiresAt: resultado.expiresAt });
};
