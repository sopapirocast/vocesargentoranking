const crypto = require('crypto');
const store = require('./store');

const TOTAL_QUESTOES = 50;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEntrada(body) {
  const erros = [];
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const telefone = String(body.telefone || '').trim();
  const idade = Number(body.idade);
  const acertos = Number(body.acertos);
  const cotista = body.cotista === true || body.cotista === 'true' || body.cotista === 'on';

  if (!nome || nome.length < 2 || nome.length > 80) {
    erros.push('Nome inválido (2 a 80 caracteres).');
  }
  if (!EMAIL_REGEX.test(email)) {
    erros.push('E-mail inválido.');
  }
  const digitosTelefone = telefone.replace(/\D/g, '');
  if (digitosTelefone.length < 10 || digitosTelefone.length > 13) {
    erros.push('Telefone inválido.');
  }
  if (!Number.isInteger(idade) || idade < 10 || idade > 100) {
    erros.push('Idade inválida (10 a 100).');
  }
  if (!Number.isInteger(acertos) || acertos < 0 || acertos > TOTAL_QUESTOES) {
    erros.push(`Número de acertos inválido (0 a ${TOTAL_QUESTOES}).`);
  }

  return { erros, nome, email, telefone, idade, acertos, cotista };
}

const LIMITE_PADRAO = 30;

async function listarRanking({ page = 1, limit = LIMITE_PADRAO, q = '', tipo = 'ampla' } = {}) {
  const entradas = await store.getAll();
  const base = tipo === 'cotista' ? entradas.filter((e) => e.cotista) : entradas;

  // E-mail, telefone e a marcação de cotista são coletados no cadastro mas
  // nunca expostos no ranking público. A posição reflete o ranking dentro
  // da classificação escolhida (ampla ou cotista), antes do filtro de busca.
  const comPosicao = base.map((e, i) => {
    const { email, telefone, cotista, ...resto } = e;
    return { posicao: i + 1, ...resto };
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
  const { erros, nome, email, telefone, idade, acertos, cotista } = validarEntrada(body);
  if (erros.length > 0) {
    const err = new Error(erros.join(' '));
    err.status = 400;
    throw err;
  }

  const entry = {
    id: crypto.randomUUID(),
    nome,
    email,
    telefone,
    idade,
    cotista,
    acertos,
    total: TOTAL_QUESTOES,
    data: new Date().toISOString(),
  };

  await store.addEntry(entry);
  return entry;
}

async function listarRankingCompleto() {
  // Usado pela tabela do painel admin: inclui e-mail e a marcação de
  // cotista, mas NUNCA o telefone (esse fica reservado à planilha exportada).
  const entradas = await store.getAll();
  return entradas.map((e, i) => {
    const { telefone, ...resto } = e;
    return { posicao: i + 1, ...resto };
  });
}

async function listarParaExportacao() {
  // Usado apenas pela exportação em planilha (XLSX): inclui todos os campos,
  // incluindo o telefone.
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
  listarParaExportacao,
  removerNota,
  TOTAL_QUESTOES,
};
