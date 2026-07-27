const ExcelJS = require('exceljs');

async function gerarPlanilha(entradas) {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet('Ranking');

  planilha.columns = [
    { header: 'Posição', key: 'posicao', width: 10 },
    { header: 'Nome', key: 'nome', width: 32 },
    { header: 'Idade', key: 'idade', width: 10 },
    { header: 'E-mail', key: 'email', width: 32 },
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'Cotista', key: 'cotista', width: 10 },
    { header: 'Acertos', key: 'acertos', width: 10 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Percentual (%)', key: 'percentual', width: 16 },
    { header: 'Data do cadastro', key: 'dataCadastro', width: 22 },
  ];
  planilha.getRow(1).font = { bold: true };

  for (const e of entradas) {
    planilha.addRow({
      posicao: e.posicao,
      nome: e.nome,
      idade: e.idade,
      email: e.email,
      telefone: e.telefone,
      cotista: e.cotista ? 'Sim' : 'Não',
      acertos: e.acertos,
      total: e.total,
      percentual: Math.round((e.acertos / e.total) * 100),
      dataCadastro: new Date(e.data).toLocaleString('pt-BR'),
    });
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { gerarPlanilha };
