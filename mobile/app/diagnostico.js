import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Botao, cores, Mensagem, tipo } from '../components/ui';
import { api, textoDoErro, urlDaApi } from '../services/api';

// Teste de conexão com o Flask (GET /auth/check), sem login. Útil quando o IP do PC muda.
export default function Diagnostico() {
  const [estado, setEstado] = useState('carregando');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const testar = useCallback(async () => {
    setEstado('carregando');
    setErro('');
    try {
      setResultado(await api.verificarConexao());
      setEstado('sucesso');
    } catch (e) {
      setErro(textoDoErro(e));
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    testar();
  }, [testar]);

  return (
    <View style={styles.tela}>
      <Text style={styles.url}>{urlDaApi() ?? '(EXPO_PUBLIC_API_URL não definida)'}</Text>

      {estado === 'carregando' && (
        <View style={styles.caixa}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.texto}>Conectando...</Text>
        </View>
      )}

      {estado === 'sucesso' && (
        <View style={[styles.caixa, styles.sucesso]}>
          <Text style={styles.rotulo}>Conectado</Text>
          <Text style={styles.texto}>Resposta em {resultado.ms} ms</Text>
        </View>
      )}

      {estado === 'erro' && <Mensagem>{erro}</Mensagem>}

      {estado !== 'carregando' && <Botao titulo="Tentar de novo" onPress={testar} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, padding: 24, gap: 16, backgroundColor: cores.fundo, justifyContent: 'center' },
  url: { fontSize: tipo.secundario, color: cores.textoSecundario, textAlign: 'center' },
  caixa: { padding: 16, borderRadius: 8, gap: 8, alignItems: 'center', backgroundColor: cores.superficiePressionada },
  sucesso: { backgroundColor: cores.sucessoFundo },
  rotulo: { fontSize: tipo.corpo, fontWeight: '600', color: cores.texto },
  texto: { fontSize: tipo.corpo, textAlign: 'center', color: cores.texto },
});
