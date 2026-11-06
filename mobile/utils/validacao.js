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

// Mesmas mensagens do POST /denuncias/ no servidor.
export function validarDenuncia(valores) {
  for (const [campo, { nome, limite }] of Object.entries(CAMPOS_DENUNCIA)) {
    const valor = (valores[campo] ?? '').trim();
    if (!valor) return `O campo ${nome} é obrigatório.`;
    if (tamanho(valor) > limite) return `O campo ${nome} deve ter no máximo ${limite} caracteres.`;
  }
  return null;
}
