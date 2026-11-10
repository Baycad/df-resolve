import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import { Botao, cores, Mensagem } from '../../components/ui';
import { useSessao } from '../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../services/api';

// Toques nos primeiros 500 ms depois de a lista voltar a ter foco são ignorados:
// costumam ser toques repetidos que sobraram da tela anterior (ressalva do C6).
const ESPERA_APOS_FOCO_MS = 500;
// Se a navegação não acontecer, a trava abre sozinha depois deste tempo.
const LIBERA_SEM_NAVEGACAO_MS = 1000;

export default function MinhasDenuncias() {
  const router = useRouter();
  const navigation = useNavigation();
  const { token, usuario, sessaoExpirada } = useSessao();
  const [estado, setEstado] = useState('carregando'); // carregando | pronto | erro
  const [denuncias, setDenuncias] = useState([]);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const jaCarregou = useRef(false);
  // Trava síncrona contra toque duplo: o segundo toque chegaria antes de a tela nova cobrir a lista.
  const navegando = useRef(false);
  const focoDesde = useRef(0);
  const temporizador = useRef(null);

  function cancelarTemporizador() {
    if (temporizador.current !== null) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }

  // Ao desmontar a tela, nenhum temporizador fica pendente.
  useEffect(() => cancelarTemporizador, []);

  function abrir(destino) {
    if (navegando.current) return;
    if (Date.now() - focoDesde.current < ESPERA_APOS_FOCO_MS) return;
    navegando.current = true;
    try {
      router.push(destino);
    } catch {
      navegando.current = false; // a navegação falhou: libera na hora
      return;
    }
    // Se a lista continuar em foco (a navegação não aconteceu), libera para não travar os cartões.
    // Um temporizador antigo nunca sobrevive: é cancelado aqui, no foco e ao desmontar.
    cancelarTemporizador();
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      if (navigation.isFocused()) navegando.current = false;
    }, LIBERA_SEM_NAVEGACAO_MS);
  }

  const carregar = useCallback(
    async (silencioso = false) => {
      if (silencioso) setAtualizando(true);
      else setEstado('carregando');
      try {
        const lista = await api.listarDenuncias(token);
        // Sem data no backend: o id maior é a denúncia mais recente.
        setDenuncias(Array.isArray(lista) ? [...lista].sort((a, b) => b.id - a.id) : []);
        setEstado('pronto');
        jaCarregou.current = true;
      } catch (e) {
        if (e instanceof ErroApi && e.status === 401) {
          await sessaoExpirada(); // o guard leva para o login
          return;
        }
        setErro(textoDoErro(e));
        setEstado('erro');
      } finally {
        setAtualizando(false);
      }
    },
    [token, sessaoExpirada],
  );

  // Carrega ao abrir e recarrega, sem tela de espera, ao voltar de outra tela.
  // Ao ganhar o foco, também libera a trava de navegação e cancela o temporizador pendente.
  useFocusEffect(
    useCallback(() => {
      cancelarTemporizador();
      navegando.current = false;
      focoDesde.current = Date.now();
      carregar(jaCarregou.current);
    }, [carregar]),
  );

  if (estado === 'carregando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
        <Text style={styles.suave}>Carregando denúncias...</Text>
      </View>
    );
  }

  if (estado === 'erro') {
    return (
      <View style={[styles.centro, styles.padding]}>
        <Mensagem>{erro}</Mensagem>
        <Botao titulo="Tentar de novo" onPress={() => carregar()} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.fundo}
      contentContainerStyle={styles.lista}
      data={denuncias}
      keyExtractor={(d) => String(d.id)}
      refreshing={atualizando}
      onRefresh={() => carregar(true)}
      ListHeaderComponent={
        <View style={styles.cabecalho}>
          <Botao titulo="Nova denúncia" onPress={() => abrir('/nova')} />
          {usuario ? <Text style={styles.suave}>Conectado como {usuario}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.vazio}>Você ainda não tem denúncias registradas.</Text>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => abrir({ pathname: '/denuncia/[id]', params: { id: String(item.id) } })}
          accessibilityRole="button"
          accessibilityHint="Abre a denúncia para ver, editar ou excluir"
          style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
        >
          <Text style={styles.titulo}>{item.titulo}</Text>
          <Text style={styles.suave}>{item.endereco}</Text>
          <Text numberOfLines={3}>{item.descricao}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  fundo: { backgroundColor: cores.fundo },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: 12, backgroundColor: cores.fundo },
  padding: { padding: 24 },
  lista: { padding: 16, gap: 12, flexGrow: 1 },
  cabecalho: { gap: 8 },
  cartao: { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, padding: 12, gap: 4 },
  cartaoPressionado: { backgroundColor: '#f1f3f4' },
  titulo: { fontSize: 16, fontWeight: '600', color: cores.texto },
  suave: { color: cores.suave, textAlign: 'center' },
  status: { alignSelf: 'flex-start', marginTop: 4, fontSize: 13, color: cores.suave },
  vazio: { marginTop: 48, textAlign: 'center', color: cores.suave, fontSize: 16 },
});
