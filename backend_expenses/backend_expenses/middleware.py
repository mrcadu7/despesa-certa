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
        logger.info(
            f"[AUDIT] user={getattr(user, 'username', None)} method={request.method}"
            f" path={request.get_full_path()} status={response.status_code}"
            f" duration={duration:.3f}s"
        )
        return response
