import { Stack } from 'expo-router';

import { BotaoSair } from '../../components/BotaoSair';

export default function LayoutLogado() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'Minhas Denúncias', headerRight: () => <BotaoSair /> }} />
      <Stack.Screen name="nova" options={{ title: 'Nova denúncia' }} />
    </Stack>
  );
}
