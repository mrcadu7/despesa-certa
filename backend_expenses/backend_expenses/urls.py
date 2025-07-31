from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from expenses.views import ExpenseViewSet
from rest_framework import permissions, routers
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

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
    patterns=[path("api/", include(router.urls))],
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
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
