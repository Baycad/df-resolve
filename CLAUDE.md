# DF Resolve 2.0: guia para o Claude Code

Sistema de registro e acompanhamento de denúncias urbanas do Distrito Federal.
Backend Python/Flask existente; nova etapa: app mobile com React Native + Expo.
Repositório público: https://github.com/Baycad/df-resolve (branch `main`).

## Regras de trabalho (obrigatórias)

- Antes de alterar qualquer coisa: explique o plano, liste os arquivos que vai criar, editar ou remover e aguarde autorização.
- Nunca apague, sobrescreva ou recrie bancos `.db`, configurações ou histórico Git.
- Nunca faça commit ou push sem pedido explícito.
- Nunca use `git reset --hard`, `git clean`, force push ou `git checkout 9f2627a` (esse commit antigo contém bancos e sobrescreveria os `.db` locais).
- Não instale nem atualize dependências sem autorização.
- Não reescreva o backend; evolua de forma incremental.
- Preserve o frontend web antigo (`frontend/`).
- Não invente estado do projeto: verifique no código. Diferencie IMPLEMENTADO, PARCIAL, PLANEJADO, NÃO VERIFICADO e PROPOSTA.
- Nunca diga que testou algo sem ter executado o teste.
- Não coloque segredos, senhas, tokens ou dados pessoais em código, logs ou exemplos.

## Estilo das respostas

- Português brasileiro, didático e direto.
- Não usar travessão longo. Usar pontuação simples.
- Ao entregar código: caminho exato do arquivo, arquivo completo quando for mais seguro, e como testar.
- Dividir o trabalho em etapas pequenas: objetivo, plano, alterações, testes, pendências.

## Ambiente

- Windows 10. Terminal padrão: PowerShell no VS Code.
- Pasta do projeto: `X:\programação\DF-RESOLVE-BACKEND`
- Usar SEMPRE o venv: `.\venv\Scripts\python.exe` (Python 3.13.5). O Python global é 3.14 e não deve ser usado.
- Iniciar o servidor (a partir da raiz): `.\venv\Scripts\python.exe -m df_resolve.app`
- O usuário roda o servidor no próprio terminal. Para testes de API, usar `curl.exe` (não `curl`).
- No PowerShell, JSON com aspas deve ir por arquivo temporário em `$env:TEMP` com `--data-binary "@arquivo"`.
- Backups dos bancos: `X:\programação\DF-RESOLVE-BACKUPS\<pasta-nova>`. Nunca sobrescrever um backup existente.
- A pasta de backups só aceita escrita como administrador. O backup é feito pelo usuário em PowerShell de administrador.

### Variáveis de ambiente do backend

- `DF_RESOLVE_SECRET_KEY`: chave da sessão. Sem ela, uma chave temporária é gerada a cada início.
- `DF_RESOLVE_HOST` (padrão `127.0.0.1`), `DF_RESOLVE_PORT` (padrão `5000`), `DF_RESOLVE_DEBUG` (padrão ligado; desligado automaticamente se o host não for local).

## Estrutura verificada

```
df_resolve/
  app.py                     app Flask, config, login manager, erros JSON
  models/models.py           User, Denuncia
  routes/auth_routes.py      /auth/*
  routes/denuncia_routes.py  /denuncias/*
  instance/denuncias.db      BANCO EM USO (não versionado)
  denuncias.db               BANCO LEGADO, não usado pelo código; preservar
frontend/                    web antigo (login, register, denuncia funcionam; index.html quebrado)
instance/                    pasta vazia na raiz, sem uso
requirements.txt
.gitignore
CLAUDE.md
```

## Dependências instaladas no venv (verificado)

Flask 2.3.2, Flask-Cors 3.0.10, Flask-Login 0.6.2, Flask-SQLAlchemy 3.0.3, SQLAlchemy 2.0.41 (não fixado no requirements), Werkzeug 2.3.6.
Não atualizar isoladamente: Werkzeug 3 remove o hash `sha256` e exige Flask-Login 0.6.3 ou superior.

## Modelos (verificado)

- `User`: id, username (String 80, único), password (String 255 no modelo, hash `scrypt`).
  O banco em uso foi criado com VARCHAR(120); o SQLite não impõe o tamanho e grava hashes de 162 caracteres (testado). Outro banco exigiria migração.
- `Denuncia`: id, titulo (100), descricao (Text), endereco (200), status (padrão "Pendente"), user_id (FK user.id).
- Não existem: data de criação, categoria, foto, localização, papel de administrador.

## API atual (verificado e testado)

Todas as respostas de erro usam JSON no formato `{"message": "..."}`.

| Método | Rota | Auth | Corpo |
|---|---|---|---|
| POST | /auth/register | não | username (3 a 80, letras, números, `.` `_` `-`), password (8 a 128) |
| POST | /auth/login | não | username, password (cria sessão por cookie, Flask-Login) |
| POST | /auth/logout | sim | |
| GET | /auth/check | não | |
| POST | /denuncias/ | sim | titulo (até 100), descricao (até 2000), endereco (até 200) |
| GET | /denuncias/ | sim | lista apenas as denúncias do usuário logado |

- Sem login: 401 JSON. Corpo inválido: 400 JSON. Erro inesperado: 500 JSON, com traceback no terminal.
- O dono da denúncia vem sempre de `current_user`, nunca do cliente.
- Não existem rotas de detalhe, edição, exclusão ou alteração de status. O status nunca muda.
- CORS liberado só para `http://127.0.0.1:5500` (Live Server). O app nativo não depende de CORS.

## Histórico

- Fase 0 (auditoria): concluída.
- Fase 1 (segurança base): concluída e testada.
  - Commit `7ef47cb`: `.gitignore`, bancos e `.pyc` removidos do versionamento.
  - Commit `462d6c8`: 401/400 em JSON, validação de entrada, SECRET_KEY por ambiente, host/porta/debug configuráveis.
  - Push feito: `origin/main` em `462d6c8`.
  - Os bancos continuam no histórico do primeiro commit (`9f2627a`). São dados de teste; o usuário decidiu não reescrever o histórico.
- Fase 2 (hash de senha): implementada e testada em 2026-11-03, sem commit.
  - Cadastro com `scrypt`. Login correto com hash antigo converte para `scrypt`; se a gravação falhar, o login continua e a conversão é refeita no próximo acesso (aviso no log, sem hash e sem traceback).
  - Backup antes da fase: `X:\programação\DF-RESOLVE-BACKUPS\2026-10-31-antes-fase2`. A pasta foi criada em 2026-11-03; o nome segue o plano de 2026-10-31 e não deve ser alterado.
  - Testes T1 a T15 aprovados. T15: o banco legado `df_resolve/denuncias.db` tem SHA256 idêntico ao do backup.
  - Dados de teste criados: usuários `fase2_legado`, `fase2_legado2`, `fase2_novo` e denúncias 7 e 8. Eles permanecem no banco em uso e só podem ser removidos com autorização do usuário.

## Problemas conhecidos

### Prioridade alta
- Sem limite de tentativas de login. Agravado pela Fase 2: cada verificação `scrypt` usa cerca de 32 MB de memória (calculado pelos parâmetros N=32768 e r=8, não medido) e o login leva de 0,16 a 0,20 s (medido com `curl.exe`, tempo total da requisição em 4 logins de contas `scrypt`; o login com `sha256` levou 0,01 s). Tentativas repetidas permitem tanto adivinhar senhas quanto sobrecarregar o servidor.

### Demais
- As 5 contas originais continuam com `sha256` até fazerem login. Werkzeug 3 remove o `sha256`: atualizar antes da conversão impede o login dessas contas.
- `frontend/index.html` é de uma versão antiga do backend (pede e-mail, aponta para `app.js` inexistente) e é servido em `/`.
- `frontend/js/denuncia.js` não trata 401 quando o usuário não está logado.
- Login de usuário inexistente responde mais rápido que o de usuário existente. Não é vazamento novo: o cadastro já informa "Usuário já existe".
- Dependências de 2023 com vulnerabilidades corrigidas em versões posteriores.
- Aviso do Git `unable to find all commit-graph files`: é só cache; pode ser recriado com `git commit-graph write --reachable` mediante autorização.

## Próxima etapa (PROPOSTA, aguardando decisão)

1. Concluir a Fase 2: commit, se o usuário pedir.
2. Limite de tentativas de login, antes da Fase 3, por ser prioridade alta. A abordagem fica para decidir: Flask-Limiter (nova dependência) ou contador próprio.
3. Fase 3 (autenticação mobile), conforme o roadmap.

## Roadmap (PROPOSTA)

- Fase 3: autenticação mobile com token opaco aleatório, salvo como hash em nova tabela `auth_token` (expiração e revogação), lido por `request_loader` do Flask-Login. Rotas `/auth/token`, `/auth/token/revoke`, `/auth/me`. O fluxo web por cookie continua igual.
- Fase 4: `GET /denuncias/<id>` com checagem de dono; POST retornando o objeto criado.
- Fase 5: app em `mobile/` com Expo, Expo Router, JavaScript, `services/api.js`, `AuthContext`, token em `expo-secure-store` (nunca AsyncStorage), URL da API em `EXPO_PUBLIC_API_URL`.
- Fases 6 e 7: telas de autenticação e de denúncias, com estados de carregamento, vazio e erro.

## Decisões pendentes do usuário

1. Como implementar o limite de tentativas de login (Flask-Limiter ou contador próprio) e se ele vem antes da Fase 3.
2. Mobile em `mobile/` neste repositório?
3. Token opaco (recomendado) ou JWT?
4. Expo Router + JavaScript?
5. Destino do `index.html`.
6. Quem altera o status das denúncias (administrador?).
7. Novos campos: data, categoria, região administrativa, foto, GPS.
8. Ferramenta de migração (Flask-Migrate ou scripts manuais).
9. Quando atualizar dependências.