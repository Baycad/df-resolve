# DF Resolve

Aplicativo mobile para registrar e acompanhar problemas urbanos no Distrito Federal, como buracos, iluminação pública, lixo, calçadas, sinalização, árvores e esgoto.

Projeto acadêmico da disciplina de Desenvolvimento de Aplicativo Mobile. É formado por três partes:

- **App mobile** em React Native com Expo (pasta `mobile/`).
- **API** em Python com Flask e SQLite (pasta `df_resolve/`).
- **Site web antigo**, preservado como estava (pasta `frontend/`).

## Funcionalidades

- Cadastro, login e logout, com token de acesso (Bearer).
- Registro de denúncia com categoria, título, endereço e descrição.
- Localização opcional por GPS, usada somente quando a pessoa toca em "Usar minha localização", com a opção "Remover localização" antes de registrar ou ao editar uma denúncia pendente.
- Lista "Minhas Denúncias" com selo de status, categoria e botão fixo para nova denúncia.
- Detalhes da denúncia. Edição e exclusão (com confirmação) enquanto o status é Pendente.
- Sessão mantida ao fechar e reabrir o app.
- Estados de carregamento, lista vazia e erro, inclusive sem conexão com o servidor.

Categorias disponíveis: buraco ou via danificada, iluminação pública, lixo e entulho, calçada, sinalização de trânsito, árvore e poda, esgoto e drenagem, e outros.

Hoje toda denúncia nasce com o status **Pendente**. A atualização do status por um órgão responsável ainda não existe.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| App | React Native, Expo SDK 58, Expo Router, expo-secure-store, expo-location |
| API | Python 3.13, Flask 2.3.2, Flask-SQLAlchemy 3.0.3, SQLAlchemy 2.0.41, Flask-Limiter, Flask-Login, Flask-CORS |
| Banco | SQLite |
| Build do APK | EAS Build |

## Estrutura do repositório

```
df_resolve/        API Flask (app.py, limiter.py, auth_tokens.py, models/, routes/, migracoes/)
frontend/          site web antigo, preservado
mobile/            app Expo (app/, components/, contexts/, services/, utils/)
requirements.txt   dependências do backend
CLAUDE.md          histórico, decisões e estado do projeto
PRODUCT.md         visão do produto e do design
```

## Como rodar localmente (Windows, PowerShell)

### Backend

Na raiz do repositório (o projeto foi testado com Python 3.13):

```powershell
py -3.13 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m df_resolve.app
```

O servidor sobe em `http://127.0.0.1:5000`. O banco SQLite é criado na primeira execução, dentro de `df_resolve/instance/`, e não é versionado.

Para o celular acessar o servidor, defina o endereço da sua rede local antes de iniciar (o projeto evita `0.0.0.0` para não expor o servidor em outras interfaces):

```powershell
$env:DF_RESOLVE_HOST = "192.168.0.10"
python -m df_resolve.app
```

Variáveis de ambiente do backend:

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `DF_RESOLVE_SECRET_KEY` | temporária | Chave da sessão. Sem ela o servidor usa uma chave temporária e avisa. Defina em qualquer ambiente real. |
| `DF_RESOLVE_HOST` | `127.0.0.1` | Endereço em que o servidor escuta. |
| `DF_RESOLVE_PORT` | `5000` | Porta do servidor. |
| `DF_RESOLVE_DEBUG` | ligado | Modo debug. Desliga automaticamente se o host não for local. |
| `DF_RESOLVE_REAL_IP_HEADER` | vazio | Cabeçalho com o IP real do cliente atrás de um proxy (por exemplo `X-Real-IP`), usado nos limites de tentativas. Só ligue se o proxy sobrescrever esse cabeçalho. |

### App mobile

Em `mobile/`, com Node.js instalado:

```powershell
cd mobile
npm install
```

Crie o arquivo `mobile/.env` (ele não é versionado; há um modelo em `mobile/.env.example`) com o endereço da API:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:5000
```

Inicie o Metro e abra no Expo Go (compatível com o SDK 58), com o celular na mesma rede do computador:

```powershell
npx expo start
```

## Gerar o APK (EAS Build)

O perfil `preview` de `mobile/eas.json` gera um APK de distribuição interna. O endereço da API entra no build pela variável `EXPO_PUBLIC_API_URL` desse perfil, e precisa ser **HTTPS**, porque o Android bloqueia HTTP em apps instalados. O `eas.json` exige que as alterações estejam commitadas antes do build (`requireCommit`).

```powershell
cd mobile
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

O pacote Android é `com.dfresolve.app`. Para usar a sua própria conta Expo, retire `owner` e `extra.eas.projectId` do `mobile/app.json`, rode `npx eas-cli init` e ajuste a URL da API no perfil.

## Hospedagem de demonstração

A versão de demonstração roda no plano gratuito do PythonAnywhere, em `https://baycad.pythonanywhere.com`. No plano gratuito, a aplicação é desativada se não for renovada a cada mês, então o endereço pode estar fora do ar. Pontos para quem quiser repetir:

- O arquivo WSGI importa `from df_resolve.app import app as application`.
- As tabelas são criadas uma vez com `db.create_all()` no console, porque o `create_all` do projeto só roda quando o app é iniciado diretamente.
- A chave da sessão vem de variável de ambiente, fora do Git.
- Atrás do balanceador do PythonAnywhere, o `remote_addr` é o do balanceador. Por isso o servidor define `DF_RESOLVE_REAL_IP_HEADER=X-Real-IP`, para que cada cliente tenha o seu contador de tentativas.

## API

Rotas de autenticação e denúncias usadas pelo app. As rotas marcadas com Bearer exigem autenticação: o app envia o cabeçalho `Authorization: Bearer <token>`; o site antigo usa o cookie de sessão criado por `POST /auth/login` (e sai por `POST /auth/logout`). Cada pessoa só vê e altera as próprias denúncias.

| Método | Caminho | Autenticação | O que faz |
| --- | --- | --- | --- |
| GET | `/auth/check` | não | Informa se há usuário autenticado, por sessão ou token (`{"logged_in": false}` sem autenticação). |
| POST | `/auth/register` | não | Cria uma conta. |
| POST | `/auth/token` | não | Valida usuário e senha e devolve o token Bearer e a data de expiração. |
| GET | `/auth/me` | Bearer | Devolve o id e o nome do usuário autenticado. |
| POST | `/auth/token/revoke` | Bearer | Revoga o token (logout). |
| GET | `/denuncias/` | Bearer | Lista as denúncias do usuário. |
| POST | `/denuncias/` | Bearer | Cria uma denúncia. |
| GET | `/denuncias/<id>` | Bearer | Mostra uma denúncia do usuário. |
| PATCH | `/denuncias/<id>` | Bearer | Edita uma denúncia do usuário, só se o status for Pendente. |
| DELETE | `/denuncias/<id>` | Bearer | Exclui uma denúncia do usuário, só se o status for Pendente. |

Códigos comuns: `400` dados inválidos, `401` sem autenticação ou com token inválido, expirado ou revogado, `404` denúncia inexistente ou de outra pessoa, `409` edição ou exclusão de denúncia que não está Pendente, `429` quando o limite de tentativas é excedido (com o cabeçalho `Retry-After`).

## Segurança

- Senhas guardadas com hash (scrypt).
- Token de acesso aleatório, com expiração e revogação. O servidor guarda apenas o hash do token.
- No celular, o token fica no armazenamento seguro do sistema (`expo-secure-store`).
- Limite de tentativas por IP nas rotas de login e de cadastro.
- Comunicação por HTTPS no servidor hospedado.
- Permissões do Android não usadas pelo app são bloqueadas no build. A única permissão pedida à pessoa é a localização, só em primeiro plano; a localização em segundo plano não é usada.
- Segredos, bancos de dados e arquivos `.env` ficam fora do Git.

## Testes realizados

Os testes foram manuais, fase por fase (registrados no `CLAUDE.md`). Para a versão hospedada: 13 testes de fumaça por chamadas HTTP contra o servidor (autenticação, criação, edição e exclusão de denúncias, acesso sem token, revogação e limite de tentativas) e 10 testes do APK em um aparelho Android (instalação, cadastro, login, denúncias, localização, falta de conexão, sessão e permissões).

## Limitações e próximos passos

- O status da denúncia ainda não muda. Falta um painel para o órgão responsável.
- Não há fotos, mapa nem notificações.
- O servidor gratuito é adequado para demonstração, não para produção. Em produção seriam necessários um servidor próprio, um banco mais robusto e contadores de limite compartilhados.
- O app foi testado em Android. Não há build para iOS.

## Documentação do projeto

- `CLAUDE.md`: histórico por fases, decisões e estado atual.
- `PRODUCT.md`: visão do produto e do design.
