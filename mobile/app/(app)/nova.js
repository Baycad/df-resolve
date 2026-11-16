import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Botao, Campo, cores, Link, Mensagem, SeletorCategoria, Tela } from '../../components/ui';
import { useSessao } from '../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../services/api';
import { obterLocalizacao } from '../../utils/localizacao';
import {
  CAMPOS_DENUNCIA,
  CATEGORIAS,
  tamanho,
  textoLocalizacao,
  validarDenuncia,
  validarLocalizacao,
} from '../../utils/validacao';

function contador(valor, campo) {
  return `${tamanho(valor.trim())}/${CAMPOS_DENUNCIA[campo].limite}`;
}

export default function NovaDenuncia() {
  const router = useRouter();
  const { token, sessaoExpirada } = useSessao();
  const [categoria, setCategoria] = useState(null); // obrigatória no app (D3); null até a pessoa escolher
  const [titulo, setTitulo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  // Localização opcional (D7): null ou { latitude, longitude } com 5 casas. Só muda com um toque.
  const [localizacao, setLocalizacao] = useState(null);
  const [obtendoLocal, setObtendoLocal] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState('');
  const [enviando, setEnviando] = useState(false); // desativa o botão e os campos
  const [erro, setErro] = useState('');
  // Trava síncrona: dois toques no mesmo instante passariam pela checagem do estado
  // antes da nova renderização. O ref muda na hora.
  const travado = useRef(false);
  const obtendo = useRef(false); // a mesma ideia, para o "Usar minha localização"
  const campoEndereco = useRef(null);
  const campoDescricao = useRef(null);

  async function usarLocalizacao() {
    if (obtendo.current) return;
    obtendo.current = true;
    setObtendoLocal(true);
    setAvisoLocal('');
    // obterLocalizacao nunca lança erro: devolve { localizacao } ou { aviso }.
    const resultado = await obterLocalizacao();
    if (resultado.aviso) setAvisoLocal(resultado.aviso);
    else setLocalizacao(resultado.localizacao);
    obtendo.current = false;
    setObtendoLocal(false);
  }

  function removerLocalizacao() {
    setLocalizacao(null);
    setAvisoLocal('');
  }

  async function enviar() {
    if (travado.current) return;
    travado.current = true;
    const problema = validarDenuncia({ categoria, titulo, endereco, descricao }) ?? validarLocalizacao(localizacao);
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
        categoria,
        // No POST, a localização só vai se houver; sempre o par, nunca só um dos dois.
        ...(localizacao ? { latitude: localizacao.latitude, longitude: localizacao.longitude } : {}),
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
      <SeletorCategoria
        rotulo="Categoria"
        opcoes={CATEGORIAS}
        valor={categoria}
        onChange={setCategoria}
        desabilitado={enviando}
      />
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
      <View style={styles.localizacao}>
        <Text style={styles.rotulo}>Localização (opcional)</Text>
        <Text style={styles.valor}>
          {obtendoLocal
            ? 'Obtendo localização...'
            : textoLocalizacao(localizacao?.latitude, localizacao?.longitude) ?? 'Sem localização'}
        </Text>
        <Link titulo="Usar minha localização" onPress={usarLocalizacao} desabilitado={enviando || obtendoLocal} />
        {localizacao ? (
          <Link titulo="Remover localização" onPress={removerLocalizacao} desabilitado={enviando || obtendoLocal} />
        ) : null}
        <Mensagem tipo="aviso">{avisoLocal}</Mensagem>
      </View>
      <Mensagem>{erro}</Mensagem>
      <Botao titulo="Registrar denúncia" onPress={enviar} carregando={enviando} desabilitado={obtendoLocal} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  descricao: { minHeight: 120 },
  localizacao: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  valor: { fontSize: 16, color: cores.texto },
});
