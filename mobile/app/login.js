import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Botao, Campo, cores, Link, Mensagem, Tela } from '../components/ui';
import { useSessao } from '../contexts/sessao';
import { ErroApi, textoDoErro } from '../services/api';
import { validarLogin } from '../utils/validacao';

export default function Login() {
  const router = useRouter();
  const { entrar, aviso, limparAviso } = useSessao();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const campoSenha = useRef(null);

  async function enviar() {
    if (enviando) return;
    const problema = validarLogin(usuario, senha);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    limparAviso();
    setEnviando(true);
    try {
      await entrar(usuario.trim(), senha);
      router.replace('/');
    } catch (e) {
      setErro(e instanceof ErroApi && e.status === 401 ? 'Usuário ou senha incorretos.' : textoDoErro(e));
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Text style={styles.titulo}>DF Resolve</Text>
      <Mensagem tipo="aviso">{aviso}</Mensagem>
      <Campo
        rotulo="Usuário"
        value={usuario}
        onChangeText={setUsuario}
        editable={!enviando}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => campoSenha.current?.focus()}
        submitBehavior="submit"
      />
      <Campo
        ref={campoSenha}
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        editable={!enviando}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={enviar}
      />
      <Mensagem>{erro}</Mensagem>
      <Botao titulo="Entrar" onPress={enviar} carregando={enviando} />
      <Link titulo="Não tem conta? Criar conta" onPress={() => router.push('/cadastro')} desabilitado={enviando} />
      <Link titulo="Testar conexão" onPress={() => router.push('/diagnostico')} desabilitado={enviando} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 24, fontWeight: '600', textAlign: 'center', color: cores.texto, marginBottom: 8 },
});
