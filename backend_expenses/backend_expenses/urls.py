from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework import routers
from expenses.views import ExpenseViewSet

router = routers.DefaultRouter()
router.register(r'expenses', ExpenseViewSet, basename='expense')

schema_view = get_schema_view(
    openapi.Info(
        title="Despesa Certa API",
        default_version='v1',
        description="Documentação automática da API de despesas",
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    patterns=[path('api/', include(router.urls))],
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
