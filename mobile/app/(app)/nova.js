import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Botao, Campo, Mensagem, Tela } from '../../components/ui';
import { useSessao } from '../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../services/api';
import { CAMPOS_DENUNCIA, tamanho, validarDenuncia } from '../../utils/validacao';

function contador(valor, campo) {
  return `${tamanho(valor.trim())}/${CAMPOS_DENUNCIA[campo].limite}`;
}

export default function NovaDenuncia() {
  const router = useRouter();
  const { token, sessaoExpirada } = useSessao();
  const [titulo, setTitulo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false); // desativa o botão e os campos
  const [erro, setErro] = useState('');
  // Trava síncrona: dois toques no mesmo instante passariam pela checagem do estado
  // antes da nova renderização. O ref muda na hora.
  const travado = useRef(false);
  const campoEndereco = useRef(null);
  const campoDescricao = useRef(null);

  async function enviar() {
    if (travado.current) return;
    travado.current = true;
    const problema = validarDenuncia({ titulo, endereco, descricao });
    if (problema) {
      setErro(problema);
      travado.current = false;
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await api.criarDenuncia(token, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        endereco: endereco.trim(),
      });
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        await sessaoExpirada(); // o guard leva para o login
        return;
      }
      // Os dados digitados continuam nos campos para tentar de novo.
      setErro(textoDoErro(e));
      setEnviando(false);
      travado.current = false;
      return;
    }
    // Sucesso: a trava continua fechada até a tela sair. A lista recarrega ao ganhar o foco.
    router.back();
  }

  return (
    <Tela>
      <Campo
        rotulo="Título"
        value={titulo}
        onChangeText={setTitulo}
        editable={!enviando}
        ajuda={contador(titulo, 'titulo')}
        returnKeyType="next"
        onSubmitEditing={() => campoEndereco.current?.focus()}
        submitBehavior="submit"
      />
      <Campo
        ref={campoEndereco}
        rotulo="Endereço"
        value={endereco}
        onChangeText={setEndereco}
        editable={!enviando}
        ajuda={contador(endereco, 'endereco')}
        autoComplete="street-address"
        returnKeyType="next"
        onSubmitEditing={() => campoDescricao.current?.focus()}
        submitBehavior="submit"
      />
      <Campo
        ref={campoDescricao}
        rotulo="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        editable={!enviando}
        ajuda={contador(descricao, 'descricao')}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        estilo={styles.descricao}
      />
      <Mensagem>{erro}</Mensagem>
      <Botao titulo="Registrar denúncia" onPress={enviar} carregando={enviando} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  descricao: { minHeight: 120 },
});
