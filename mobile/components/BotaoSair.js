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

  return (
    <Pressable
      onPress={aoTocar}
      disabled={saindo}
      accessibilityRole="button"
      accessibilityState={{ disabled: saindo, busy: saindo }}
      hitSlop={8}
    >
      <Text style={{ color: saindo ? cores.desabilitado : cores.destaque, fontSize: 16, fontWeight: '600' }}>
        {saindo ? 'Saindo...' : 'Sair'}
      </Text>
    </Pressable>
  );
}
