from flask import Blueprint, abort, request, jsonify
from flask_login import login_required, current_user

from df_resolve.models.models import db, Denuncia

bp = Blueprint('denuncia', __name__, url_prefix='/denuncias')

# Campo: (nome exibido na mensagem, tamanho máximo)
CAMPOS_DENUNCIA = {
    'titulo': ('título', 100),
    'descricao': ('descrição', 2000),
    'endereco': ('endereço', 200),
}
# Só denúncias com este status podem ser editadas ou excluídas pelo dono.
STATUS_EDITAVEL = 'Pendente'


def _ler_json():
    """Retorna o corpo da requisição como dicionário, ou None se não for JSON válido."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else None


def _erro(mensagem, status=400):
    return jsonify({'message': mensagem}), status


def _validar_campos(dados, parcial):
    """Retorna (valores, None) ou (None, mensagem de erro).

    No cadastro (parcial=False) os três campos são obrigatórios e outros campos são ignorados,
    como antes. Na edição (parcial=True) só os campos enviados são validados, e campos fora
    dos três são recusados.
    """
    if parcial and set(dados) - set(CAMPOS_DENUNCIA):
        return None, 'Só é possível editar título, descrição e endereço.'

    valores = {}
    for campo, (nome, limite) in CAMPOS_DENUNCIA.items():
        if parcial and campo not in dados:
            continue
        valor = dados.get(campo)
        if not isinstance(valor, str) or not valor.strip():
            return None, (f'O campo {nome} não pode ficar vazio.' if parcial
                          else f'O campo {nome} é obrigatório.')
        valor = valor.strip()
        if len(valor) > limite:
            return None, f'O campo {nome} deve ter no máximo {limite} caracteres.'
        valores[campo] = valor

    if parcial and not valores:
        return None, 'Envie ao menos um campo: titulo, descricao ou endereco.'
    return valores, None


def _como_json(d):
    return {
        'id': d.id,
        'titulo': d.titulo,
        'descricao': d.descricao,
        'endereco': d.endereco,
        'status': d.status,
    }


def _denuncia_do_usuario(denuncia_id):
    """A denúncia do usuário logado, ou 404 (inexistente e de outro dono respondem igual)."""
    denuncia = Denuncia.query.filter_by(id=denuncia_id, user_id=current_user.id).first()
    if denuncia is None:
        abort(404)
    return denuncia


def _nao_editavel():
    return _erro(f'Só é possível alterar denúncias com status {STATUS_EDITAVEL}.', 409)


@bp.route('/', methods=['POST'])
@login_required
def criar_denuncia():
    dados = _ler_json()
    if dados is None:
        return _erro('Envie os dados em formato JSON.')

    valores, problema = _validar_campos(dados, parcial=False)
    if problema:
        return _erro(problema)

    nova_denuncia = Denuncia(
        titulo=valores['titulo'],
        descricao=valores['descricao'],
        endereco=valores['endereco'],
        # O dono vem sempre da sessão, nunca do corpo da requisição.
        user_id=current_user.id
    )

    db.session.add(nova_denuncia)
    db.session.commit()

    return jsonify({'message': 'Denúncia criada com sucesso'}), 201


@bp.route('/', methods=['GET'])
@login_required
def listar_denuncias():
    denuncias = Denuncia.query.filter_by(user_id=current_user.id).all()
    return jsonify([_como_json(d) for d in denuncias]), 200


@bp.route('/<int:denuncia_id>', methods=['GET'])
@login_required
def detalhar_denuncia(denuncia_id):
    return jsonify(_como_json(_denuncia_do_usuario(denuncia_id))), 200


@bp.route('/<int:denuncia_id>', methods=['PATCH'])
@login_required
def editar_denuncia(denuncia_id):
    denuncia = _denuncia_do_usuario(denuncia_id)
    if denuncia.status != STATUS_EDITAVEL:
        return _nao_editavel()

    dados = _ler_json()
    if dados is None:
        return _erro('Envie os dados em formato JSON.')
    valores, problema = _validar_campos(dados, parcial=True)
    if problema:
        return _erro(problema)

    for campo, valor in valores.items():
        setattr(denuncia, campo, valor)
    db.session.commit()
    return jsonify(_como_json(denuncia)), 200


@bp.route('/<int:denuncia_id>', methods=['DELETE'])
@login_required
def excluir_denuncia(denuncia_id):
    denuncia = _denuncia_do_usuario(denuncia_id)
    if denuncia.status != STATUS_EDITAVEL:
        return _nao_editavel()

    db.session.delete(denuncia)
    db.session.commit()
    return jsonify({'message': 'Denúncia excluída com sucesso'}), 200
