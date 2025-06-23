from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from df_resolve.models.models import db, Denuncia

bp = Blueprint('denuncia', __name__, url_prefix='/denuncias')

@bp.route('/', methods=['POST'])
@login_required
def criar_denuncia():
    data = request.get_json()
    titulo = data.get('titulo')
    descricao = data.get('descricao')
    endereco = data.get('endereco')

    nova_denuncia = Denuncia(
        titulo=titulo,
        descricao=descricao,
        endereco=endereco,
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
