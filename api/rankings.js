const { listarRanking, cadastrarNota } = require('../lib/ranking');

// Serverless Function da Vercel: GET lista o ranking, POST cadastra uma nova nota.
module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { page, limit, q } = req.query || {};
      const ranking = await listarRanking({ page, limit, q });
      res.status(200).json(ranking);
      return;
    }

    if (req.method === 'POST') {
      const entry = await cadastrarNota(req.body || {});
      res.status(201).json(entry);
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ erro: 'Método não permitido.' });
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
  }
};
