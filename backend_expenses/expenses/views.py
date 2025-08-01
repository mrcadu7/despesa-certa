import os
import time

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import FileResponse, Http404

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
        """GET method for easier testing - same as POST"""
        return self.export_csv(request)

    def post(self, request):
        """POST method for CSV export"""
        return self.export_csv(request)

    def export_csv(self, request):
        """Export expenses to CSV."""
        result = export_expenses_csv.delay(request.user.id)
        for _ in range(30):
            if result.ready():
                break
            time.sleep(0.5)
        if not result.successful():
            return Response(
                {"error": "Falha na exportação"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        export_path = result.get()
        if not os.path.exists(export_path):
            raise Http404("Arquivo não encontrado")

        with open(export_path, "rb") as file:
            response = FileResponse(file, as_attachment=True, filename="expenses_export.csv")
            response["Content-Length"] = os.path.getsize(export_path)

        try:
            os.remove(export_path)
        except Exception:
            pass
        return response
