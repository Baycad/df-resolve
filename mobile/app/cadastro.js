import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { Botao, Campo, cores, Mensagem, Tela } from '../components/ui';
import { useSessao } from '../contexts/sessao';
import { api, textoDoErro } from '../services/api';
import { SENHA_MIN, USUARIO_MAX, USUARIO_MIN, validarCadastro } from '../utils/validacao';

export default function Cadastro() {
  const router = useRouter();
  const { entrar, avisar } = useSessao();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const campoSenha = useRef(null);
  const campoConfirmacao = useRef(null);

  async function enviar() {
    if (enviando) return;
    const problema = validarCadastro(usuario, senha, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }
    const nome = usuario.trim();
    setErro('');
    setEnviando(true);
    try {
      await api.cadastrar(nome, senha);
    } catch (e) {
      setErro(textoDoErro(e));
      setEnviando(false);
      return;
    }
    // Conta criada: entra direto. Se falhar, a conta existe e o login pode ser feito à mão.
    try {
      await entrar(nome, senha);
      router.replace('/');
    } catch {
      avisar('Conta criada. Entre com seu usuário e senha.');
      router.replace('/login');
    }
  }

  return (
    <Tela>
      <Text style={styles.dica}>
        Usuário: {USUARIO_MIN} a {USUARIO_MAX} caracteres (letras, números, ponto, hífen e sublinhado). Senha: pelo menos {SENHA_MIN} caracteres.
      </Text>
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => campoConfirmacao.current?.focus()}
        submitBehavior="submit"
      />
      <Campo
        ref={campoConfirmacao}
        rotulo="Confirmar senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        editable={!enviando}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={enviar}
      />
      <Mensagem>{erro}</Mensagem>
      <Botao titulo="Criar conta" onPress={enviar} carregando={enviando} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  dica: { color: cores.suave, fontSize: 14 },
});
