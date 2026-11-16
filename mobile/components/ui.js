import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Paleta B (verde floresta), modo claro. Cada cor tem um papel; as telas usam o papel, nunca o hex.
// Contraste conferido (WCAG) sobre o fundo branco, salvo indicação.
export const cores = {
  // Superfícies
  fundo: '#FFFFFF',
  superficiePressionada: '#F1F3F4', // valor de antes (cartão pressionado), ainda sem par na paleta B
  // Texto
  texto: '#1F2937', // 14,7:1
  textoSecundario: '#4B5563', // 7,6:1
  // Ação e seleção
  primaria: '#1B6B3A', // 6,5:1
  sobrePrimaria: '#FFFFFF', // 6,5:1 sobre a primaria
  // Contornos
  borda: '#6B7280', // campos, chips e cartões: 4,8:1 (mínimo 3:1)
  bordaSuave: '#D1D5DB', // só divisórias sem função
  // Estado desativado (mantido)
  desabilitado: '#9aa0a6',
  // Mensagens (mantidas)
  erroFundo: '#fdecea',
  erroTexto: '#8c1d18', // 8,0:1 sobre erroFundo
  avisoFundo: '#fff4e5',
  avisoTexto: '#7a4b00', // 6,8:1 sobre avisoFundo
  // Status da denúncia (para o selo do passo 3; ainda sem uso)
  statusPendenteFundo: '#FFE9B0',
  statusPendenteTexto: '#7A4B00', // 6,2:1
  statusAnaliseFundo: '#D9E6FF',
  statusAnaliseTexto: '#0B3D91', // 8,0:1
};

// Escala de tipo única, na fonte do sistema. Em React Native o fontSize acompanha o tamanho de fonte
// do Android (como sp). Os pesos continuam os de cada estilo.
export const tipo = {
  ajuda: 12,
  secundario: 14,
  rotulo: 14,
  corpo: 16,
  secao: 20,
  tituloTela: 24,
};

// Tela com rolagem que não fica escondida pelo teclado.
// No Android de borda a borda, a tela é desenhada atrás da barra de navegação. Por isso o padding de baixo
// soma insets.bottom: com a tela rolada até o fim, o último botão fica acima da barra (L1).
// 24 é o mesmo padding de styles.tela; só o de baixo muda.
// O KeyboardAvoidingView compara a posição do teclado (medida a partir do topo da janela) com a própria
// posição (medida a partir do topo do conteúdo, abaixo do cabeçalho). Sem o deslocamento do cabeçalho
// (que já inclui a barra de status), o fim da tela ficava atrás do teclado (L2).
// Toda tela que usa a Tela está num Stack com cabeçalho; fora disso, useHeaderHeight lança erro.
export function Tela({ children }) {
  const insets = useSafeAreaInsets();
  const alturaCabecalho = useHeaderHeight();
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={alturaCabecalho}>
      <ScrollView
        contentContainerStyle={[styles.tela, { paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// React 19: "ref" chega como prop comum.
// "ajuda" mostra um texto curto abaixo do campo; "estilo" complementa o estilo da entrada.
export function Campo({ rotulo, ref, ajuda, estilo, ...props }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput ref={ref} style={[styles.entrada, estilo]} placeholderTextColor={cores.textoSecundario} {...props} />
      {ajuda ? <Text style={styles.ajuda}>{ajuda}</Text> : null}
    </View>
  );
}

// Escolha de uma opção entre botões ("chips"), sem dependência externa.
// opcoes: [{ chave, rotulo }]. valor null ou fora da lista: nenhum chip marcado.
// Não existe "desmarcar": tocar no chip marcado mantém a escolha.
export function SeletorCategoria({ rotulo, opcoes, valor, onChange, desabilitado = false }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={rotulo}>
        {opcoes.map((opcao) => {
          const marcado = valor === opcao.chave;
          return (
            <Pressable
              key={opcao.chave}
              onPress={() => onChange(opcao.chave)}
              disabled={desabilitado}
              accessibilityRole="radio"
              accessibilityState={{ checked: marcado, disabled: desabilitado }}
              style={({ pressed }) => [
                styles.chip,
                marcado && styles.chipMarcado,
                desabilitado && styles.chipInativo,
                pressed && !desabilitado && styles.botaoPressionado,
              ]}
            >
              <Text style={[styles.textoChip, marcado && styles.textoChipMarcado]}>{opcao.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// variante: 'principal' (azul) ou 'perigo' (vermelho, para ações destrutivas).
export function Botao({ titulo, onPress, carregando = false, desabilitado = false, variante = 'principal' }) {
  const inativo = carregando || desabilitado;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        styles.botao,
        variante === 'perigo' && styles.botaoPerigo,
        inativo && styles.botaoInativo,
        pressed && !inativo && styles.botaoPressionado,
      ]}
    >
      {carregando ? <ActivityIndicator color={cores.sobrePrimaria} /> : <Text style={styles.textoBotao}>{titulo}</Text>}
    </Pressable>
  );
}

export function Link({ titulo, onPress, desabilitado = false }) {
  return (
    <Pressable onPress={onPress} disabled={desabilitado} accessibilityRole="link" hitSlop={8}>
      <Text style={[styles.link, desabilitado && styles.linkInativo]}>{titulo}</Text>
    </Pressable>
  );
}

export function Mensagem({ tipo = 'erro', children }) {
  if (!children) return null;
  const aviso = tipo === 'aviso';
  return (
    <View style={[styles.mensagem, aviso ? styles.avisoFundo : styles.erroFundo]} accessibilityLiveRegion="polite">
      <Text style={aviso ? styles.avisoTexto : styles.erroTexto}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cores.fundo },
  tela: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  campo: { gap: 6 },
  rotulo: { fontSize: tipo.rotulo, fontWeight: '600', color: cores.texto },
  ajuda: { fontSize: tipo.ajuda, color: cores.textoSecundario, textAlign: 'right' },
  entrada: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: tipo.corpo,
    color: cores.texto,
  },
  // Alvo de toque de 44 pt de altura em cada chip.
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundo,
  },
  chipMarcado: { backgroundColor: cores.primaria, borderColor: cores.primaria },
  chipInativo: { opacity: 0.6 },
  textoChip: { fontSize: 15, color: cores.texto },
  textoChipMarcado: { color: cores.sobrePrimaria, fontWeight: '600' },
  botao: { minHeight: 48, borderRadius: 8, backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center' },
  botaoInativo: { backgroundColor: cores.desabilitado },
  botaoPerigo: { backgroundColor: cores.erroTexto },
  botaoPressionado: { opacity: 0.85 },
  textoBotao: { color: cores.sobrePrimaria, fontSize: tipo.corpo, fontWeight: '600' },
  link: { color: cores.primaria, fontSize: 15, textAlign: 'center', paddingVertical: 4 },
  linkInativo: { color: cores.desabilitado },
  mensagem: { padding: 12, borderRadius: 8 },
  erroFundo: { backgroundColor: cores.erroFundo },
  erroTexto: { color: cores.erroTexto, fontSize: 15 },
  avisoFundo: { backgroundColor: cores.avisoFundo },
  avisoTexto: { color: cores.avisoTexto, fontSize: 15 },
});
