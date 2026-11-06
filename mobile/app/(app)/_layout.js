import { Stack } from 'expo-router';

import { BotaoSair } from '../../components/BotaoSair';

export default function LayoutLogado() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center', headerRight: () => <BotaoSair /> }}>
      <Stack.Screen name="index" options={{ title: 'Minhas Denúncias' }} />
    </Stack>
  );
}
