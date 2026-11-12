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

export const cores = {
  fundo: '#ffffff',
  texto: '#1f1f1f',
  suave: '#5f6368',
  borda: '#c4c7c5',
  destaque: '#1a73e8',
  desabilitado: '#9aa0a6',
  erroFundo: '#fdecea',
  erroTexto: '#8c1d18',
  avisoFundo: '#fff4e5',
  avisoTexto: '#7a4b00',
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
      <TextInput ref={ref} style={[styles.entrada, estilo]} placeholderTextColor={cores.suave} {...props} />
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
      {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBotao}>{titulo}</Text>}
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
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  ajuda: { fontSize: 12, color: cores.suave, textAlign: 'right' },
  entrada: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
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
  chipMarcado: { backgroundColor: cores.destaque, borderColor: cores.destaque },
  chipInativo: { opacity: 0.6 },
  textoChip: { fontSize: 15, color: cores.texto },
  textoChipMarcado: { color: '#fff', fontWeight: '600' },
  botao: { minHeight: 48, borderRadius: 8, backgroundColor: cores.destaque, alignItems: 'center', justifyContent: 'center' },
  botaoInativo: { backgroundColor: cores.desabilitado },
  botaoPerigo: { backgroundColor: cores.erroTexto },
  botaoPressionado: { opacity: 0.85 },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: cores.destaque, fontSize: 15, textAlign: 'center', paddingVertical: 4 },
  linkInativo: { color: cores.desabilitado },
  mensagem: { padding: 12, borderRadius: 8 },
  erroFundo: { backgroundColor: cores.erroFundo },
  erroTexto: { color: cores.erroTexto, fontSize: 15 },
  avisoFundo: { backgroundColor: cores.avisoFundo },
  avisoTexto: { color: cores.avisoTexto, fontSize: 15 },
});
