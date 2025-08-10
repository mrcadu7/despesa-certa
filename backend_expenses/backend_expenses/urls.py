from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions, routers, throttling
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache

from expenses.views import ExpenseViewSet


class LoginRateThrottle(throttling.SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        # Identifica pelo IP + username fornecido (se existir) para dificultar brute force distribuído.
        ident = self.get_ident(request)
        username = ""
        try:
            if request.data.get("username"):
                username = request.data.get("username")
        except Exception:
            pass
        return self.cache_format % {
            "scope": self.scope,
            "ident": f"{ident}:{username}"[:200],
        }


@method_decorator(never_cache, name="dispatch")
class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]


router = routers.DefaultRouter()
router.register(r"expenses", ExpenseViewSet, basename="expense")

schema_view = get_schema_view(
    openapi.Info(
        title="Despesa Certa API",
        default_version="v1",
        description="Documentação automática da API de despesas",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("expenses.urls")),
    path("api/", include(router.urls)),
    path("api/token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Em produção, também servir arquivos estáticos (WhiteNoise já cuida dos STATIC)
    # Mas precisamos configurar os MEDIA files
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
