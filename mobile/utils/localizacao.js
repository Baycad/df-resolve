// Localização do aparelho para a denúncia (7C). Toda a conversa com o expo-location fica aqui.
// Só com o app em uso (permissão de primeiro plano). Nunca é chamada sem um toque da pessoa (D7).
import * as Location from 'expo-location';

import { arredondarCoordenada } from './validacao';

// Mensagens aprovadas (CB1).
export const MENSAGENS_LOCALIZACAO = {
  negada: 'Sem permissão de localização. Você pode registrar a denúncia sem ela.',
  bloqueada: 'Libere a localização nas configurações do aparelho para usar este recurso.',
  desligada: 'Ative a localização do aparelho e tente de novo.',
  tempo: 'Não foi possível obter a localização. Tente de novo.',
};
// Limite para obter a posição (C4).
const LIMITE_MS = 15000;
const ESGOTOU = Symbol('esgotou');

function comLimite(promessa, ms) {
  let id;
  const limite = new Promise((resolver) => {
    id = setTimeout(() => resolver(ESGOTOU), ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(id));
}

// Nunca lança erro. Devolve { localizacao: { latitude, longitude } } (5 casas) ou { aviso: 'mensagem' }.
// Qualquer falha inesperada vira a mensagem de tempo esgotado.
export async function obterLocalizacao() {
  try {
    const permissao = await Location.requestForegroundPermissionsAsync();
    if (permissao.status !== 'granted') {
      // canAskAgain false: o Android não mostra mais o pedido; só dá para liberar nas configurações.
      return {
        aviso: permissao.canAskAgain === false ? MENSAGENS_LOCALIZACAO.bloqueada : MENSAGENS_LOCALIZACAO.negada,
      };
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      return { aviso: MENSAGENS_LOCALIZACAO.desligada };
    }
    // Precisão Balanced (C4).
    const posicao = await comLimite(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LIMITE_MS,
    );
    if (posicao === ESGOTOU) {
      return { aviso: MENSAGENS_LOCALIZACAO.tempo };
    }
    return {
      localizacao: {
        latitude: arredondarCoordenada(posicao.coords.latitude),
        longitude: arredondarCoordenada(posicao.coords.longitude),
      },
    };
  } catch {
    return { aviso: MENSAGENS_LOCALIZACAO.tempo };
  }
}
