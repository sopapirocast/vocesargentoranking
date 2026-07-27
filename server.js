require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const path = require('path');
const express = require('express');
const { listarRanking, cadastrarNota, listarRankingCompleto, removerNota } = require('./lib/ranking');
const { checarAcesso } = require('./lib/adminAuth');
const { gerarPlanilha } = require('./lib/exportXlsx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function exigirAdmin(req, res, next) {
  const acesso = checarAcesso(req.headers['x-admin-key']);
  if (!acesso.ok) {
    res.status(acesso.status).json({ erro: acesso.erro });
    return;
  }
  next();
}

app.get('/api/rankings', async (req, res) => {
  try {
    const { page, limit, q } = req.query;
    const ranking = await listarRanking({ page, limit, q });
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

app.get('/api/admin/rankings', exigirAdmin, async (req, res) => {
  try {
    const ranking = await listarRankingCompleto();
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.get('/api/admin/export', exigirAdmin, async (req, res) => {
  try {
    const entradas = await listarRankingCompleto();
    const buffer = await gerarPlanilha(entradas);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="ranking-nota-esa.xlsx"');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ erro: err.message || 'Erro interno.' });
  }
});

app.delete('/api/admin/rankings/:id', exigirAdmin, async (req, res) => {
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
