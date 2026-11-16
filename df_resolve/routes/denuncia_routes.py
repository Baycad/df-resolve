import math

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
# Chaves de categoria gravadas no banco (D4). Os rótulos ficam no app (mobile/utils/validacao.js).
CATEGORIAS = ('buraco', 'iluminacao', 'lixo', 'calcada', 'sinalizacao', 'arvore', 'esgoto', 'outros')
MENSAGEM_CATEGORIA = 'Categoria inválida. Use uma destas: ' + ', '.join(CATEGORIAS) + '.'
# Localização (7C): opcional (D7), sempre o par latitude e longitude, em graus, arredondado a 5 casas (D6).
# Campo: maior valor absoluto aceito (D5: qualquer coordenada válida).
LIMITES_LOCALIZACAO = {'latitude': 90, 'longitude': 180}
CASAS_LOCALIZACAO = 5
MENSAGEM_LOCALIZACAO_PAR = 'Envie latitude e longitude juntas.'
MENSAGEM_LOCALIZACAO = 'Localização inválida.'
CAMPOS_EDITAVEIS = tuple(CAMPOS_DENUNCIA) + ('categoria',) + tuple(LIMITES_LOCALIZACAO)


def _ler_json():
    """Retorna o corpo da requisição como dicionário, ou None se não for JSON válido."""
    dados = request.get_json(silent=True)
    return dados if isinstance(dados, dict) else None


def _erro(mensagem, status=400):
    return jsonify({'message': mensagem}), status


def _validar_localizacao(dados):
    """Retorna (valores, None) ou (None, mensagem de erro).

    valores é {} quando nenhum dos dois campos veio; {'latitude': None, 'longitude': None} quando os
    dois vieram null (sem localização no POST, remover no PATCH, C1 e C2); ou os dois números já
    arredondados. Só um dos dois, ou um null com um número, dá MENSAGEM_LOCALIZACAO_PAR.
    """
    presentes = [campo for campo in LIMITES_LOCALIZACAO if campo in dados]
    if not presentes:
        return {}, None
    if len(presentes) != len(LIMITES_LOCALIZACAO):
        return None, MENSAGEM_LOCALIZACAO_PAR
    nulos = [campo for campo in LIMITES_LOCALIZACAO if dados[campo] is None]
    if len(nulos) == len(LIMITES_LOCALIZACAO):
        return {campo: None for campo in LIMITES_LOCALIZACAO}, None
    if nulos:
        return None, MENSAGEM_LOCALIZACAO_PAR

    valores = {}
    for campo, limite in LIMITES_LOCALIZACAO.items():
        valor = dados[campo]
        # bool é subclasse de int no Python: true e false precisam ser recusados à parte.
        if isinstance(valor, bool) or not isinstance(valor, (int, float)):
            return None, MENSAGEM_LOCALIZACAO
        # Um inteiro enorme estouraria na conversão para float; a faixa já o recusa antes.
        if isinstance(valor, int) and abs(valor) > limite:
            return None, MENSAGEM_LOCALIZACAO
        valor = float(valor)
        # O leitor de JSON do Python aceita NaN, Infinity e 1e400 (que vira infinito).
        if not math.isfinite(valor) or abs(valor) > limite:
            return None, MENSAGEM_LOCALIZACAO
        valores[campo] = round(valor, CASAS_LOCALIZACAO)
    return valores, None


def _validar_campos(dados, parcial):
    """Retorna (valores, None) ou (None, mensagem de erro).

    No cadastro (parcial=False) os três campos de texto são obrigatórios, a categoria e a localização
    são opcionais e outros campos são ignorados, como antes. Na edição (parcial=True) só os campos
    enviados são validados, e campos fora de título, descrição, endereço, categoria, latitude e
    longitude são recusados.
    """
    if parcial and set(dados) - set(CAMPOS_EDITAVEIS):
        return None, 'Só é possível editar título, descrição, endereço, categoria e localização.'

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

    # Categoria é opcional (D3). Quando vem no corpo, tem que ser exatamente uma das chaves:
    # null, texto vazio, maiúsculas, espaços e qualquer tipo que não seja texto são inválidos (E-a).
    if 'categoria' in dados:
        valor = dados['categoria']
        if not isinstance(valor, str) or valor not in CATEGORIAS:
            return None, MENSAGEM_CATEGORIA
        valores['categoria'] = valor

    localizacao, problema = _validar_localizacao(dados)
    if problema:
        return None, problema
    valores.update(localizacao)

    if parcial and not valores:
        return None, 'Envie ao menos um campo: titulo, descricao, endereco, categoria ou latitude e longitude.'
    return valores, None


def _como_json(d):
    return {
        'id': d.id,
        'titulo': d.titulo,
        'descricao': d.descricao,
        'endereco': d.endereco,
        'status': d.status,
        # null nas denúncias antigas, e na localização das que não têm.
        'categoria': d.categoria,
        'latitude': d.latitude,
        'longitude': d.longitude,
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
        categoria=valores.get('categoria'),  # sem categoria no corpo: NULL
        latitude=valores.get('latitude'),  # sem localização (ou os dois null): NULL
        longitude=valores.get('longitude'),
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
