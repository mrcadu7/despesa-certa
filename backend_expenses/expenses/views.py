import time

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse

from .filters import ExpenseFilter
from .models import Expense
from .serializers import ExpenseSerializer
from .tasks import export_expenses_csv


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Permite que apenas o dono edite/deletar, staff pode tudo."""

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        if request.method in permissions.SAFE_METHODS:
            return obj.user == request.user
        return obj.user == request.user


class ExpenseViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar despesas."""

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ExpenseFilter
    search_fields = ["description", "category"]
    ordering_fields = ["date", "value", "category"]
    ordering = ["-id"]

    def get_object(self):
        obj = Expense.objects.get(pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        return Expense.objects.for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="report/monthly")
    def report_monthly(self, request):
        qs = self.get_queryset()
        total_geral = qs.aggregate(total=Sum("value"))["total"] or 0
        data = (
            qs.annotate(month=TruncMonth("date"))
            .values("month", "category")
            .annotate(total=Sum("value"))
            .order_by("-month", "category")
        )
        return Response({"total_geral": total_geral, "detalhes": data})


class ExportExpensesCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Export expenses to Excel using Celery."""
        import base64

        try:
            result = export_expenses_csv.delay(request.user.id)

            for _ in range(30):
                if result.ready():
                    break
                time.sleep(0.5)

            if not result.ready():
                return Response(
                    {"error": "Timeout na exportação - tente novamente"},
                    status=status.HTTP_408_REQUEST_TIMEOUT,
                )

            if not result.successful():
                error_msg = (
                    str(result.result) if result.result else "Falha desconhecida na exportação"
                )
                return Response(
                    {"error": f"Falha na exportação: {error_msg}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            task_result = result.get()

            if not task_result or not isinstance(task_result, dict):
                return Response(
                    {"error": "Resultado inválido da task de exportação"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            file_content = base64.b64decode(task_result["content"])
            filename = task_result["filename"]

            response = HttpResponse(
                file_content,
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:
            return Response(
                {"error": f"Erro interno: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
