import json
import logging
import time

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("django.request")


class RequestLoggingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request._start_time = time.monotonic()

    def process_response(self, request, response):
        duration = None
        if hasattr(request, "_start_time"):
            duration = time.monotonic() - request._start_time
        user = getattr(request, "user", None)
        extra = ""
        if (
            request.method in ["POST", "PUT", "PATCH"]
            and request.content_type == "application/json"
        ):
            try:
                body = request.body.decode("utf-8")[:2000]
                data = json.loads(body)
                if "password" in data:
                    data["password"] = "***REDACTED***"
                extra = f" body={json.dumps(data, ensure_ascii=False)[:500]}"
            except Exception:
                pass
        logger.info(
            f"[AUDIT] user={getattr(user, 'username', None)} method={request.method}"
            f" path={request.get_full_path()} status={response.status_code}"
            f" duration={duration:.3f}s{extra}"
        )
        return response
