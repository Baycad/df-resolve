// Comunicação com o Flask. O token só vai no cabeçalho Authorization:
// nunca na URL, em logs ou em mensagens de erro.
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TEMPO_LIMITE_MS = 8000;
const TEMPO_LIMITE_LOGOUT_MS = 5000;

export class ErroApi extends Error {
  // tipo: 'config' | 'rede' | 'tempo' | 'naoAutorizado' | 'limite' | 'requisicao' | 'servidor' | 'armazenamento'
  constructor(tipo, mensagem, { status = null, esperaSegundos = null } = {}) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo;
    this.status = status;
    this.esperaSegundos = esperaSegundos;
  }
}

export function urlDaApi() {
  return API_URL ? API_URL.replace(/\/+$/, '') : null;
}

async function requisicao(caminho, { metodo = 'GET', corpo, token, tempoLimiteMs = TEMPO_LIMITE_MS } = {}) {
  const base = urlDaApi();
  if (!base) {
    throw new ErroApi('config', 'URL da API não configurada. Defina EXPO_PUBLIC_API_URL no arquivo mobile/.env.');
  }

  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), tempoLimiteMs);
  let resposta;
  let dados;
  try {
    resposta = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
    dados = await resposta.json().catch(() => null);
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new ErroApi('tempo', `Tempo esgotado: o servidor não respondeu em ${tempoLimiteMs / 1000} s.`);
    }
    // No React Native, falha de rede chega como TypeError ("Network request failed").
    throw new ErroApi('rede', 'Servidor inalcançável. Confira se o Flask está ligado em modo rede e se o celular está no mesmo Wi-Fi.');
  } finally {
    clearTimeout(temporizador);
  }

  if (resposta.ok) return dados;

  const mensagem = dados && typeof dados.message === 'string' ? dados.message : null;
  const status = resposta.status;
  if (status === 429) {
    const espera = parseInt(resposta.headers.get('Retry-After'), 10);
    throw new ErroApi('limite', mensagem ?? 'Muitas tentativas. Aguarde um pouco e tente novamente.', {
      status,
      esperaSegundos: Number.isFinite(espera) ? espera : null,
    });
  }
  if (status === 401) {
    throw new ErroApi('naoAutorizado', mensagem ?? 'Autenticação necessária.', { status });
  }
  if (status >= 500) {
    throw new ErroApi('servidor', 'Erro no servidor. Tente de novo em instantes.', { status });
  }
  throw new ErroApi('requisicao', mensagem ?? `Resposta inesperada do servidor: HTTP ${status}.`, { status });
}

// Texto para mostrar na tela. Nunca inclui o token.
export function textoDoErro(erro) {
  if (!(erro instanceof ErroApi)) return 'Erro inesperado no app. Tente de novo.';
  if (erro.tipo === 'limite' && erro.esperaSegundos) {
    return `${erro.message} Tente de novo em ${erro.esperaSegundos} s.`;
  }
  return erro.message;
}

export const api = {
  cadastrar: (username, password) =>
    requisicao('/auth/register', { metodo: 'POST', corpo: { username, password } }),
  emitirToken: (username, password) =>
    requisicao('/auth/token', { metodo: 'POST', corpo: { username, password } }),
  revogarToken: (token) =>
    requisicao('/auth/token/revoke', { metodo: 'POST', token, tempoLimiteMs: TEMPO_LIMITE_LOGOUT_MS }),
  eu: (token) => requisicao('/auth/me', { token }),
  listarDenuncias: (token) => requisicao('/denuncias/', { token }),
  criarDenuncia: (token, dados) => requisicao('/denuncias/', { metodo: 'POST', token, corpo: dados }),
  verificarConexao: async () => {
    const inicio = Date.now();
    const dados = await requisicao('/auth/check');
    return { dados, ms: Date.now() - inicio };
  },
};
