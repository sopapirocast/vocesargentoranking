const { removerNota } = require('../../../lib/ranking');
const { checarAcesso } = require('../../../lib/adminAuth');

// Serverless Function da Vercel: remove um cadastro do ranking (painel admin).
module.exports = async function handler(req, res) {
  const acesso = checarAcesso(req.headers['x-admin-key']);
  if (!acesso.ok) {
    res.status(acesso.status).json({ erro: acesso.erro });
    return;
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    res.status(405).json({ erro: 'Método não permitido.' });
    return;
  }

  try {
    const { id } = req.query;
    await removerNota(id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
  }
};
