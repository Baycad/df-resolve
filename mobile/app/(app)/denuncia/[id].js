import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao, Campo, cores, Link, Mensagem, SeletorCategoria, SeloStatus, Tela, tipo } from '../../../components/ui';
import { useSessao } from '../../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../../services/api';
import { obterLocalizacao } from '../../../utils/localizacao';
import {
  CAMPOS_DENUNCIA,
  CATEGORIAS,
  rotuloCategoria,
  tamanho,
  textoLocalizacao,
  validarDenuncia,
  validarLocalizacao,
} from '../../../utils/validacao';

// Igual a STATUS_EDITAVEL em df_resolve/routes/denuncia_routes.py.
const STATUS_EDITAVEL = 'Pendente';
const NAO_ENCONTRADA = 'Denúncia não encontrada. Ela pode ter sido excluída.';
const STATUS_MUDOU = 'O status desta denúncia mudou e as alterações não foram salvas.';
const SEM_CATEGORIA = 'Sem categoria';
const SEM_LOCALIZACAO = 'Sem localização';

// null quando a denúncia não tem o par completo; senão { latitude, longitude }.
function localizacaoDe(d) {
  return d && d.latitude != null && d.longitude != null ? { latitude: d.latitude, longitude: d.longitude } : null;
}

function contador(valor, campo) {
  return `${tamanho(valor.trim())}/${CAMPOS_DENUNCIA[campo].limite}`;
}

function Leitura({ rotulo, valor }) {
  return (
    <View style={styles.leitura}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

// Status em selo (texto e cor), com o mesmo rótulo dos outros campos. Fica sempre no topo da tela.
function Status({ valor }) {
  return (
    <View style={styles.leitura}>
      <Text style={styles.rotuloStatus}>Status</Text>
      <View style={styles.linha}>
        <SeloStatus status={valor} />
      </View>
    </View>
  );
}

export default function DetalheDenuncia() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  // Só ids numéricos vão ao servidor (um id não inteiro daria 404 ou 405, pela rota estática).
  const idValido = typeof id === 'string' && /^\d+$/.test(id);
  const { token, sessaoExpirada } = useSessao();

  const [estado, setEstado] = useState(idValido ? 'carregando' : 'naoEncontrada'); // carregando | pronto | erro | naoEncontrada
  const [original, setOriginal] = useState(null);
  const [categoria, setCategoria] = useState(null); // null: denúncia antiga, sem categoria
  const [titulo, setTitulo] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [localizacao, setLocalizacao] = useState(null); // null ou { latitude, longitude }
  const [obtendoLocal, setObtendoLocal] = useState(false);
  const [avisoLocal, setAvisoLocal] = useState('');
  const [ocupado, setOcupado] = useState(null); // null | 'salvando' | 'excluindo'
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  // Trava síncrona contra toques repetidos, comum ao Salvar e ao Excluir.
  const travado = useRef(false);
  const obtendo = useRef(false); // a mesma ideia, para o "Usar minha localização"
  const campoEndereco = useRef(null);
  const campoDescricao = useRef(null);

  const carregar = useCallback(async () => {
    if (!token) return; // sessão encerrada: o guard já está tirando o usuário desta tela
    setEstado('carregando');
    setErro('');
    try {
      const d = await api.detalharDenuncia(token, id);
      setOriginal(d);
      setCategoria(d.categoria ?? null);
      setTitulo(d.titulo ?? '');
      setEndereco(d.endereco ?? '');
      setDescricao(d.descricao ?? '');
      setLocalizacao(localizacaoDe(d));
      setAvisoLocal('');
      setEstado('pronto');
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        await sessaoExpirada(); // o guard leva para o login
        return;
      }
      if (e instanceof ErroApi && e.status === 404) {
        setEstado('naoEncontrada');
        return;
      }
      setErro(textoDoErro(e));
      setEstado('erro');
    }
  }, [token, id, sessaoExpirada]);

  useEffect(() => {
    if (idValido) carregar();
  }, [idValido, carregar]);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  // Só os campos que mudaram vão no PATCH, já sem espaços nas pontas.
  // O original também é comparado sem espaços, para um dado antigo com espaços não contar como alteração.
  // A categoria é comparada sem trim. Sem escolha numa denúncia antiga (null), ela nem vai no PATCH (D3);
  // e não existe como voltar a "sem categoria" (E-a).
  // A localização vai sempre em par, e só se mudou: um par novo, ou os dois null para remover (C1).
  const valores = { titulo, endereco, descricao };
  const alterados = {};
  if (original) {
    if (categoria !== null && categoria !== (original.categoria ?? null)) alterados.categoria = categoria;
    for (const campo of Object.keys(CAMPOS_DENUNCIA)) {
      const valor = valores[campo].trim();
      if (valor !== (original[campo] ?? '').trim()) alterados[campo] = valor;
    }
    const antes = localizacaoDe(original);
    if (localizacao?.latitude !== antes?.latitude || localizacao?.longitude !== antes?.longitude) {
      alterados.latitude = localizacao ? localizacao.latitude : null;
      alterados.longitude = localizacao ? localizacao.longitude : null;
    }
  }
  const temAlteracao = Object.keys(alterados).length > 0;
  const editavel = original?.status === STATUS_EDITAVEL;

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

  // Falha no Salvar ou no Excluir.
  async function tratarFalha(e) {
    if (e instanceof ErroApi && e.status === 401) {
      await sessaoExpirada(); // o guard leva para o login
      return;
    }
    travado.current = false;
    setOcupado(null);
    if (e instanceof ErroApi && e.status === 404) {
      setEstado('naoEncontrada');
      return;
    }
    if (e instanceof ErroApi && e.status === 409) {
      // O status mudou depois que a tela abriu: recarrega e mostra só para leitura.
      setAviso(STATUS_MUDOU);
      await carregar();
      return;
    }
    setErro(textoDoErro(e)); // os dados digitados continuam nos campos
  }

  async function salvar() {
    if (travado.current) return;
    if (!temAlteracao) {
      setErro('Nada foi alterado.'); // o botão já fica desativado; nunca envia corpo vazio
      return;
    }
    travado.current = true;
    const problema = validarDenuncia(alterados, { edicao: true }) ?? validarLocalizacao(localizacao);
    if (problema) {
      setErro(problema);
      travado.current = false;
      return;
    }
    setErro('');
    setOcupado('salvando');
    try {
      await api.editarDenuncia(token, id, alterados);
    } catch (e) {
      await tratarFalha(e);
      return;
    }
    voltar(); // a lista recarrega ao ganhar o foco
  }

  async function excluir() {
    if (travado.current) return;
    travado.current = true;
    setErro('');
    setOcupado('excluindo');
    try {
      await api.excluirDenuncia(token, id);
    } catch (e) {
      await tratarFalha(e);
      return;
    }
    voltar();
  }

  function confirmarExclusao() {
    if (travado.current) return;
    Alert.alert(
      'Excluir denúncia',
      `Excluir "${original.titulo}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluir },
      ],
      { cancelable: true },
    );
  }

  if (estado === 'carregando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
        <Text style={styles.suave}>Carregando denúncia...</Text>
      </View>
    );
  }

  if (estado === 'naoEncontrada') {
    return (
      <View style={[styles.centro, styles.padding]}>
        <Mensagem>{NAO_ENCONTRADA}</Mensagem>
        <Botao titulo="Voltar para a lista" onPress={voltar} />
      </View>
    );
  }

  if (estado === 'erro') {
    return (
      <View style={[styles.centro, styles.padding]}>
        <Mensagem>{erro}</Mensagem>
        <Botao titulo="Tentar de novo" onPress={carregar} />
      </View>
    );
  }

  if (!editavel) {
    return (
      <Tela>
        {aviso ? <Mensagem>{aviso}</Mensagem> : null}
        <Mensagem tipo="aviso">
          {`Esta denúncia está com status ${original.status}. Só é possível alterar denúncias com status ${STATUS_EDITAVEL}.`}
        </Mensagem>
        <Status valor={original.status} />
        <Leitura rotulo="Categoria" valor={rotuloCategoria(original.categoria) ?? SEM_CATEGORIA} />
        <Leitura rotulo="Título" valor={original.titulo} />
        <Leitura rotulo="Endereço" valor={original.endereco} />
        <Leitura rotulo="Descrição" valor={original.descricao} />
        <Leitura rotulo="Localização" valor={textoLocalizacao(original.latitude, original.longitude) ?? SEM_LOCALIZACAO} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Status valor={original.status} />
      <SeletorCategoria
        rotulo="Categoria"
        opcoes={CATEGORIAS}
        valor={categoria}
        onChange={setCategoria}
        desabilitado={ocupado !== null}
      />
      <Campo
        rotulo="Título"
        value={titulo}
        onChangeText={setTitulo}
        editable={!ocupado}
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
        editable={!ocupado}
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
        editable={!ocupado}
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
            : textoLocalizacao(localizacao?.latitude, localizacao?.longitude) ?? SEM_LOCALIZACAO}
        </Text>
        <Link titulo="Usar minha localização" onPress={usarLocalizacao} desabilitado={ocupado !== null || obtendoLocal} />
        {localizacao ? (
          <Link titulo="Remover localização" onPress={removerLocalizacao} desabilitado={ocupado !== null || obtendoLocal} />
        ) : null}
        <Mensagem tipo="aviso">{avisoLocal}</Mensagem>
      </View>
      <Mensagem>{erro}</Mensagem>
      <Botao
        titulo="Salvar alterações"
        onPress={salvar}
        carregando={ocupado === 'salvando'}
        desabilitado={!temAlteracao || ocupado !== null || obtendoLocal}
      />
      <Botao
        titulo="Excluir denúncia"
        variante="perigo"
        onPress={confirmarExclusao}
        carregando={ocupado === 'excluindo'}
        desabilitado={ocupado !== null}
      />
    </Tela>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', alignItems: 'stretch', gap: 12, backgroundColor: cores.fundo },
  padding: { padding: 24 },
  suave: { color: cores.textoSecundario, textAlign: 'center' },
  linha: { flexDirection: 'row' },
  descricao: { minHeight: 120 },
  leitura: { gap: 4 },
  localizacao: { gap: 6 },
  rotulo: { fontSize: tipo.rotulo, fontWeight: '600', color: cores.texto },
  // Só o rótulo "Status" é maior (pedido do usuário). Para voltar ao tamanho dos outros, usar
  // styles.rotulo no componente Status; para estender, apontar outros rótulos para este estilo.
  rotuloStatus: { fontSize: tipo.corpo, fontWeight: '600', color: cores.texto },
  valor: { fontSize: tipo.corpo, color: cores.texto },
});
