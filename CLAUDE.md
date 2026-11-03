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

### Modo rede (testes com celular)

- O IP `192.168.0.9` vem do DHCP do roteador e pode mudar. Antes de cada teste, conferir com `ipconfig` (adaptador Ethernet). Se mudar, atualizar o `mobile/.env` e os dois comandos abaixo.
- Flask (a partir da raiz): `cmd /c "set DF_RESOLVE_HOST=192.168.0.9&& .\venv\Scripts\python.exe -m df_resolve.app"`. O debug desliga sozinho (aparece o aviso e não aparece Debugger PIN). Não usar `0.0.0.0`: abriria o servidor também para a VPN Radmin (26.109.226.136).
- Expo (a partir da raiz): `cmd /c "set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.9&& cd mobile && npx.cmd expo start"`. Sem a variável, o QR pode usar o IP da VPN.
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
  limiter.py                 Flask-Limiter (limites por IP em /auth/login e /auth/register)
  instance/denuncias.db      BANCO EM USO (não versionado)
  denuncias.db               BANCO LEGADO, não usado pelo código; preservar
frontend/                    web antigo (login, register, denuncia funcionam; index.html quebrado)
instance/                    pasta vazia na raiz, sem uso
mobile/                      app Expo SDK 58, Expo Router, JavaScript
  app/_layout.js             Stack com título "DF Resolve"
  app/index.js               tela de teste de conexão (GET /auth/check)
  services/api.js            URL da API e chamada com tempo limite de 8 s
  .env.example               modelo versionado
  .env                       EXPO_PUBLIC_API_URL (não versionado)
requirements.txt
.gitignore                   inclui .vscode/ (configurações locais do editor)
CLAUDE.md
```

- `EXPO_PUBLIC_API_URL` fica embutida no app: nunca colocar segredos em variáveis `EXPO_PUBLIC_*`.
- Versões no `mobile/package.json`: expo ~58.0.22, react 19.3.0, react-native 0.88.1, expo-router ~58.0.29. Node v22.20.0, npm 10.9.3.

## Dependências instaladas no venv (verificado)

Flask 2.3.2, Flask-Cors 3.0.10, Flask-Login 0.6.2, Flask-SQLAlchemy 3.0.3, SQLAlchemy 2.0.41 (não fixado no requirements), Werkzeug 2.3.6.
Não atualizar isoladamente: Werkzeug 3 remove o hash `sha256` e exige Flask-Login 0.6.3 ou superior.
Flask-Limiter 4.1.1, com dependências fixadas no requirements: limits 5.8.0, ordered-set 4.1.0, Deprecated 1.3.1, wrapt 1.17.3, packaging 26.3. As versões mais novas de Deprecated (3.0.1) e wrapt (2.5.2) tinham menos de uma semana em 2026-11-03.

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
- Limites por IP (`request.remote_addr`; `X-Forwarded-For` é ignorado):
  - POST /auth/login: 5 falhas (401) por minuto e 20 por hora; 30 requisições por minuto no total.
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

## Problemas conhecidos

### Antes de produção
- O limite é por IP. Usuários atrás do mesmo IP (NAT de operadora móvel, escola) dividem a cota e podem ser bloqueados juntos. Rever os valores antes do app entrar em produção.
- Não há limite por conta: um ataque distribuído em vários IPs contra uma única conta não é contido.
- Atrás de um proxy reverso, todos os usuários teriam o IP do proxy. Será preciso `ProxyFix` com o número exato de proxies confiáveis.
- Com vários processos, cada um tem seus contadores, o que multiplica o limite. Seria preciso um armazenamento compartilhado (Redis).
- Um app Android instalado bloqueia requisições `http://` por padrão, então a API vai precisar de HTTPS.

### Demais
- As 5 contas originais continuam com `sha256` até fazerem login. Werkzeug 3 remove o `sha256`: atualizar antes da conversão impede o login dessas contas.
- `frontend/index.html` é de uma versão antiga do backend (pede e-mail, aponta para `app.js` inexistente) e é servido em `/`.
- `frontend/js/denuncia.js` não trata 401 quando o usuário não está logado.
- Login de usuário inexistente responde mais rápido que o de usuário existente. Não é vazamento novo: o cadastro já informa "Usuário já existe".
- Dependências de 2023 com vulnerabilidades corrigidas em versões posteriores.
- Aviso do Git `unable to find all commit-graph files`: é só cache; pode ser recriado com `git commit-graph write --reachable` mediante autorização.
- App mobile, revisar na próxima atualização do SDK do Expo:
  - `npm ls` acusa `react-dom@19.3.1` exigindo `react@^19.3.1`, mas o SDK 58 fixa `react` em 19.3.0. O react-dom só é usado na versão web (via expo-router); `expo install --check` aprova as versões.
  - `npm audit` aponta 11 vulnerabilidades moderadas indiretas em ferramentas de desenvolvimento (`glob`, `minimatch`, via `@expo/cli` e `@expo/config`). Não vão para o app. Não usar `npm audit fix`, que mudaria versões fixadas pelo SDK.

## Próxima etapa: Fase 4 (PROPOSTA, aguardando plano)

Autenticação por token para o app (detalhes no roadmap). Cria tabela nova: exige backup dos bancos e plano aprovado antes.

## Roadmap (PROPOSTA)

Decidido: app em `mobile/` neste repositório, navegação com Expo Router, JavaScript. A primeira versão faz só o que o backend já faz (cadastro, login, logout, criar e listar denúncias), sem foto, GPS ou categoria.

- Fase 3: esqueleto do app Expo em `mobile/` e teste de conexão com o Flask pela rede Wi-Fi, sem login. Concluída.
- Fase 4: autenticação por token para o app. Cria tabela nova: exige backup e plano antes. Proposta: token opaco aleatório, salvo como hash em `auth_token` (expiração e revogação), lido por `request_loader` do Flask-Login; rotas `/auth/token`, `/auth/token/revoke`, `/auth/me`; no app, token em `expo-secure-store` (nunca AsyncStorage). O fluxo web por cookie continua igual.
- Fase 5: telas de cadastro, login e logout.
- Fase 6: criar e listar denúncias.
- Fase 7: detalhes (`GET /denuncias/<id>` com checagem de dono), estados de carregamento, vazio e erro, e acabamento.

## Decisões pendentes do usuário

1. Token opaco (recomendado) ou JWT, para a Fase 4.
2. Destino do `index.html`.
3. Quem altera o status das denúncias (administrador?).
4. Novos campos para versões futuras: data, categoria, região administrativa, foto, GPS.
5. Ferramenta de migração (Flask-Migrate ou scripts manuais).
6. Quando atualizar dependências.