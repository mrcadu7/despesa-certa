import json


class PasswordDecryptionMiddleware:
    """Middleware legada.

    A antiga lógica de descriptografia foi removida: agora esperamos senha em texto
    plano (protegida por HTTPS). Mantemos apenas a remoção do campo "encrypted"
    para compatibilidade temporária. Em breve este middleware pode ser removido.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.content_type == "application/json" and request.body:
            try:
                data = json.loads(request.body)
                if data.get("encrypted"):
                    # Remove flag obsoleta
                    data.pop("encrypted", None)
                    request._body = json.dumps(data).encode("utf-8")
            except Exception:
                pass
        return self.get_response(request)
