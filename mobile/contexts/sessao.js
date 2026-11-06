import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import { api, ErroApi } from '../services/api';

// O token fica só aqui (memória) e no SecureStore. Nunca em console.log.
const CHAVE_TOKEN = 'dfresolve.token';
const AVISO_EXPIRADA = 'Sua sessão expirou. Entre novamente.';
const AVISO_NAO_APAGOU = 'Não foi possível apagar a sessão deste aparelho. Feche o app e tente sair de novo.';

const SessaoContexto = createContext(null);

async function lerToken() {
  try {
    return await SecureStore.getItemAsync(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

// true se há token salvo, false se não há, null se não foi possível ler.
async function haTokenSalvo() {
  try {
    return (await SecureStore.getItemAsync(CHAVE_TOKEN)) !== null;
  } catch {
    return null;
  }
}

// Apaga o token e confere se ele sumiu, com uma segunda tentativa.
// Retorna false se não for possível confirmar a remoção.
async function apagarToken() {
  for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
    try {
      await SecureStore.deleteItemAsync(CHAVE_TOKEN);
    } catch {
      // A conferência abaixo decide se precisa tentar de novo.
    }
    if ((await haTokenSalvo()) === false) return true;
  }
  return false;
}

export function SessaoProvider({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [aviso, setAviso] = useState('');

  // Ao abrir o app: valida o token salvo com GET /auth/me.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const salvo = await lerToken();
      if (salvo) {
        try {
          const eu = await api.eu(salvo);
          if (ativo) {
            setToken(salvo);
            setUsuario(eu?.username ?? null);
          }
        } catch (erro) {
          if (erro instanceof ErroApi && erro.status === 401) {
            await apagarToken();
            if (ativo) setAviso(AVISO_EXPIRADA);
          } else if (ativo) {
            // Sem rede ou servidor fora: mantém o token; a lista mostra o erro.
            setToken(salvo);
          }
        }
      }
      if (ativo) setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (username, password) => {
    const resposta = await api.emitirToken(username, password);
    try {
      await SecureStore.setItemAsync(CHAVE_TOKEN, resposta.token);
    } catch {
      // Não conseguiu guardar: revoga o token novo para não deixá-lo ativo à toa.
      await api.revogarToken(resposta.token).catch(() => {});
      throw new ErroApi('armazenamento', 'Não foi possível guardar a sessão neste aparelho.');
    }
    setAviso('');
    setUsuario(username);
    setToken(resposta.token);
  }, []);

  const sair = useCallback(async () => {
    if (token) {
      try {
        await api.revogarToken(token);
      } catch {
        // Sem rede ou token já inválido: segue e apaga do aparelho mesmo assim.
      }
    }
    const apagou = await apagarToken();
    // Sem confirmação da remoção, o token pode voltar a ser usado ao reabrir o app.
    if (!apagou) setAviso(AVISO_NAO_APAGOU);
    setUsuario(null);
    setToken(null);
  }, [token]);

  const sessaoExpirada = useCallback(async () => {
    await apagarToken();
    setAviso(AVISO_EXPIRADA);
    setUsuario(null);
    setToken(null);
  }, []);

  const valor = useMemo(
    () => ({
      carregando,
      token,
      usuario,
      aviso,
      avisar: setAviso,
      limparAviso: () => setAviso(''),
      entrar,
      sair,
      sessaoExpirada,
    }),
    [carregando, token, usuario, aviso, entrar, sair, sessaoExpirada],
  );

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;
}

export function useSessao() {
  const contexto = useContext(SessaoContexto);
  if (!contexto) throw new Error('useSessao precisa estar dentro do SessaoProvider.');
  return contexto;
}
