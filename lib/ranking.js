const crypto = require('crypto');
const store = require('./store');

const TOTAL_QUESTOES = 50;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEntrada(body) {
  const erros = [];
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const idade = Number(body.idade);
  const acertos = Number(body.acertos);

  if (!nome || nome.length < 2 || nome.length > 80) {
    erros.push('Nome inválido (2 a 80 caracteres).');
  }
  if (!EMAIL_REGEX.test(email)) {
    erros.push('E-mail inválido.');
  }
  if (!Number.isInteger(idade) || idade < 10 || idade > 100) {
    erros.push('Idade inválida (10 a 100).');
  }
  if (!Number.isInteger(acertos) || acertos < 0 || acertos > TOTAL_QUESTOES) {
    erros.push(`Número de acertos inválido (0 a ${TOTAL_QUESTOES}).`);
  }

  return { erros, nome, email, idade, acertos };
}

const LIMITE_PADRAO = 30;

async function listarRanking({ page = 1, limit = LIMITE_PADRAO, q = '' } = {}) {
  const entradas = await store.getAll();

  // E-mail é coletado no cadastro mas nunca exposto no ranking público.
  // A posição reflete o ranking geral (antes do filtro de busca), não a posição só entre os resultados filtrados.
  const comPosicao = entradas.map((e, i) => {
    const { email, ...semEmail } = e;
    return { posicao: i + 1, ...semEmail };
  });

  const termo = String(q || '').trim().toLowerCase();
  const filtrado = termo ? comPosicao.filter((e) => e.nome.toLowerCase().includes(termo)) : comPosicao;

  const limitNum = Math.max(1, Number(limit) || LIMITE_PADRAO);
  const total = filtrado.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const paginaAtual = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const inicio = (paginaAtual - 1) * limitNum;

  return {
    itens: filtrado.slice(inicio, inicio + limitNum),
    total,
    totalPages,
    page: paginaAtual,
    limit: limitNum,
  };
}

async function cadastrarNota(body) {
  const { erros, nome, email, idade, acertos } = validarEntrada(body);
  if (erros.length > 0) {
    const err = new Error(erros.join(' '));
    err.status = 400;
    throw err;
  }

  const entry = {
    id: crypto.randomUUID(),
    nome,
    email,
    idade,
    acertos,
    total: TOTAL_QUESTOES,
    data: new Date().toISOString(),
  };

  await store.addEntry(entry);
  return entry;
}

async function listarRankingCompleto() {
  // Usado apenas pelo painel admin: inclui o e-mail de cada cadastro.
  const entradas = await store.getAll();
  return entradas.map((e, i) => ({ posicao: i + 1, ...e }));
}

async function removerNota(id) {
  if (!id) {
    const err = new Error('id é obrigatório.');
    err.status = 400;
    throw err;
  }
  await store.removeEntry(id);
}

module.exports = {
  listarRanking,
  cadastrarNota,
  listarRankingCompleto,
  removerNota,
  TOTAL_QUESTOES,
};
