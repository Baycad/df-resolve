import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Botao, Campo, cores, Mensagem, SeletorCategoria, Tela } from '../../../components/ui';
import { useSessao } from '../../../contexts/sessao';
import { api, ErroApi, textoDoErro } from '../../../services/api';
import { CAMPOS_DENUNCIA, CATEGORIAS, rotuloCategoria, tamanho, validarDenuncia } from '../../../utils/validacao';

// Igual a STATUS_EDITAVEL em df_resolve/routes/denuncia_routes.py.
const STATUS_EDITAVEL = 'Pendente';
const NAO_ENCONTRADA = 'Denúncia não encontrada. Ela pode ter sido excluída.';
const STATUS_MUDOU = 'O status desta denúncia mudou e as alterações não foram salvas.';
const SEM_CATEGORIA = 'Sem categoria';

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
  const [ocupado, setOcupado] = useState(null); // null | 'salvando' | 'excluindo'
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  // Trava síncrona contra toques repetidos, comum ao Salvar e ao Excluir.
  const travado = useRef(false);
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
  const valores = { titulo, endereco, descricao };
  const alterados = {};
  if (original) {
    if (categoria !== null && categoria !== (original.categoria ?? null)) alterados.categoria = categoria;
    for (const campo of Object.keys(CAMPOS_DENUNCIA)) {
      const valor = valores[campo].trim();
      if (valor !== (original[campo] ?? '').trim()) alterados[campo] = valor;
    }
  }
  const temAlteracao = Object.keys(alterados).length > 0;
  const editavel = original?.status === STATUS_EDITAVEL;

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
    const problema = validarDenuncia(alterados, { edicao: true });
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
        <ActivityIndicator size="large" />
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
        <Leitura rotulo="Categoria" valor={rotuloCategoria(original.categoria) ?? SEM_CATEGORIA} />
        <Leitura rotulo="Título" valor={original.titulo} />
        <Leitura rotulo="Endereço" valor={original.endereco} />
        <Leitura rotulo="Descrição" valor={original.descricao} />
        <Leitura rotulo="Status" valor={original.status} />
      </Tela>
    );
  }

  return (
    <Tela>
      <Text style={styles.status}>Status: {original.status}</Text>
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
      <Mensagem>{erro}</Mensagem>
      <Botao
        titulo="Salvar alterações"
        onPress={salvar}
        carregando={ocupado === 'salvando'}
        desabilitado={!temAlteracao || ocupado !== null}
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
  suave: { color: cores.suave, textAlign: 'center' },
  status: { fontSize: 14, color: cores.suave },
  descricao: { minHeight: 120 },
  leitura: { gap: 4 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  valor: { fontSize: 16, color: cores.texto },
});
