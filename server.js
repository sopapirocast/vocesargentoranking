require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const path = require('path');
const express = require('express');
const { listarRanking, cadastrarNota, listarRankingCompleto, listarParaExportacao, removerNota } = require('./lib/ranking');
const { login, checarAcesso } = require('./lib/adminAuth');
const { gerarPlanilha } = require('./lib/exportXlsx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function exigirPainel(req, res, next) {
  const acesso = checarAcesso(req.headers['x-admin-token']);
  if (!acesso.ok) {
    res.status(acesso.status).json({ erro: acesso.erro });
    return;
  }
  next();
}

app.get('/api/rankings', async (req, res) => {
  try {
    const { page, limit, q, tipo } = req.query;
    const ranking = await listarRanking({ page, limit, q, tipo });
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.post('/api/rankings', async (req, res) => {
  try {
    const entry = await cadastrarNota(req.body || {});
    res.status(201).json(entry);
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.post('/api/painel/login', (req, res) => {
  const { senha } = req.body || {};
  const resultado = login(senha);
  if (!resultado.ok) {
    res.status(resultado.status).json({ erro: resultado.erro });
    return;
  }
  res.status(200).json({ token: resultado.token, expiresAt: resultado.expiresAt });
});

app.get('/api/painel/rankings', exigirPainel, async (req, res) => {
  try {
    const ranking = await listarRankingCompleto();
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.get('/api/painel/export', exigirPainel, async (req, res) => {
  try {
    const entradas = await listarParaExportacao();
    const buffer = await gerarPlanilha(entradas);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ranking-nota-esa.xlsx"');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.delete('/api/painel/rankings/:id', exigirPainel, async (req, res) => {
  try {
    await removerNota(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ranking Nota Esa rodando em http://localhost:${PORT}`);
});
