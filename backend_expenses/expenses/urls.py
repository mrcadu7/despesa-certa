from django.urls import path

from .views import ExportExpensesCSVView

urlpatterns = [
    path("export-csv/", ExportExpensesCSVView.as_view(), name="export-expenses-csv"),
]
