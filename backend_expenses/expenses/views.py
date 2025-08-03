import time
from datetime import date

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from django.contrib.auth.models import User
from django.db.models import Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone

from .filters import ExpenseFilter, MonthlyIncomeFilter
from .models import Expense, FinancialAlert, MonthlyIncome
from .serializers import (
    ExpenseSerializer,
    FinancialAlertSerializer,
    FinancialSummarySerializer,
    MonthlyIncomeSerializer,
)
from .services import FinancialAnalysisService
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
    """
    ViewSet para gerenciar despesas do usuário autenticado.

    - Permite criar, listar, editar e excluir despesas.
    - Filtros disponíveis: data, categoria, valor, descrição.
    - Pesquisa: por descrição ou categoria.
    - Ordenação: por data, valor ou categoria.
    """

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

    @action(detail=False, methods=["get"])
    def export(self, request):
        """
        Exporta as despesas do usuário para CSV
        """
        import csv

        from django.http import HttpResponse

        queryset = self.get_queryset()

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="despesas.csv"'

        writer = csv.writer(response)
        writer.writerow(["Descrição", "Valor", "Categoria", "Data", "Criado em"])

        for expense in queryset:
            writer.writerow(
                [
                    expense.description,
                    expense.value,
                    expense.category,
                    expense.date.strftime("%d/%m/%Y"),
                    expense.created.strftime("%d/%m/%Y %H:%M"),
                ]
            )

        return response

    @action(detail=False, methods=["patch"], url_path="bulk_update")
    def bulk_update(self, request):
        """
        Atualiza múltiplas despesas em massa.
        """
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids deve ser uma lista de IDs"}, status=status.HTTP_400_BAD_REQUEST
            )

        update_fields = request.data.get("data", {})
        if not update_fields:
            return Response(
                {"error": "Nenhum campo para atualizar"}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(id__in=ids)
        ids_set = set(ids)
        queryset_ids_set = set(queryset.values_list("id", flat=True))
        if ids_set != queryset_ids_set:
            return Response(
                {"error": "Você só pode editar suas próprias despesas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated_objs = []
        errors = {}
        for obj in queryset:
            serializer = self.get_serializer(obj, data=update_fields, partial=True)
            if serializer.is_valid():
                serializer.save()
                updated_objs.append(serializer.data)
            else:
                errors[obj.id] = serializer.errors

        result = {"updated_count": len(updated_objs), "updated": updated_objs, "ids": ids}
        if errors:
            result["errors"] = errors
        return Response(result)

    @action(detail=False, methods=["delete"], url_path="bulk_delete")
    def bulk_delete(self, request):
        """
        Exclui múltiplas despesas em massa.
        """
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids deve ser uma lista de IDs"}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(id__in=ids)
        ids_set = set(ids)
        queryset_ids_set = set(queryset.values_list("id", flat=True))
        if ids_set != queryset_ids_set:
            return Response(
                {"error": "Você só pode excluir suas próprias despesas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        deleted = queryset.count()
        queryset.delete()
        return Response({"deleted_count": deleted, "ids": ids})


class ExportExpensesCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Exporta todas as despesas do usuário autenticado para um arquivo Excel (.xlsx).

        O arquivo é gerado de forma assíncrona via Celery e baixado automaticamente.
        """
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


class MonthlyIncomeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar rendas mensais do usuário.

    - Permite cadastrar, listar, editar e excluir rendas mensais.
    - Cada mês só pode ter uma renda cadastrada por usuário.
    """

    serializer_class = MonthlyIncomeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = MonthlyIncomeFilter
    search_fields = ["description", "income_type"]
    ordering_fields = ["date", "amount", "income_type"]
    ordering = ["-date"]

    def get_queryset(self):
        return MonthlyIncome.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def export(self, request):
        """
        Exporta as rendas do usuário para CSV
        """
        import csv

        from django.http import HttpResponse

        queryset = self.get_queryset()

        # Aplicar filtros se fornecidos
        search = request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(description__icontains=search)

        income_type = request.query_params.get("income_type", None)
        if income_type:
            queryset = queryset.filter(income_type=income_type)

        date_start = request.query_params.get("date_start", None)
        if date_start:
            queryset = queryset.filter(date__gte=date_start)

        date_end = request.query_params.get("date_end", None)
        if date_end:
            queryset = queryset.filter(date__lte=date_end)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="rendas.csv"'

        writer = csv.writer(response)
        writer.writerow(["Descrição", "Valor", "Tipo", "Data", "Recorrente", "Criado em"])

        for income in queryset:
            writer.writerow(
                [
                    income.description,
                    income.value,
                    income.get_income_type_display(),
                    income.date.strftime("%d/%m/%Y"),
                    "Sim" if income.is_recurring else "Não",
                    income.created.strftime("%d/%m/%Y %H:%M"),
                ]
            )

        return response

    @action(detail=False, methods=["patch"], url_path="bulk_update")
    def bulk_update(self, request):
        """
        Atualiza múltiplas rendas em massa.
        """
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids deve ser uma lista de IDs"}, status=status.HTTP_400_BAD_REQUEST
            )

        update_fields = {k: v for k, v in request.data.items() if k != "ids"}
        if not update_fields:
            return Response(
                {"error": "Nenhum campo para atualizar"}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(id__in=ids)
        updated_objs = []
        errors = {}
        for obj in queryset:
            serializer = self.get_serializer(obj, data=update_fields, partial=True)
            if serializer.is_valid():
                serializer.save()
                updated_objs.append(serializer.data)
            else:
                errors[obj.id] = serializer.errors

        result = {"updated_count": len(updated_objs), "updated": updated_objs, "ids": ids}
        if errors:
            result["errors"] = errors
        return Response(result)

    @action(detail=False, methods=["delete"], url_path="bulk_delete")
    def bulk_delete(self, request):
        """
        Exclui múltiplas rendas em massa.
        Espera: { "ids": [1,2,3] }
        """
        ids = request.data.get("ids", [])
        if not ids or not isinstance(ids, list):
            return Response(
                {"error": "ids deve ser uma lista de IDs"}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(id__in=ids)
        deleted = queryset.count()
        queryset.delete()
        return Response({"deleted_count": deleted, "ids": ids})


class FinancialAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para visualizar alertas financeiros gerados pela análise do sistema.

    - Permite listar alertas, marcar como lido individualmente ou todos.
    - Alertas são gerados automaticamente ou manualmente.
    """

    serializer_class = FinancialAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FinancialAlert.objects.filter(user=self.request.user)

    @action(detail=True, methods=["patch"])
    def mark_as_read(self, request, pk=None):
        """Marca um alerta como lido."""
        alert = self.get_object()
        alert.is_read = True
        alert.save()
        return Response({"status": "alert marked as read"})

    @action(detail=False, methods=["patch"])
    def mark_all_as_read(self, request):
        """Marca todos os alertas como lidos."""
        self.get_queryset().update(is_read=True)
        return Response({"status": "all alerts marked as read"})


class FinancialSummaryView(APIView):
    """
    Endpoint para obter o resumo financeiro do mês.

    - Retorna renda, despesas totais, saldo, percentuais por categoria, alertas e saúde financeira.
    - O mês pode ser especificado via parâmetro (?month=YYYY-MM).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Retorna resumo financeiro do mês atual ou especificado."""
        month_str = request.GET.get("month")
        if month_str:
            try:
                year, month = map(int, month_str.split("-"))
                target_month = date(year, month, 1)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Formato de mês inválido. Use YYYY-MM"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_month = timezone.now().date().replace(day=1)

        analysis_service = FinancialAnalysisService(request.user, target_month)
        summary = analysis_service.get_financial_summary()

        analysis_service.save_alerts_to_database(summary["alerts"])

        serializer = FinancialSummarySerializer(summary)
        return Response(serializer.data)


class GenerateFinancialAlertsView(APIView):
    """
    Endpoint para gerar alertas financeiros manualmente para o mês desejado.

    - Útil para forçar a análise e geração de alertas sem depender de eventos automáticos.
    - O mês deve ser informado no corpo da requisição ("month": "YYYY-MM").
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Gera alertas financeiros para o mês especificado."""
        month_str = request.data.get("month")
        if month_str:
            try:
                year, month = map(int, month_str.split("-"))
                target_month = date(year, month, 1)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Formato de mês inválido. Use YYYY-MM"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_month = timezone.now().date().replace(day=1)

        analysis_service = FinancialAnalysisService(request.user, target_month)
        alerts = analysis_service.generate_financial_alerts()
        analysis_service.save_alerts_to_database(alerts)

        return Response(
            {
                "message": f'{len(alerts)} alertas gerados para {target_month.strftime("%m/%Y")}',
                "alerts": alerts,
            }
        )


class RegisterView(APIView):
    """
    View para registro de novos usuários.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        email = request.data.get("email", "")

        if not username or not password:
            return Response(
                {"error": "Username e password são obrigatórios"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username já existe"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, email=email)

        return Response(
            {
                "message": "Usuário criado com sucesso",
                "user": {"id": user.id, "username": user.username, "email": user.email},
            },
            status=status.HTTP_201_CREATED,
        )
