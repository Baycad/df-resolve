import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';

import { SessaoProvider, useSessao } from '../contexts/sessao';

// A splash fica até sabermos se há sessão válida.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  return (
    <SessaoProvider>
      <Navegacao />
    </SessaoProvider>
  );
}

function Navegacao() {
  const { carregando, token } = useSessao();

  useEffect(() => {
    if (!carregando) SplashScreen.hide();
  }, [carregando]);

  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" options={{ title: 'Entrar' }} />
        <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
      </Stack.Protected>
      <Stack.Screen name="diagnostico" options={{ title: 'Teste de conexão' }} />
    </Stack>
  );
}
