import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { useSessao } from '../contexts/sessao';
import { cores } from './ui';

export function BotaoSair() {
  const { sair } = useSessao();
  const [saindo, setSaindo] = useState(false);

  async function aoTocar() {
    if (saindo) return;
    setSaindo(true);
    await sair(); // sempre termina: o token é apagado mesmo sem rede
  }

  // Alvo de 48 × 48 dp (mínimo do Android) pela área do Pressable, sem hitSlop e sem mudar o texto.
  return (
    <Pressable
      onPress={aoTocar}
      disabled={saindo}
      accessibilityRole="button"
      accessibilityState={{ disabled: saindo, busy: saindo }}
      style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: saindo ? cores.desabilitado : cores.primaria, fontSize: 16, fontWeight: '600' }}>
        {saindo ? 'Saindo...' : 'Sair'}
      </Text>
    </Pressable>
  );
}
