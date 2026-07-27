(function () {
  const tabRanking = document.getElementById('tab-ranking');
  const tabEnviar = document.getElementById('tab-enviar');
  const viewRanking = document.getElementById('view-ranking');
  const viewEnviar = document.getElementById('view-enviar');
  const btnRefresh = document.getElementById('btn-refresh');
  const rankingBody = document.getElementById('ranking-body');
  const rankingTable = document.getElementById('ranking-table');
  const rankingEmpty = document.getElementById('ranking-empty');
  const paginacao = document.getElementById('paginacao');
  const buscaNome = document.getElementById('busca-nome');
  const filtroClassificacao = document.getElementById('filtro-classificacao');
  const form = document.getElementById('form-cadastro');
  const feedback = document.getElementById('form-feedback');

  let paginaAtual = 1;
  let termoBusca = '';
  let tipoClassificacao = 'ampla';
  let debounceTimer = null;

  function showView(name) {
    const isRanking = name === 'ranking';
    viewRanking.classList.toggle('active', isRanking);
    viewEnviar.classList.toggle('active', !isRanking);
    tabRanking.classList.toggle('active', isRanking);
    tabEnviar.classList.toggle('active', !isRanking);
    if (isRanking) carregarRanking();
  }

  tabRanking.addEventListener('click', () => showView('ranking'));
  tabEnviar.addEventListener('click', () => showView('enviar'));
  btnRefresh.addEventListener('click', () => carregarRanking());

  filtroClassificacao.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.segment-btn');
    if (!btn || btn.classList.contains('active')) return;

    filtroClassificacao.querySelectorAll('.segment-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    tipoClassificacao = btn.dataset.tipo;
    paginaAtual = 1;
    carregarRanking();
  });

  buscaNome.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      termoBusca = buscaNome.value.trim();
      paginaAtual = 1;
      carregarRanking();
    }, 300);
  });

  function medalha(pos) {
    if (pos === 1) return '&#9733;';
    if (pos === 2) return '&#9734;';
    if (pos === 3) return '&#10022;';
    return '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPaginacao(totalPages, paginaAtual) {
    if (totalPages <= 1) {
      paginacao.hidden = true;
      paginacao.innerHTML = '';
      return;
    }

    paginacao.hidden = false;

    const paginas = new Set([1, totalPages, paginaAtual - 1, paginaAtual, paginaAtual + 1]);
    const ordenadas = [...paginas].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    let html = '';
    let anterior = 0;
    for (const p of ordenadas) {
      if (anterior && p - anterior > 1) {
        html += '<span class="page-ellipsis">&hellip;</span>';
      }
      html += `<button type="button" class="page-btn ${p === paginaAtual ? 'active' : ''}" data-page="${p}">${p}</button>`;
      anterior = p;
    }

    paginacao.innerHTML = html;
  }

  paginacao.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.page-btn');
    if (!btn) return;
    paginaAtual = Number(btn.dataset.page);
    carregarRanking();
    viewRanking.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  async function carregarRanking() {
    try {
      const params = new URLSearchParams({ page: String(paginaAtual), limit: '30', tipo: tipoClassificacao });
      if (termoBusca) params.set('q', termoBusca);

      const resp = await fetch(`/api/rankings?${params.toString()}`);
      const dados = await resp.json();

      const itens = dados.itens || [];
      paginaAtual = dados.page || 1;

      if (itens.length === 0) {
        rankingTable.hidden = true;
        rankingEmpty.hidden = false;
        rankingEmpty.textContent = termoBusca
          ? 'Nenhum recruta encontrado com esse nome.'
          : 'Nenhum recruta cadastrado ainda. Seja o primeiro a enviar sua nota.';
        renderPaginacao(0, 1);
        return;
      }

      rankingEmpty.hidden = true;
      rankingTable.hidden = false;

      rankingBody.innerHTML = itens
        .map((item) => {
          const pos = item.posicao;
          const isTop = pos <= 3;
          const pct = Math.round((item.acertos / item.total) * 100);
          return `
            <tr>
              <td class="col-pos">
                <span class="rank-badge rank-${pos <= 3 ? pos : ''}">
                  ${isTop ? `<span class="rank-medal">${medalha(pos)}</span>` : ''} #${pos}
                </span>
              </td>
              <td>${escapeHtml(item.nome)}</td>
              <td class="col-num">${escapeHtml(item.idade)}</td>
              <td class="col-num">${item.acertos}/${item.total}</td>
              <td class="col-num">
                <div class="pct-bar-wrap">
                  <div class="pct-bar"><div class="pct-bar-fill" style="width:${pct}%"></div></div>
                  <span>${pct}%</span>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      renderPaginacao(dados.totalPages || 1, paginaAtual);
    } catch (err) {
      rankingTable.hidden = true;
      rankingEmpty.hidden = false;
      rankingEmpty.textContent = 'Falha ao carregar o ranking. Tente novamente.';
      renderPaginacao(0, 1);
    }
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    feedback.hidden = true;

    const nome = document.getElementById('nome').value.trim();
    const idade = Number(document.getElementById('idade').value);
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const acertos = Number(document.getElementById('acertos').value);
    const cotista = document.getElementById('cotista').checked;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const resp = await fetch('/api/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, idade, email, telefone, acertos, cotista }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.erro || 'Erro ao enviar nota.');
      }

      feedback.textContent = `Nota registrada com sucesso, soldado ${nome}!`;
      feedback.className = 'form-feedback ok';
      feedback.hidden = false;
      form.reset();
      paginaAtual = 1;
      termoBusca = '';
      buscaNome.value = '';
      showView('ranking');
    } catch (err) {
      feedback.textContent = err.message || 'Erro ao enviar nota.';
      feedback.className = 'form-feedback err';
      feedback.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  carregarRanking();
})();
