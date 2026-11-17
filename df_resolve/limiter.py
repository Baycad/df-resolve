import ipaddress
import os

from flask import request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Cabeçalho com o IP real do cliente quando o servidor fica atrás de um proxy (no PythonAnywhere,
# X-Real-IP). Vazio (padrão): a chave é o request.remote_addr, como antes.
# Só defina no servidor hospedado: sem um proxy na frente, qualquer cliente pode forjar o cabeçalho.
CABECALHO_IP_REAL = os.environ.get("DF_RESOLVE_REAL_IP_HEADER", "").strip()


def chave_do_cliente():
    """IP usado como chave dos limites: o do cabeçalho configurado, se for um IP válido; senão o remote_addr."""
    if CABECALHO_IP_REAL:
        valor = request.headers.get(CABECALHO_IP_REAL, "").strip()
        if valor:
            try:
                return str(ipaddress.ip_address(valor))
            except ValueError:
                pass  # vazio, lista ("1.2.3.4, 5.6.7.8") ou texto qualquer: ignora o cabeçalho
    return get_remote_address()


# Contadores em memória: zeram quando o servidor reinicia ou o reloader recarrega.
# Sem limites padrão: só as rotas com @limiter.limit são limitadas.
limiter = Limiter(
    key_func=chave_do_cliente,
    default_limits=[],
    storage_uri="memory://",
    strategy="moving-window",
    headers_enabled=True,
)
