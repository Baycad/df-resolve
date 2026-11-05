import os
import secrets

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager
from werkzeug.exceptions import HTTPException

from df_resolve.models.models import db, User
from df_resolve.routes import denuncia_routes, auth_routes
from df_resolve.limiter import limiter
from df_resolve import auth_tokens

app = Flask(__name__, static_folder="../frontend", static_url_path="/")


# ------------------------------------------------------------------
# Chave secreta (assina o cookie de sessão)
# ------------------------------------------------------------------
# Nunca coloque a chave no código. Defina a variável de ambiente
# DF_RESOLVE_SECRET_KEY antes de iniciar o servidor.
# Sem ela, uma chave temporária é gerada a cada início. Isso serve
# apenas para desenvolvimento: as sessões são perdidas ao reiniciar.
secret_key = os.environ.get("DF_RESOLVE_SECRET_KEY")
if not secret_key:
    secret_key = secrets.token_hex(32)
    print(
        "AVISO: DF_RESOLVE_SECRET_KEY não definida. Usando chave temporária; "
        "as sessões serão perdidas a cada reinício do servidor."
    )
app.config["SECRET_KEY"] = secret_key


# ------------------------------------------------------------------
# Banco de dados (configuração mantida sem alterações)
# ------------------------------------------------------------------
basedir = os.path.abspath(os.path.dirname(__file__))
instance_path = os.path.join(basedir, "instance")
os.makedirs(instance_path, exist_ok=True)

db_path = os.path.join(instance_path, "denuncias.db")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)


# ------------------------------------------------------------------
# CORS (mantido sem alterações; vale apenas para navegadores)
# ------------------------------------------------------------------
CORS(app, supports_credentials=True, resources={
    r"/*": {"origins": "http://127.0.0.1:5500"}
})


# ------------------------------------------------------------------
# Autenticação
# ------------------------------------------------------------------
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(User, int(user_id))
    except (TypeError, ValueError):
        return None


@login_manager.request_loader
def load_user_from_request(req):
    # App mobile: "Authorization: Bearer <token>". Só é chamado quando não há sessão por cookie.
    return auth_tokens.usuario_do_token(req)


@login_manager.unauthorized_handler
def nao_autorizado():
    # Para uma API, a resposta correta é 401 em JSON, e não um redirecionamento.
    return jsonify({"message": "Autenticação necessária."}), 401


# ------------------------------------------------------------------
# Limite de tentativas (os limites ficam em auth_routes.py)
# ------------------------------------------------------------------
limiter.init_app(app)


app.register_blueprint(denuncia_routes.bp)
app.register_blueprint(auth_routes.bp)


# ------------------------------------------------------------------
# Tratamento de erros
# ------------------------------------------------------------------
PREFIXOS_API = ("/auth/", "/denuncias")

MENSAGENS_HTTP = {
    400: "Requisição inválida.",
    401: "Autenticação necessária.",
    403: "Acesso negado.",
    404: "Recurso não encontrado.",
    405: "Método não permitido.",
    415: "Tipo de conteúdo não suportado. Envie os dados em JSON.",
    429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
}


def _rota_da_api():
    return request.path.startswith(PREFIXOS_API)


@app.errorhandler(HTTPException)
def tratar_erro_http(erro):
    # As páginas do frontend continuam com o erro HTML padrão do Flask.
    if not _rota_da_api():
        return erro
    mensagem = MENSAGENS_HTTP.get(erro.code, erro.description)
    return jsonify({"message": mensagem}), erro.code


@app.errorhandler(Exception)
def tratar_erro_inesperado(erro):
    if isinstance(erro, HTTPException):
        return tratar_erro_http(erro)
    db.session.rollback()
    # O traceback completo continua aparecendo no terminal do servidor.
    app.logger.exception("Erro inesperado em %s %s", request.method, request.path)
    return jsonify({"message": "Erro interno do servidor."}), 500


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


# ------------------------------------------------------------------
# Execução
# ------------------------------------------------------------------
def _env_bool(nome, padrao):
    valor = os.environ.get(nome)
    if valor is None:
        return padrao
    return valor.strip().lower() in ("1", "true", "sim", "yes", "on")


if __name__ == "__main__":
    host = os.environ.get("DF_RESOLVE_HOST", "127.0.0.1")
    port = int(os.environ.get("DF_RESOLVE_PORT", "5000"))
    debug = _env_bool("DF_RESOLVE_DEBUG", True)

    # O depurador do Flask permite executar código no servidor.
    # Ele só pode ficar ligado quando o servidor escuta apenas neste computador.
    if debug and host not in ("127.0.0.1", "localhost"):
        print(f"AVISO: modo debug desligado porque o servidor está acessível pela rede ({host}).")
        debug = False

    with app.app_context():
        db.create_all()

        print("\nRotas disponíveis:")
        for rule in app.url_map.iter_rules():
            print(f"{rule} -> {rule.endpoint}")

    app.run(host=host, port=port, debug=debug)