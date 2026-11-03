import re

from flask import Blueprint, current_app, request, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from werkzeug.security import generate_password_hash, check_password_hash

from df_resolve.models.models import db, User
from df_resolve.limiter import limiter

bp = Blueprint('auth', __name__, url_prefix='/auth')

USERNAME_MIN = 3
USERNAME_MAX = 80
USERNAME_PADRAO = re.compile(r"[A-Za-z0-9._-]+")
SENHA_MIN = 8
SENHA_MAX = 128
# Limite generoso usado apenas no login, para não bloquear contas antigas.
LOGIN_LIMITE = 1024
METODO_HASH = 'scrypt'
# Limites por IP. Só as falhas de login contam no primeiro; o total protege contra rajadas.
LIMITE_LOGIN_FALHAS = '5 per minute;20 per hour'
LIMITE_LOGIN_TOTAL = '30 per minute'
LIMITE_CADASTRO = '3 per minute;10 per hour'


def _ler_json():
    """Retorna o corpo da requisição como dicionário, ou None se não for JSON válido."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else None


def _erro(mensagem, status=400):
    return jsonify({'message': mensagem}), status


def _atualizar_hash_antigo(user, password):
    """Converte um hash antigo para o método atual, após um login correto."""
    if user.password.startswith(f'{METODO_HASH}:'):
        return

    user_id = user.id
    user.password = generate_password_hash(password, method=METODO_HASH)
    try:
        db.session.commit()
    except SQLAlchemyError:
        # Não impede o login; a conversão é refeita no próximo acesso.
        # Sem traceback: a mensagem do SQLAlchemy incluiria o hash da senha.
        db.session.rollback()
        current_app.logger.warning('Não foi possível atualizar o hash do usuário %s.', user_id)


def _login_falhou(response):
    return response.status_code == 401


@bp.route('/register', methods=['POST'])
@limiter.limit(LIMITE_CADASTRO, methods=['POST'])
def register():
    dados = _ler_json()
    if dados is None:
        return _erro('Envie os dados em formato JSON.')

    username = dados.get('username')
    password = dados.get('password')

    if not isinstance(username, str) or not isinstance(password, str):
        return _erro('Usuário e senha são obrigatórios.')

    username = username.strip()

    if not USERNAME_MIN <= len(username) <= USERNAME_MAX:
        return _erro(f'O usuário deve ter entre {USERNAME_MIN} e {USERNAME_MAX} caracteres.')
    if not USERNAME_PADRAO.fullmatch(username):
        return _erro('O usuário pode conter apenas letras, números, ponto, hífen e sublinhado.')
    if not SENHA_MIN <= len(password) <= SENHA_MAX:
        return _erro(f'A senha deve ter entre {SENHA_MIN} e {SENHA_MAX} caracteres.')

    if User.query.filter_by(username=username).first():
        return _erro('Usuário já existe')

    hashed_password = generate_password_hash(password, method=METODO_HASH)
    new_user = User(username=username, password=hashed_password)

    db.session.add(new_user)
    try:
        db.session.commit()
    except IntegrityError:
        # Dois cadastros simultâneos com o mesmo nome.
        db.session.rollback()
        return _erro('Usuário já existe')

    return jsonify({'message': 'Usuário registrado com sucesso'}), 201


@bp.route('/login', methods=['POST'])
@limiter.limit(LIMITE_LOGIN_TOTAL, methods=['POST'])
@limiter.limit(LIMITE_LOGIN_FALHAS, methods=['POST'], deduct_when=_login_falhou)
def login():
    dados = _ler_json()
    if dados is None:
        return _erro('Envie os dados em formato JSON.')

    username = dados.get('username')
    password = dados.get('password')

    if (
        not isinstance(username, str)
        or not isinstance(password, str)
        or not username.strip()
        or not password
    ):
        return _erro('Usuário e senha são obrigatórios.')

    if len(username) > LOGIN_LIMITE or len(password) > LOGIN_LIMITE:
        return _erro('Credenciais inválidas', 401)

    user = User.query.filter_by(username=username.strip()).first()

    if not user or not check_password_hash(user.password, password):
        return _erro('Credenciais inválidas', 401)

    _atualizar_hash_antigo(user, password)
    login_user(user)
    return jsonify({'message': 'Login bem-sucedido'}), 200


@bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout bem-sucedido'}), 200


@bp.route('/check', methods=['GET'])
def check_login():
    if current_user.is_authenticated:
        return jsonify({'logged_in': True, 'username': current_user.username})
    return jsonify({'logged_in': False})