// O endereço da API vem do mobile/.env (EXPO_PUBLIC_API_URL).
const API_URL = process.env.EXPO_PUBLIC_API_URL;
const TEMPO_LIMITE_MS = 8000;

export function urlDaApi() {
  return API_URL ? API_URL.replace(/\/+$/, '') : null;
}

export async function verificarConexao() {
  const base = urlDaApi();
  if (!base) {
    throw new Error('URL da API não configurada. Defina EXPO_PUBLIC_API_URL no arquivo mobile/.env.');
  }

  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  const inicio = Date.now();

  try {
    const resposta = await fetch(`${base}/auth/check`, { signal: controle.signal });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new Error(`Resposta inesperada do servidor: HTTP ${resposta.status}.`);
    }
    return { status: resposta.status, dados, ms: Date.now() - inicio };
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error(`Tempo esgotado: o servidor não respondeu em ${TEMPO_LIMITE_MS / 1000} s.`);
    }
    // No React Native, falha de rede chega como TypeError ("Network request failed").
    if (erro instanceof TypeError) {
      throw new Error('Servidor inalcançável. Confira se o Flask está ligado em modo rede e se o celular está no mesmo Wi-Fi.');
    }
    throw erro;
  } finally {
    clearTimeout(temporizador);
  }
}
