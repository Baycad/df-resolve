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
export function Tela({ children }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <ScrollView contentContainerStyle={styles.tela} keyboardShouldPersistTaps="handled">
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

export function Botao({ titulo, onPress, carregando = false, desabilitado = false }) {
  const inativo = carregando || desabilitado;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [styles.botao, inativo && styles.botaoInativo, pressed && !inativo && styles.botaoPressionado]}
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
  botao: { minHeight: 48, borderRadius: 8, backgroundColor: cores.destaque, alignItems: 'center', justifyContent: 'center' },
  botaoInativo: { backgroundColor: cores.desabilitado },
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
