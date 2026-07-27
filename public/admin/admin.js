(function () {
  const viewLogin = document.getElementById('view-login');
  const viewPainel = document.getElementById('view-painel');
  const formLogin = document.getElementById('form-login');
  const loginFeedback = document.getElementById('login-feedback');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnLogout = document.getElementById('btn-logout');
  const btnExport = document.getElementById('btn-export');
  const painelBody = document.getElementById('painel-body');
  const painelTable = document.getElementById('painel-table');
  const painelEmpty = document.getElementById('painel-empty');
  const buscaNome = document.getElementById('busca-nome');

  const STORAGE_KEY = 'rankingEsaAdminKey';
  let dadosCompletos = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatarData(iso) {
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  function getAdminKey() {
    return sessionStorage.getItem(STORAGE_KEY) || '';
  }

  function setAdminKey(key) {
    sessionStorage.setItem(STORAGE_KEY, key);
  }

  function clearAdminKey() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function mostrarPainel() {
    viewLogin.classList.remove('active');
    viewPainel.classList.add('active');
    carregarPainel();
  }

  function mostrarLogin(msgErro) {
    viewPainel.classList.remove('active');
    viewLogin.classList.add('active');
    if (msgErro) {
      loginFeedback.textContent = msgErro;
      loginFeedback.className = 'form-feedback err';
      loginFeedback.hidden = false;
    }
  }

  function renderTabela(lista) {
    if (lista.length === 0) {
      painelTable.hidden = true;
      painelEmpty.hidden = false;
      painelEmpty.textContent = buscaNome.value.trim()
        ? 'Nenhum cadastro encontrado com esse nome.'
        : 'Nenhum recruta cadastrado ainda.';
      return;
    }

    painelEmpty.hidden = true;
    painelTable.hidden = false;

    painelBody.innerHTML = lista
      .map((item) => {
        const pct = Math.round((item.acertos / item.total) * 100);
        return `
          <tr data-id="${escapeHtml(item.id)}">
            <td class="col-pos">#${item.posicao}</td>
            <td>${escapeHtml(item.nome)}</td>
            <td class="col-num">${escapeHtml(item.idade)}</td>
            <td>${escapeHtml(item.email)}</td>
            <td class="col-num">${item.acertos}/${item.total}</td>
            <td class="col-num">${pct}%</td>
            <td>${escapeHtml(formatarData(item.data))}</td>
            <td class="col-num">
              <button class="btn-danger btn-excluir" data-id="${escapeHtml(item.id)}" type="button">EXCLUIR</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function aplicarFiltro() {
    const termo = buscaNome.value.trim().toLowerCase();
    const lista = termo
      ? dadosCompletos.filter((item) => item.nome.toLowerCase().includes(termo))
      : dadosCompletos;
    renderTabela(lista);
  }

  async function carregarPainel() {
    try {
      const resp = await fetch('/api/admin/rankings', {
        headers: { 'x-admin-key': getAdminKey() },
      });

      if (resp.status === 401) {
        clearAdminKey();
        mostrarLogin('Senha de administrador inválida.');
        return;
      }

      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || 'Erro ao carregar dados.');

      dadosCompletos = Array.isArray(dados) ? dados : [];
      aplicarFiltro();
    } catch (err) {
      painelTable.hidden = true;
      painelEmpty.hidden = false;
      painelEmpty.textContent = err.message || 'Falha ao carregar os dados.';
    }
  }

  formLogin.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    loginFeedback.hidden = true;
    const senha = document.getElementById('senha').value;
    setAdminKey(senha);

    const resp = await fetch('/api/admin/rankings', {
      headers: { 'x-admin-key': senha },
    });

    if (resp.status === 401 || resp.status === 500) {
      const data = await resp.json().catch(() => ({}));
      clearAdminKey();
      loginFeedback.textContent = data.erro || 'Falha ao entrar.';
      loginFeedback.className = 'form-feedback err';
      loginFeedback.hidden = false;
      return;
    }

    formLogin.reset();
    mostrarPainel();
  });

  btnRefresh.addEventListener('click', carregarPainel);

  btnLogout.addEventListener('click', () => {
    clearAdminKey();
    mostrarLogin();
  });

  buscaNome.addEventListener('input', aplicarFiltro);

  btnExport.addEventListener('click', async () => {
    btnExport.disabled = true;
    const textoOriginal = btnExport.textContent;
    btnExport.textContent = 'GERANDO...';

    try {
      const resp = await fetch('/api/admin/export', {
        headers: { 'x-admin-key': getAdminKey() },
      });

      if (resp.status === 401) {
        clearAdminKey();
        mostrarLogin('Sessão expirada. Entre novamente.');
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.erro || 'Erro ao gerar planilha.');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ranking-nota-esa.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Erro ao gerar planilha.');
    } finally {
      btnExport.disabled = false;
      btnExport.innerHTML = textoOriginal;
    }
  });

  painelBody.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.btn-excluir');
    if (!btn) return;

    const id = btn.dataset.id;
    if (!confirm('Confirma a exclusão deste cadastro?')) return;

    btn.disabled = true;
    try {
      const resp = await fetch(`/api/admin/rankings/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': getAdminKey() },
      });

      if (resp.status === 401) {
        clearAdminKey();
        mostrarLogin('Sessão expirada. Entre novamente.');
        return;
      }
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.erro || 'Erro ao excluir.');
      }

      carregarPainel();
    } catch (err) {
      alert(err.message || 'Erro ao excluir.');
      btn.disabled = false;
    }
  });

  if (getAdminKey()) {
    mostrarPainel();
  }
})();
