"""Migração 0001: adiciona categoria, latitude e longitude à tabela denuncia.

Uso, com o Flask DESLIGADO, a partir da raiz do projeto:
    .\\venv\\Scripts\\python.exe -I df_resolve\\migracoes\\0001_campos_denuncia.py <caminho do banco>

- As três colunas aceitam NULL e não têm valor padrão: as denúncias existentes ficam com NULL.
- Grava PRAGMA user_version = 1 na mesma transação.
- Idempotente: se já aplicada (user_version 1 e as três colunas), não faz nada.
- Qualquer outro estado (colunas parciais, versão inesperada) para sem alterar nada.
- Antes de gravar, confere que as colunas antigas de todas as linhas ficaram iguais (hash) e que
  as colunas novas estão vazias. Se algo não bater, desfaz tudo.
"""
import hashlib
import sqlite3
import sys
from pathlib import Path

VERSAO_ANTES = 0
VERSAO_DEPOIS = 1
COLUNAS_NOVAS = (
    ('categoria', 'VARCHAR(30)'),
    ('latitude', 'FLOAT'),
    ('longitude', 'FLOAT'),
)
COLUNAS_ANTIGAS = ('id', 'titulo', 'descricao', 'endereco', 'status', 'user_id')


def parar(mensagem, codigo=1):
    print(mensagem)
    sys.exit(codigo)


def colunas(con):
    return {c[1]: c[2].upper() for c in con.execute('PRAGMA table_info(denuncia)')}


def impressao_digital(con):
    """Número de linhas e SHA-256 das colunas antigas de todas as linhas, em ordem de id."""
    h = hashlib.sha256()
    total = 0
    for linha in con.execute(f'SELECT {", ".join(COLUNAS_ANTIGAS)} FROM denuncia ORDER BY id'):
        h.update(repr(linha).encode('utf-8'))
        total += 1
    return total, h.hexdigest()


def main():
    if len(sys.argv) != 2:
        parar('Uso: 0001_campos_denuncia.py <caminho do banco>')
    banco = Path(sys.argv[1])
    if not banco.is_file():
        parar(f'PARADO: {banco} não existe. Nada alterado.')

    # isolation_level=None: a transação é controlada só pelos BEGIN, COMMIT e ROLLBACK abaixo.
    con = sqlite3.connect(banco, isolation_level=None, timeout=5)
    try:
        # BEGIN IMMEDIATE reserva a escrita: falha se outro processo estiver gravando.
        con.execute('BEGIN IMMEDIATE')
        versao = con.execute('PRAGMA user_version').fetchone()[0]
        atuais = colunas(con)
        if not atuais:
            con.execute('ROLLBACK')
            parar('PARADO: tabela denuncia não encontrada. Nada alterado.')
        presentes = [nome for nome, _ in COLUNAS_NOVAS if nome in atuais]

        if versao == VERSAO_DEPOIS and len(presentes) == len(COLUNAS_NOVAS):
            con.execute('ROLLBACK')
            parar('Migração 0001 já aplicada (user_version 1). Nada alterado.', 0)
        if versao != VERSAO_ANTES or presentes:
            con.execute('ROLLBACK')
            parar(f'PARADO: estado inesperado (user_version {versao}, colunas novas já presentes: '
                  f'{presentes or "nenhuma"}). Nada alterado.')

        antes = impressao_digital(con)
        for nome, tipo in COLUNAS_NOVAS:
            con.execute(f'ALTER TABLE denuncia ADD COLUMN {nome} {tipo}')
        con.execute(f'PRAGMA user_version = {VERSAO_DEPOIS}')

        novas = colunas(con)
        for nome, tipo in COLUNAS_NOVAS:
            if novas.get(nome) != tipo:
                con.execute('ROLLBACK')
                parar(f'PARADO: a coluna {nome} não ficou como {tipo}. Desfeito.')
        preenchidas = con.execute(
            'SELECT count(*) FROM denuncia '
            'WHERE categoria IS NOT NULL OR latitude IS NOT NULL OR longitude IS NOT NULL'
        ).fetchone()[0]
        depois = impressao_digital(con)
        if depois != antes or preenchidas != 0:
            con.execute('ROLLBACK')
            parar('PARADO: as linhas existentes mudaram. Desfeito.')
        con.execute('COMMIT')
    except BaseException:
        if con.in_transaction:
            con.execute('ROLLBACK')
        raise

    integridade = con.execute('PRAGMA integrity_check').fetchall()
    versao_final = con.execute('PRAGMA user_version').fetchone()[0]
    con.close()
    print('Migração 0001 aplicada.')
    print('Linhas:', antes[0], '| colunas antigas iguais:', antes == depois)
    print('Colunas novas:', ', '.join(f'{n} {t}' for n, t in COLUNAS_NOVAS))
    print('user_version:', versao_final, '| integrity_check:', integridade)


if __name__ == '__main__':
    main()
