from rest_framework.routers import DefaultRouter

from django.urls import include, path

from .views import (
    ExportExpensesCSVView,
    FinancialAlertViewSet,
    FinancialSummaryView,
    GenerateFinancialAlertsView,
    MonthlyIncomeViewSet,
)

router = DefaultRouter()
router.register(r"monthly-income", MonthlyIncomeViewSet, basename="monthlyincome")
router.register(r"financial-alerts", FinancialAlertViewSet, basename="financialalert")

urlpatterns = [
    path("export-csv/", ExportExpensesCSVView.as_view(), name="export-expenses-csv"),
    path("financial-summary/", FinancialSummaryView.as_view(), name="financial-summary"),
    path("generate-alerts/", GenerateFinancialAlertsView.as_view(), name="generate-alerts"),
    path("", include(router.urls)),
]
