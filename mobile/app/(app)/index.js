import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Botao, cores, Mensagem, SeloStatus, tipo } from '../../components/ui';
import { useSessao } from '../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../services/api';
import { rotuloCategoria } from '../../utils/validacao';

// Toques nos primeiros 500 ms depois de a lista voltar a ter foco são ignorados:
// costumam ser toques repetidos que sobraram da tela anterior (ressalva do C6).
const ESPERA_APOS_FOCO_MS = 500;
// Se a navegação não acontecer, a trava abre sozinha depois deste tempo.
const LIBERA_SEM_NAVEGACAO_MS = 1000;

export default function MinhasDenuncias() {
  const router = useRouter();
  const navigation = useNavigation();
  // Espaço da barra de navegação do Android (L1): vai no rodapé fixo, que é o último elemento da tela.
  const insets = useSafeAreaInsets();
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

  // O botão Nova denúncia fica num rodapé fixo, fora da lista: não rola com ela e fica embaixo,
  // ao alcance do polegar (princípio 1 do PRODUCT.md). O rodapé soma insets.bottom (L1).
  return (
    <View style={styles.tela}>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.lista}
        data={denuncias}
        keyExtractor={(d) => String(d.id)}
        refreshing={atualizando}
        onRefresh={() => carregar(true)}
        ListHeaderComponent={usuario ? <Text style={styles.suave}>Conectado como {usuario}</Text> : null}
        ListEmptyComponent={<Text style={styles.vazio}>Você ainda não tem denúncias registradas.</Text>}
        renderItem={({ item }) => {
          // Denúncia antiga, sem categoria: a primeira linha do cartão mostra só o selo (F3).
          const categoria = rotuloCategoria(item.categoria);
          return (
            <Pressable
              onPress={() => abrir({ pathname: '/denuncia/[id]', params: { id: String(item.id) } })}
              accessibilityRole="button"
              accessibilityHint="Abre a denúncia para ver, editar ou excluir"
              style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
            >
              <View style={styles.topoCartao}>
                <SeloStatus status={item.status} />
                {categoria ? <Text style={styles.categoria}>{categoria}</Text> : null}
              </View>
              <Text style={styles.titulo}>{item.titulo}</Text>
              <Text style={styles.endereco}>{item.endereco}</Text>
              <Text style={styles.descricao} numberOfLines={3}>
                {item.descricao}
              </Text>
            </Pressable>
          );
        }}
      />
      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
        <Botao titulo="Nova denúncia" onPress={() => abrir('/nova')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  flex: { flex: 1 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: 12, backgroundColor: cores.fundo },
  padding: { padding: 24 },
  lista: { padding: 16, gap: 12, flexGrow: 1 },
  cartao: { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, padding: 12, gap: 4 },
  cartaoPressionado: { backgroundColor: cores.superficiePressionada },
  // Primeira linha do cartão: selo de status e, ao lado, a categoria (quebra de linha se faltar espaço).
  topoCartao: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  categoria: { flexShrink: 1, fontSize: tipo.secundario, fontWeight: '600', color: cores.primaria },
  titulo: { fontSize: tipo.corpo, fontWeight: '600', color: cores.texto },
  endereco: { fontSize: tipo.secundario, color: cores.textoSecundario },
  descricao: { fontSize: tipo.secundario, color: cores.texto },
  // "Conectado como" e o texto de carregamento continuam centralizados.
  suave: { color: cores.textoSecundario, textAlign: 'center' },
  vazio: { marginTop: 48, textAlign: 'center', color: cores.textoSecundario, fontSize: tipo.corpo },
  rodape: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: cores.bordaSuave,
    backgroundColor: cores.fundo,
  },
});
