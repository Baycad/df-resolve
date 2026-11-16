// Regras copiadas de df_resolve/routes/auth_routes.py (linhas 14 a 20, 71 e 105 a 111).
// O servidor continua sendo a autoridade; aqui só evitamos requisições inúteis.
export const USUARIO_MIN = 3;
export const USUARIO_MAX = 80;
export const USUARIO_PADRAO = /^[A-Za-z0-9._-]+$/;
export const SENHA_MIN = 8;
export const SENHA_MAX = 128;

// O Python conta caracteres; o JavaScript conta unidades UTF-16 (um emoji vale 2).
// [...texto] conta como o Python.
export function tamanho(texto) {
  return [...texto].length;
}

export function validarCadastro(usuario, senha, confirmacao) {
  const nome = usuario.trim();
  if (tamanho(nome) < USUARIO_MIN || tamanho(nome) > USUARIO_MAX) {
    return `O usuário deve ter entre ${USUARIO_MIN} e ${USUARIO_MAX} caracteres.`;
  }
  if (!USUARIO_PADRAO.test(nome)) {
    return 'O usuário pode conter apenas letras, números, ponto, hífen e sublinhado.';
  }
  if (tamanho(senha) < SENHA_MIN || tamanho(senha) > SENHA_MAX) {
    return `A senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres.`;
  }
  if (senha !== confirmacao) {
    return 'As senhas não conferem.';
  }
  return null;
}

// O login não valida tamanho nem formato, para não bloquear contas antigas.
export function validarLogin(usuario, senha) {
  if (!usuario.trim() || !senha) {
    return 'Usuário e senha são obrigatórios.';
  }
  return null;
}

// Limites copiados de df_resolve/routes/denuncia_routes.py (CAMPOS_DENUNCIA, linhas 9 a 13).
// A ordem aqui é a da tela (título, endereço, descrição), para o erro apontar o primeiro campo vazio.
export const CAMPOS_DENUNCIA = {
  titulo: { nome: 'título', limite: 100 },
  endereco: { nome: 'endereço', limite: 200 },
  descricao: { nome: 'descrição', limite: 2000 },
};

// Chaves copiadas de CATEGORIAS em df_resolve/routes/denuncia_routes.py, na mesma ordem.
// A chave é o que vai para o servidor; o rótulo é o que aparece na tela.
export const CATEGORIAS = [
  { chave: 'buraco', rotulo: 'Buraco ou via danificada' },
  { chave: 'iluminacao', rotulo: 'Iluminação pública' },
  { chave: 'lixo', rotulo: 'Lixo e entulho' },
  { chave: 'calcada', rotulo: 'Calçada' },
  { chave: 'sinalizacao', rotulo: 'Sinalização de trânsito' },
  { chave: 'arvore', rotulo: 'Árvore e poda' },
  { chave: 'esgoto', rotulo: 'Esgoto e drenagem' },
  { chave: 'outros', rotulo: 'Outros' },
];
const CHAVES_CATEGORIA = CATEGORIAS.map((c) => c.chave);

// Denúncia antiga (null) devolve null; uma chave fora da lista devolve "Outra categoria".
export function rotuloCategoria(chave) {
  if (chave == null) return null;
  return CATEGORIAS.find((c) => c.chave === chave)?.rotulo ?? 'Outra categoria';
}

// Mesmas mensagens do servidor para os textos. No cadastro tudo é obrigatório, inclusive a categoria
// (regra só do app; a API aceita sem). Na edição ({ edicao: true }) só os campos enviados são
// conferidos, como no PATCH. A categoria vem primeiro porque o seletor fica no topo da tela.
export function validarDenuncia(valores, { edicao = false } = {}) {
  if (!edicao || 'categoria' in valores) {
    if (!CHAVES_CATEGORIA.includes(valores.categoria)) return 'Escolha uma categoria.';
  }
  for (const [campo, { nome, limite }] of Object.entries(CAMPOS_DENUNCIA)) {
    if (edicao && !(campo in valores)) continue;
    const valor = (valores[campo] ?? '').trim();
    if (!valor) return edicao ? `O campo ${nome} não pode ficar vazio.` : `O campo ${nome} é obrigatório.`;
    if (tamanho(valor) > limite) return `O campo ${nome} deve ter no máximo ${limite} caracteres.`;
  }
  return null;
}

// Localização (7C). Limites e casas copiados de LIMITES_LOCALIZACAO e CASAS_LOCALIZACAO em
// df_resolve/routes/denuncia_routes.py. O servidor continua sendo a autoridade e arredonda de novo.
export const LIMITES_LOCALIZACAO = { latitude: 90, longitude: 180 };
export const CASAS_LOCALIZACAO = 5;
export const MENSAGEM_LOCALIZACAO = 'Localização inválida.';

// 5 casas, como o servidor. toFixed devolve texto; Number() volta a número.
// Num valor que termina exatamente em 5 na sexta casa, o JavaScript e o Python podem arredondar
// diferente; o valor gravado é sempre o do servidor.
export function arredondarCoordenada(valor) {
  return Number(valor.toFixed(CASAS_LOCALIZACAO));
}

// localizacao: null (sem localização) ou { latitude, longitude } em números.
export function validarLocalizacao(localizacao) {
  if (localizacao == null) return null;
  for (const [campo, limite] of Object.entries(LIMITES_LOCALIZACAO)) {
    const valor = localizacao[campo];
    if (typeof valor !== 'number' || !Number.isFinite(valor) || Math.abs(valor) > limite) {
      return MENSAGEM_LOCALIZACAO;
    }
  }
  return null;
}

// Texto para a tela: "-15.79394, -47.88284", ou null quando não há localização.
export function textoLocalizacao(latitude, longitude) {
  if (latitude == null || longitude == null) return null;
  return `${latitude.toFixed(CASAS_LOCALIZACAO)}, ${longitude.toFixed(CASAS_LOCALIZACAO)}`;
}
