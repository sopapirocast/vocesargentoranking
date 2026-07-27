const { listarRankingCompleto } = require('../../lib/ranking');
const { checarAcesso } = require('../../lib/adminAuth');

// Serverless Function da Vercel: lista o ranking completo (com e-mail) para o painel admin.
module.exports = async function handler(req, res) {
  const acesso = checarAcesso(req.headers['x-admin-token']);
  if (!acesso.ok) {
    res.status(acesso.status).json({ erro: acesso.erro });
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ erro: 'Método não permitido.' });
    return;
  }

  try {
    const ranking = await listarRankingCompleto();
    res.status(200).json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
};
