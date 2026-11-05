import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

from df_resolve.models.models import db, AuthToken, User

# Tokens do app mobile. O token em texto só existe na resposta de /auth/token;
# no banco fica apenas o hash SHA-256. Nunca registrar o token em logs.
VALIDADE_TOKEN = timedelta(days=30)
TOKEN_BYTES = 32
# token_urlsafe(32) gera 43 caracteres do alfabeto base64 para URL.
TOKEN_PADRAO = re.compile(r'[A-Za-z0-9_-]{43}')


def _agora():
    # O SQLite não guarda fuso: todas as datas ficam em UTC, sem fuso.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(token):
    return hashlib.sha256(token.encode('ascii')).hexdigest()


def emitir_token(user):
    """Cria um token para o usuário e retorna (token, expiração)."""
    token = secrets.token_urlsafe(TOKEN_BYTES)
    agora = _agora()
    registro = AuthToken(
        token_hash=_hash(token),
        user_id=user.id,
        created_at=agora,
        expires_at=agora + VALIDADE_TOKEN,
    )
    db.session.add(registro)
    db.session.commit()
    return token, registro.expires_at


def token_do_cabecalho(req):
    """Retorna o token de 'Authorization: Bearer <token>', ou None se faltar ou estiver malformado."""
    partes = req.headers.get('Authorization', '').split(' ')
    if len(partes) != 2 or partes[0].lower() != 'bearer':
        return None
    return partes[1] if TOKEN_PADRAO.fullmatch(partes[1]) else None


def _registro_ativo(token):
    registro = AuthToken.query.filter_by(token_hash=_hash(token)).first()
    if registro is None or registro.revoked_at is not None or registro.expires_at <= _agora():
        return None
    return registro


def usuario_do_token(req):
    """Usado pelo request_loader: retorna o dono de um token ativo, ou None."""
    token = token_do_cabecalho(req)
    registro = _registro_ativo(token) if token else None
    return db.session.get(User, registro.user_id) if registro else None


def revogar_token(req):
    """Revoga o token do cabeçalho. Retorna False se ele não estiver ativo."""
    token = token_do_cabecalho(req)
    registro = _registro_ativo(token) if token else None
    if registro is None:
        return False
    registro.revoked_at = _agora()
    db.session.commit()
    return True
