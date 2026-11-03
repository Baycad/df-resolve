import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { urlDaApi, verificarConexao } from '../services/api';

// Fase 3: só testa a conexão com o Flask (GET /auth/check), sem login.
export default function TesteConexao() {
  const [estado, setEstado] = useState('carregando');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const testar = useCallback(async () => {
    setEstado('carregando');
    setErro('');
    try {
      setResultado(await verificarConexao());
      setEstado('sucesso');
    } catch (e) {
      setErro(e.message);
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    testar();
  }, [testar]);

  return (
    <View style={styles.tela}>
      <Text style={styles.titulo}>Teste de conexão com a API</Text>
      <Text style={styles.url}>{urlDaApi() ?? '(EXPO_PUBLIC_API_URL não definida)'}</Text>

      {estado === 'carregando' && (
        <View style={styles.caixa}>
          <ActivityIndicator size="large" />
          <Text style={styles.texto}>Conectando...</Text>
        </View>
      )}

      {estado === 'sucesso' && (
        <View style={[styles.caixa, styles.sucesso]}>
          <Text style={styles.rotulo}>Conectado</Text>
          <Text style={styles.texto}>HTTP {resultado.status} em {resultado.ms} ms</Text>
          <Text style={styles.texto}>logged_in: {String(resultado.dados?.logged_in)}</Text>
        </View>
      )}

      {estado === 'erro' && (
        <View style={[styles.caixa, styles.falha]}>
          <Text style={styles.rotulo}>Sem conexão</Text>
          <Text style={styles.texto}>{erro}</Text>
        </View>
      )}

      {estado !== 'carregando' && (
        <Pressable style={styles.botao} onPress={testar}>
          <Text style={styles.textoBotao}>Tentar de novo</Text>
        </Pressable>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, padding: 24, gap: 16, backgroundColor: '#fff', justifyContent: 'center' },
  titulo: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  url: { fontSize: 14, color: '#555', textAlign: 'center' },
  caixa: { padding: 16, borderRadius: 8, gap: 8, alignItems: 'center', backgroundColor: '#f2f2f2' },
  sucesso: { backgroundColor: '#e6f4ea' },
  falha: { backgroundColor: '#fdecea' },
  rotulo: { fontSize: 16, fontWeight: '600' },
  texto: { fontSize: 15, textAlign: 'center' },
  botao: { padding: 14, borderRadius: 8, backgroundColor: '#1a73e8', alignItems: 'center' },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
