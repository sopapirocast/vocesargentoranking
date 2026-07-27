const { listarParaExportacao } = require('../../lib/ranking');
const { checarAcesso } = require('../../lib/adminAuth');
const { gerarPlanilha } = require('../../lib/exportXlsx');

// Serverless Function da Vercel: exporta todos os cadastros (com e-mail e telefone) em .xlsx.
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
    const entradas = await listarParaExportacao();
    const buffer = await gerarPlanilha(entradas);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ranking-nota-esa.xlsx"');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
};
