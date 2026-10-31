from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from df_resolve.models.models import db, Denuncia

bp = Blueprint('denuncia', __name__, url_prefix='/denuncias')

# Campo: (nome exibido na mensagem, tamanho máximo)
CAMPOS_DENUNCIA = {
    'titulo': ('título', 100),
    'descricao': ('descrição', 2000),
    'endereco': ('endereço', 200),
}


def _ler_json():
    """Retorna o corpo da requisição como dicionário, ou None se não for JSON válido."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else None


@bp.route('/', methods=['POST'])
@login_required
def criar_denuncia():
    dados = _ler_json()
    if dados is None:
        return jsonify({'message': 'Envie os dados em formato JSON.'}), 400

    valores = {}
    for campo, (nome, limite) in CAMPOS_DENUNCIA.items():
        valor = dados.get(campo)
        if not isinstance(valor, str) or not valor.strip():
            return jsonify({'message': f'O campo {nome} é obrigatório.'}), 400
        valor = valor.strip()
        if len(valor) > limite:
            return jsonify({'message': f'O campo {nome} deve ter no máximo {limite} caracteres.'}), 400
        valores[campo] = valor

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
    result = [
        {
            'id': d.id,
            'titulo': d.titulo,
            'descricao': d.descricao,
            'endereco': d.endereco,
            'status': d.status
        } for d in denuncias
    ]
    return jsonify(result), 200