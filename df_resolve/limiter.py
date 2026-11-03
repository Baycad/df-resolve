from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Contadores em memória: zeram quando o servidor reinicia ou o reloader recarrega.
# Sem limites padrão: só as rotas com @limiter.limit são limitadas.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
    strategy="moving-window",
    headers_enabled=True,
)
