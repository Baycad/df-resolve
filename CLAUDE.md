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
- A pasta de backups só aceita escrita como administrador. O backup é feito pelo usuário em PowerShell de administrador, com o bloco inteiro dentro de `& { $ErrorActionPreference = "Stop"; ... }`, para parar no primeiro erro, e conferência do SHA256 das cópias.
- Scripts Python que precisem de aspas vão em arquivo `.py` no scratchpad, executados com `.\venv\Scripts\python.exe -I`. Nunca `python -c` no PowerShell, que desmonta as aspas.
- Funções auxiliares no PowerShell não podem ter nome igual a um apelido embutido (por exemplo, `R` é apelido de `Invoke-History`).
- Durante uma bateria de testes, o usuário não usa o site em paralelo sem avisar antes.
- Comandos que dependem de pasta usam caminho absoluto: `cmd /c "cd /d <caminho> && ..."`. Quando for preciso trocar de pasta no PowerShell, o comando seguinte vai dentro de `if ($?) { ... }`, para não rodar se a troca falhar.
- Antes de qualquer `npm`/`npx` no app, conferir que `X:\programação\DF-RESOLVE-BACKEND\mobile\package.json` tem `"name": "mobile"`.
- Testes com log: sempre neste formato, com `cd /d` absoluto e as aspas do log dobradas dentro do `cmd /c`:
  - Flask, modo padrão: `cmd /c "cd /d X:\programação\DF-RESOLVE-BACKEND && set DF_RESOLVE_DEBUG=0&& .\venv\Scripts\python.exe -u -m df_resolve.app >> ""%TEMP%\<arquivo>.log"" 2>&1"`. O `DF_RESOLVE_DEBUG=0` evita o reloader.
  - Flask e Metro em modo rede: ver abaixo. O Metro leva `--clear` quando há tela nova.
  - Sem terminal interativo, o projeto é aberto pelo "Recently opened" do Expo Go ou por `exp://192.168.0.9:8081`.
  - Um Ctrl+C no Flask não deixa linha no log; um novo início aparece como um novo bloco "Rotas disponíveis".
- Links diretos para telas do app (`exp://192.168.0.9:8081/--/<rota>`): tocar no link numa conversa abre o Chrome, e não o app. Usar a opção "Enter URL manually" do Expo Go.
- Conferência do banco em testes que alteram dados: antes do teste, salvar uma foto com `foto_banco.py <arquivo>.json salvar` (no scratchpad, um arquivo novo por teste; ele recusa sobrescrever) e, depois, `comparar`. A foto guarda só o SHA-256 de cada linha de todas as tabelas; a comparação mostra só tabela e id. O `foto_banco.py` fica no scratchpad da sessão e não é versionado: quando for necessário, deve ser recriado e mostrado ao usuário antes de rodar.

### Modo rede (testes com celular)

- O IP `192.168.0.9` vem do DHCP do roteador e pode mudar. Antes de cada teste, conferir com `ipconfig` (adaptador Ethernet). Se mudar, atualizar o `mobile/.env` e os dois comandos abaixo.
- Flask: `cmd /c "cd /d X:\programação\DF-RESOLVE-BACKEND && set DF_RESOLVE_HOST=192.168.0.9&& .\venv\Scripts\python.exe -u -m df_resolve.app >> ""%TEMP%\<arquivo>-servidor.log"" 2>&1"`. O debug desliga sozinho (aparece o aviso e não aparece Debugger PIN). Não usar `0.0.0.0`: abriria o servidor também para a VPN Radmin (26.109.226.136).
- Expo: `cmd /c "cd /d X:\programação\DF-RESOLVE-BACKEND\mobile && set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.9&& npx.cmd expo start --clear >> ""%TEMP%\<arquivo>-metro.log"" 2>&1"`. Sem a variável, o QR pode usar o IP da VPN.
- O site antigo chama sempre `http://127.0.0.1:5000`, então só funciona com o Flask em modo padrão. Em modo rede, o Flask não responde em `127.0.0.1`.
- O Metro escuta em todas as interfaces (`0.0.0.0:8081`), inclusive a da VPN Radmin; a variável acima só define o endereço do QR. A VPN está no perfil Público e a regra de firewall da 8081 vale só para o perfil Privado e a sub-rede local, então pela VPN a porta deve estar bloqueada. NÃO VERIFICADO.
- Ao terminar, voltar o Flask ao modo padrão.
- Sempre usar `npm.cmd` e `npx.cmd`, e nunca chamar `npx` com nomes vindos de variáveis.
- Firewall do Windows: duas regras de entrada, perfil Privado, só sub-rede local, criadas pelo usuário como administrador: "DF Resolve - Flask 5000 (rede privada)" e "DF Resolve - Expo Metro 8081 (rede privada)". Para remover (PowerShell de administrador):
  - `Remove-NetFirewallRule -DisplayName "DF Resolve - Flask 5000 (rede privada)"`
  - `Remove-NetFirewallRule -DisplayName "DF Resolve - Expo Metro 8081 (rede privada)"`

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
  limiter.py                 Flask-Limiter (limites por IP em /auth/login, /auth/token e /auth/register)
  auth_tokens.py             tokens do app: emissão, leitura do Bearer, revogação
  instance/denuncias.db      BANCO EM USO (não versionado)
  denuncias.db               BANCO LEGADO, não usado pelo código; preservar
frontend/                    web antigo (login, register, denuncia funcionam; index.html quebrado)
instance/                    pasta vazia na raiz, sem uso
mobile/                      app Expo SDK 58, Expo Router, JavaScript
  app/_layout.js             SessaoProvider, splash e Stack.Protected
  app/(app)/_layout.js       Stack logado, com botão Sair
  app/(app)/index.js         Minhas Denúncias (rota "/"): id maior primeiro, recarga ao ganhar foco, trava de toque duplo
  app/(app)/nova.js          nova denúncia (POST /denuncias/), com contadores e trava de toques repetidos
  app/(app)/denuncia/[id].js detalhe, edição (PATCH só dos campos alterados) e exclusão com confirmação; só leitura se não for Pendente
  app/login.js               login por POST /auth/token
  app/cadastro.js            cadastro com confirmação de senha e login automático
  app/diagnostico.js         teste de conexão (GET /auth/check), sem login
  components/ui.js           Tela, Campo, Botao, Link, Mensagem
  components/BotaoSair.js
  contexts/sessao.js         sessão; token só em memória e no expo-secure-store
  services/api.js            requisições, Bearer, tempo limite (8 s; 5 s no logout), erros
  utils/validacao.js         regras copiadas de auth_routes.py e denuncia_routes.py (limites 100/200/2000, mesma ordem da tela)
  .env.example               modelo versionado
  .env                       EXPO_PUBLIC_API_URL (não versionado)
requirements.txt
.gitignore                   inclui .vscode/ (configurações locais do editor)
CLAUDE.md
```

- `EXPO_PUBLIC_API_URL` fica embutida no app: nunca colocar segredos em variáveis `EXPO_PUBLIC_*`.
- Versões no `mobile/package.json`: expo ~58.0.22, react 19.3.0, react-dom 19.3.0, react-native 0.88.1, expo-router ~58.0.29, expo-secure-store ~58.0.2. Node v22.20.0, npm 10.9.3.

## Dependências instaladas no venv (verificado)

Flask 2.3.2, Flask-Cors 3.0.10, Flask-Login 0.6.2, Flask-SQLAlchemy 3.0.3, SQLAlchemy 2.0.41 (não fixado no requirements), Werkzeug 2.3.6.
Não atualizar isoladamente: Werkzeug 3 remove o hash `sha256` e exige Flask-Login 0.6.3 ou superior.
Flask-Limiter 4.1.1, com dependências fixadas no requirements: limits 5.8.0, ordered-set 4.1.0, Deprecated 1.3.1, wrapt 1.17.3, packaging 26.3. As versões mais novas de Deprecated (3.0.1) e wrapt (2.5.2) tinham menos de uma semana em 2026-11-03.

## Modelos (verificado)

- `User`: id, username (String 80, único), password (String 255 no modelo, hash `scrypt`).
  O banco em uso foi criado com VARCHAR(120); o SQLite não impõe o tamanho e grava hashes de 162 caracteres (testado). Outro banco exigiria migração.
- `Denuncia`: id, titulo (100), descricao (Text), endereco (200), status (padrão "Pendente"), user_id (FK user.id).
- `AuthToken` (tabela `auth_token`): id, token_hash (String 64, único, SHA-256 em hex), user_id (FK user.id, com índice), created_at, expires_at, revoked_at (vazio enquanto ativo). Datas em UTC sem fuso. O token em texto nunca é gravado.
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
| POST | /auth/token | não | username, password. 200 com `token`, `token_type: Bearer` e `expires_at` (30 dias), `Cache-Control: no-store`. Não cria cookie |
| POST | /auth/token/revoke | Bearer | revoga o token enviado; inválido, expirado ou revogado: 401 |
| GET | /auth/me | sim | `{id, username}` |
| GET | /denuncias/<id> | sim | `{id, titulo, descricao, endereco, status}`. Denúncia de outro dono ou inexistente: 404 igual |
| PATCH | /denuncias/<id> | sim | parcial: só titulo, descricao e endereco (mesmos limites, com `strip`). Campo fora desses: 400. Corpo sem nenhum campo: 400. Status diferente de "Pendente": 409 (antes de validar o corpo) |
| DELETE | /denuncias/<id> | sim | exclusão física. Status diferente de "Pendente": 409 |

- "Auth sim" aceita cookie de sessão ou `Authorization: Bearer <token>` (pelo `request_loader`). Com os dois, vale a sessão.
- O token só é aceito no cabeçalho, nunca na URL. Cabeçalho malformado é tratado como ausente (401). `/auth/check` também reconhece o Bearer. `POST /auth/logout` com Bearer revoga o token.
- Token: 43 caracteres (`secrets.token_urlsafe(32)`); no banco só o SHA-256.
- Sem login: 401 JSON. Corpo inválido: 400 JSON. Erro inesperado: 500 JSON, com traceback no terminal.
- O dono da denúncia vem sempre de `current_user`, nunca do cliente.
- Não existe rota de alteração de status. Nos testes, o status só mudou por script autorizado (`status_denuncia.py`).
- Id que não é número inteiro (`/denuncias/abc`, `/denuncias/-1`): 404 no GET e 405 JSON no PATCH e no DELETE, por causa da rota de arquivos do frontend em `/` (`static_url_path="/"`). Contrato aceito no 6A. O app recusa esses ids antes de chamar o servidor.
- `POST /denuncias/` ignora campos extras (`status`, `user_id`, `id`): a denúncia nasce Pendente e do usuário logado.
- CORS liberado só para `http://127.0.0.1:5500` (Live Server). O app nativo não depende de CORS.
- Limites por IP (`request.remote_addr`; `X-Forwarded-For` é ignorado):
  - POST /auth/login e POST /auth/token, com contadores compartilhados (`shared_limit`, escopos `login_total` e `login_falhas`): 5 falhas (401) por minuto e 20 por hora; 30 requisições por minuto no total.
  - POST /auth/register: 3 por minuto e 10 por hora.
  - Estourou: 429 com `{"message": "Muitas tentativas. Aguarde um pouco e tente novamente."}` e `Retry-After`.
  - Nenhuma outra rota é limitada. Preflight OPTIONS não conta.
- Contadores em memória: zeram ao reiniciar o servidor ou quando o reloader do debug recarrega.

## Histórico

- Fase 0 (auditoria): concluída.
- Fase 1 (segurança base): concluída e testada.
  - Commit `7ef47cb`: `.gitignore`, bancos e `.pyc` removidos do versionamento.
  - Commit `462d6c8`: 401/400 em JSON, validação de entrada, SECRET_KEY por ambiente, host/porta/debug configuráveis.
  - Push da Fase 1 feito (`origin/main` em `462d6c8` na época).
  - Os bancos continuam no histórico do primeiro commit (`9f2627a`). São dados de teste; o usuário decidiu não reescrever o histórico.
- Fase 2 (hash de senha): implementada e testada em 2026-11-03. Commit `5708667`.
  - Cadastro com `scrypt`. Login correto com hash antigo converte para `scrypt`; se a gravação falhar, o login continua e a conversão é refeita no próximo acesso (aviso no log, sem hash e sem traceback).
  - Backup antes da fase: `X:\programação\DF-RESOLVE-BACKUPS\2026-10-31-antes-fase2`. A pasta foi criada em 2026-11-03; o nome segue o plano de 2026-10-31 e não deve ser alterado.
  - Testes T1 a T15 aprovados. T15: o banco legado `df_resolve/denuncias.db` tem SHA256 idêntico ao do backup.
  - Dados de teste criados: usuários `fase2_legado`, `fase2_legado2`, `fase2_novo` e denúncias 7 e 8. Eles permanecem no banco em uso e só podem ser removidos com autorização do usuário.
  - Push feito: `origin/main` em `25dd2e4` (inclui `f61d781`, `5708667`, `5c08569` e `25dd2e4`).
- Limite de tentativas (Flask-Limiter): implementado e testado em 2026-11-03. Commit "feat(auth): limita tentativas de login e cadastro por IP com Flask-Limiter".
  - Motivo: cada verificação `scrypt` usa cerca de 32 MB de memória (calculado pelos parâmetros N=32768 e r=8, não medido) e o login leva de 0,16 a 0,20 s (medido com `curl.exe`, tempo total da requisição). Sem limite, tentativas repetidas permitiam adivinhar senhas e sobrecarregar o servidor.
  - Testes L1 a L14, reinício (contadores zeram) e navegador (alert com a mensagem do 429) aprovados.
  - Dado de teste criado: usuário `limite_teste`. Ele permanece no banco em uso e só pode ser removido com autorização do usuário.
- Fase 3 (esqueleto Expo e conexão pela rede): implementada e testada em 2026-11-03. Commit "feat(mobile): cria app Expo SDK 58 com Expo Router e teste de conexao com a API".
  - Criado com `create-expo@5.1.6`, template `blank@sdk-58`; `App.js`, `index.js` e `LICENSE` do template removidos. Backend sem alteração.
  - Testes C1 a C12 aprovados: em modo rede o Flask escuta só em 192.168.0.9, `/console` dá 404, localhost e o IP da VPN não respondem; o celular (Expo Go, Android) mostra 200 com `logged_in: false`, erro sem travar com o Flask desligado, volta ao religar e mostra erro de URL ausente com `EXPO_NO_DOTENV=1`; `/auth/check` não tem limite.
  - Nenhum dado criado no banco.
- Fase 4 (autenticação por token opaco): implementada e testada em 2026-11-04 e 2026-11-05. Commit "feat(auth): adiciona autenticacao por token opaco para o app mobile".
  - Backup antes da fase: `X:\programação\DF-RESOLVE-BACKUPS\2026-11-04-antes-fase4`.
  - Tabela `auth_token` criada pelo `db.create_all()`, ensaiado antes numa cópia (só `CREATE TABLE` e `CREATE INDEX`).
  - Testes M1, M2, R0, F1 a F17 e F14b aprovados. A busca no log não verificou os cookies de sessão (o curl apagou os valores no logout).
  - Dados de teste criados: usuário `fase4_teste`; denúncias 9 e 11 (de `fase4_teste`) e 10 (da conta `teste_fase2`, do usuário); 4 linhas em `auth_token`, todas de `fase4_teste`, revogadas ou expiradas (a linha 3 teve o `expires_at` alterado à mão no F9). Só podem ser removidos com autorização do usuário.
  - A conta `teste_fase2` foi convertida para scrypt no login pelo navegador.
- Fase 5 (cadastro, login e logout no app): implementada e testada em 2026-11-05 e 2026-11-06. Commit `603197c`.
  - Backup antes da fase: `X:\programação\DF-RESOLVE-BACKUPS\2026-11-05-antes-fase5`. Backend e banco sem alteração de código ou esquema.
  - Incidente: a primeira instalação do `expo-secure-store` rodou dentro de `mobile\node_modules\expo-router`, porque a troca de pasta falhou. O `mobile\node_modules` foi recriado com `npm ci` a partir do lockfile; nenhum arquivo versionado foi afetado.
  - O `react-dom` foi alinhado a 19.3.0 (versão do SDK), o que eliminou o conflito do `npm ls` e a necessidade do `--legacy-peer-deps`.
  - Testes P1 a P3, T1 a T20, T17b, T10r e T17r aprovados.
  - Lacuna: no bloco D, dois inícios do Flask não aparecem no log; o T15b foi aprovado só pela tela, e o T20 não cobre a saída desses dois processos.
  - Dados de teste criados: usuário `fase5_teste`; tokens ids 6 e 8 a 13 (`fase5_teste`) e 5 e 7 (`teste_fase2`), todos revogados (ids 8, 9, 10, 11 e 13 revogados por script, com autorização). Só podem ser removidos com autorização do usuário.
  - A conta `fase4_teste` não serve mais para testes de login: a senha foi apagada na limpeza da Fase 4.
- Fase 6 (detalhe, criação, edição e exclusão de denúncias no app): implementada e testada de 2026-11-06 a 2026-11-09.
  - Backup antes da fase: `X:\programação\DF-RESOLVE-BACKUPS\2026-11-06-antes-fase6`. Esquema do banco sem alteração.
  - 6A (backend), commit `c77b3a5`: `GET`, `PATCH` e `DELETE /denuncias/<id>`, só do dono. Testes A1 a A16 aprovados (A16: 0 tokens no log).
  - 6B (criar e listar no app), commit `d2173ed`: testes P2, P3 e B1 a B12 aprovados.
  - 6C (editar e excluir no app), commit `aae9ef0` (push feito): testes C1 a C15 aprovados, com estas notas:
    - C6: um único `PATCH`, mas os toques que sobraram abriam o cartão duas vezes na lista. Corrigido no 6D.
    - C10: a conferência das outras linhas foi só parcial (sem foto antes). Daí a regra do `foto_banco.py`, usada do C12 em diante.
    - C13 original: inconclusivo, NÃO VERIFICADO. Causa provável: o link tocado na conversa abriu o Chrome e não chegou ao app. Repetido com "Enter URL manually": um único `GET /denuncias/15 404`, nenhum pedido com `abc`. No meio, o usuário saiu e entrou de novo (token 21 revogado, 22 criado).
  - 6D (trava de toque duplo na lista), commit `d206813`: testes T1 a T7 aprovados. T3 e T6 valem só pela tela; T4 aprovado pela tela e pelo log, e o cancelamento do temporizador foi verificado por revisão do código (a corrida não é reproduzível à mão).
  - Módulos: o `expo export` foi de 1154 (Fase 5) para 1156 (6C e 6D). O bundle de desenvolvimento do Metro é outra medida: 1291 no 6B e 1292 no 6D. A diferença de 1 e as linhas `Bundled ... (1 module)` ficam NÃO INVESTIGADAS, sem indicação de erro; a hipótese é que o Expo Go recarregou o app (NÃO VERIFICADA).
  - Duas atualizações seguidas da lista no log (C13 repetido): NÃO VERIFICADO, sem indicação de falha.
  - Dados de teste criados (só podem ser removidos com autorização do usuário):
    - usuários `fase6_teste` e `fase6_outro`, sem senha conhecida (como a `fase4_teste`);
    - denúncias 12 e 18 (`fase6_teste`, Pendente), 14 (`fase6_teste`, "Em análise" por script), 15 (`fase6_outro`), 16 e 17 (`fase5_teste`, pelo site), 20 (`fase5_teste`, "Em análise" por script no C7) e 21 (`fase5_teste`, título "Teste C11"). A 13 e a 19 foram excluídas nos testes;
    - tokens 14 a 22, todos revogados (17, 20 e 22 por script, com autorização). Ao fim da fase, 0 tokens ativos em todas as contas, e 0 tokens nos logs do 6C e do 6D.

## Problemas conhecidos

### Antes de produção
- O limite é por IP. Usuários atrás do mesmo IP (NAT de operadora móvel, escola) dividem a cota e podem ser bloqueados juntos. Rever os valores antes do app entrar em produção.
- Não há limite por conta: um ataque distribuído em vários IPs contra uma única conta não é contido.
- Atrás de um proxy reverso, todos os usuários teriam o IP do proxy. Será preciso `ProxyFix` com o número exato de proxies confiáveis.
- Com vários processos, cada um tem seus contadores, o que multiplica o limite. Seria preciso um armazenamento compartilhado (Redis).
- Um app Android instalado bloqueia requisições `http://` por padrão, então a API vai precisar de HTTPS.
- Tokens vencidos e revogados ficam acumulados em `auth_token` (não há limpeza).
- Não existe "sair de todos os aparelhos" nem limite de tokens ativos por usuário.
- Logout sem rede: o token é apagado do aparelho, mas continua ativo no servidor até expirar (30 dias).
- Caso das 10:29:53 de 2026-11-06, NÃO EXPLICADO: depois de um Sair sem rede (T17), o app abriu com um token ainda salvo. Não se repetiu no T17b nem no T17r. Desde então, o `apagarToken` confere a remoção, tenta de novo e avisa se falhar; o caminho de falha desse reforço está NÃO TESTADO (não dá para provocar a falha no aparelho).
- A exclusão de denúncia é física (sem histórico nem como desfazer). Avaliar exclusão lógica.
- Configurar explicitamente o `SESSION_COOKIE_SAMESITE` (hoje vale o padrão do navegador). As rotas `PATCH` e `DELETE` também aceitam o cookie de sessão do site.
- Se a criação de uma denúncia passar dos 8 s mas o servidor gravar, o app mostra erro e um novo toque cria uma duplicata.

### Demais
- 4 contas continuam com `sha256` até fazerem login. Werkzeug 3 remove o `sha256`: atualizar antes da conversão impede o login dessas contas.
- `frontend/index.html` é de uma versão antiga do backend (pede e-mail, aponta para `app.js` inexistente) e é servido em `/`.
- `frontend/js/denuncia.js` não trata 401 quando o usuário não está logado.
- O botão Sair de `frontend/js/denuncia.js` redireciona para o login sem olhar a resposta do servidor.
- Login de usuário inexistente responde mais rápido que o de usuário existente. Não é vazamento novo: o cadastro já informa "Usuário já existe".
- Dependências de 2023 com vulnerabilidades corrigidas em versões posteriores.
- Aviso do Git `unable to find all commit-graph files`: é só cache; pode ser recriado com `git commit-graph write --reachable` mediante autorização.
- App mobile, revisar na próxima atualização do SDK do Expo:
  - `npm audit` aponta 8 vulnerabilidades moderadas indiretas em ferramentas de desenvolvimento (eram 11; a causa da mudança não foi investigada). Não vão para o app. Não usar `npm audit fix`, que mudaria versões fixadas pelo SDK.
- Revisar na Fase 7:
  - As mensagens de erro do app usam termos técnicos ("Flask", "modo rede").
  - No `PATCH`, um título numérico (`123`) ou `null` recebe "O campo título não pode ficar vazio.", que não descreve bem o caso.
  - Na tela de detalhe, a mensagem de erro de validação continua visível depois que o campo é corrigido.

## Próxima etapa: Fase 7 (PROPOSTA, aguardando plano)

Estados de carregamento, vazio e erro, revisão das mensagens e acabamento.

## Roadmap (PROPOSTA)

Decidido: app em `mobile/` neste repositório, navegação com Expo Router, JavaScript, token opaco. A primeira versão faz só o que o backend já faz (cadastro, login, logout, criar, listar, ver, editar e excluir denúncias), sem foto, GPS ou categoria.

- Fase 3: esqueleto do app Expo em `mobile/` e teste de conexão com o Flask pela rede Wi-Fi, sem login. Concluída.
- Fase 4: autenticação por token para o app. Cria tabela nova: exige backup e plano antes. Proposta: token opaco aleatório, salvo como hash em `auth_token` (expiração e revogação), lido por `request_loader` do Flask-Login; rotas `/auth/token`, `/auth/token/revoke`, `/auth/me`; no app, token em `expo-secure-store` (nunca AsyncStorage). O fluxo web por cookie continua igual. Concluída.
- Fase 5: telas de cadastro, login e logout. Concluída.
- Fase 6: criar, listar, ver, editar e excluir denúncias (o `GET /denuncias/<id>` com checagem de dono entrou aqui). Concluída.
- Fase 7: estados de carregamento, vazio e erro, revisão das mensagens e acabamento.

## Decisões pendentes do usuário

1. Destino do `index.html`: ele é servido em `/` e confunde quem abre a raiz.
2. Quem altera o status das denúncias (administrador?).
3. Novos campos para versões futuras: data, categoria, região administrativa, foto, GPS.
4. Ferramenta de migração (Flask-Migrate ou scripts manuais).
5. Quando atualizar dependências. O `expo install --check` aponta 5 patches do SDK 58: `expo` 58.0.23, `expo-constants` 58.0.15, `expo-linking` 58.0.16, `expo-router` 58.0.30 e `react-native-safe-area-context` 5.11.1.