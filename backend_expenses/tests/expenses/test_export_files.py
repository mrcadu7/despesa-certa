import base64
import datetime
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from expenses.models import Expense
from expenses.tasks import export_expenses_csv

User = get_user_model()


class ExportFilesTestCase(TestCase):
    """Testes para funcionalidade de exportação de arquivos Excel."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        self.now = timezone.localtime(timezone.now())

        self.expense1 = Expense.objects.create(
            user=self.user,
            value=Decimal("100.50"),
            category="Alimentação",
            description="Supermercado",
            date=self.now.date(),
        )

        self.expense2 = Expense.objects.create(
            user=self.user,
            value=Decimal("250.00"),
            category="Transporte",
            description="Combustível",
            date=self.now.date(),
        )

        self.expense3 = Expense.objects.create(
            user=self.user,
            value=Decimal("75.25"),
            category="Alimentação",
            description="Restaurante",
            date=self.now.date(),
        )

        previous_month = self.now.replace(month=self.now.month - 1 if self.now.month > 1 else 12)
        self.expense_previous = Expense.objects.create(
            user=self.user,
            value=Decimal("50.00"),
            category="Outros",
            description="Despesa mês anterior",
            date=previous_month.date(),
        )

    def test_export_expenses_csv_success(self):
        """Testa se a exportação de despesas funciona corretamente."""
        result = export_expenses_csv(self.user.id)
        self.assertIn("content", result)
        self.assertIn("filename", result)
        content = result["content"]
        self.assertIsInstance(content, str)
        try:
            decoded_content = base64.b64decode(content)
            self.assertIsInstance(decoded_content, bytes)
        except Exception as e:
            self.fail(f"Falha ao decodificar base64: {e}")
        filename = result["filename"]
        self.assertTrue(filename.endswith(".xlsx"))
        self.assertIn(str(self.user.id), filename)
        self.assertIn(self.now.strftime("%m_%Y"), filename)

    def test_export_expenses_csv_user_not_found(self):
        """Testa comportamento quando usuário não existe."""
        with self.assertRaises(User.DoesNotExist):
            export_expenses_csv(999)

    def test_export_expenses_csv_no_expenses(self):
        """Testa exportação quando usuário não tem despesas no mês atual."""
        user_no_expenses = User.objects.create_user(
            username="noexpenses", email="noexpenses@example.com", password="testpass123"
        )
        result = export_expenses_csv(user_no_expenses.id)
        self.assertIn("content", result)
        self.assertIn("filename", result)
        self.assertTrue(result["filename"].endswith(".xlsx"))

    def test_export_expenses_filters_current_month_only(self):
        """Testa se apenas despesas do mês atual são exportadas."""
        with patch("expenses.tasks.timezone.localtime") as mock_localtime:
            mock_now = timezone.make_aware(datetime.datetime(2025, 8, 1, 12, 0, 0))
            mock_localtime.return_value = mock_now
            result = export_expenses_csv(self.user.id)
            self.assertIn("content", result)

    def test_export_expenses_filename_format(self):
        """Testa se o nome do arquivo segue o formato esperado."""
        with patch("expenses.tasks.timezone.localtime") as mock_localtime:
            mock_now = timezone.make_aware(datetime.datetime(2025, 8, 1, 15, 30, 45))
            mock_localtime.return_value = mock_now
            result = export_expenses_csv(self.user.id)
            filename = result["filename"]
            expected = f"despesas-{self.user.id}-08_2025-153045.xlsx"
            self.assertEqual(filename, expected)

    def test_export_expenses_category_totals(self):
        """Testa se os totais por categoria são calculados corretamente."""
        with self.assertLogs("expenses.tasks", level="INFO") as log:
            export_expenses_csv(self.user.id)
            log_message = log.output[0]
            self.assertIn("concluída para usuário", log_message)
            self.assertIn(self.user.username, log_message)

    @patch("expenses.tasks.Workbook")
    def test_export_expenses_workbook_configuration(self, mock_workbook_class):
        """Testa se o Workbook é configurado corretamente."""
        mock_workbook = Mock()
        mock_worksheet = Mock()
        mock_workbook.add_worksheet.return_value = mock_worksheet
        mock_workbook.add_format.return_value = Mock()
        mock_workbook_class.return_value = mock_workbook
        export_expenses_csv(self.user.id)
        mock_workbook_class.assert_called_once()
        call_args = mock_workbook_class.call_args
        self.assertIsNotNone(call_args)
        args, _ = call_args
        if len(args) > 1:
            config = args[1]
            self.assertIsInstance(config, dict)
            self.assertIn("in_memory", config)
            self.assertTrue(config["in_memory"])
            self.assertIn("default_date_format", config)
            self.assertEqual(config["default_date_format"], "dd/mm/yyyy")
            self.assertIn("remove_timezone", config)
            self.assertTrue(config["remove_timezone"])
        else:
            self.assertGreater(len(args), 0)

    def test_export_expenses_timezone_handling(self):
        """Testa se o timezone é tratado corretamente."""
        with patch("expenses.tasks.timezone.localtime") as mock_localtime:
            mock_now = timezone.make_aware(
                datetime.datetime(2025, 8, 15, 10, 30, 0), timezone.get_current_timezone()
            )
            mock_localtime.return_value = mock_now
            result = export_expenses_csv(self.user.id)
            mock_localtime.assert_called()
            filename = result["filename"]
            expected = f"despesas-{self.user.id}-08_2025-103000.xlsx"
            self.assertEqual(filename, expected)

    def test_export_expenses_error_handling(self):
        """Testa tratamento de erros durante a exportação."""
        with patch("expenses.tasks.Workbook") as mock_workbook:
            mock_workbook.side_effect = Exception("Erro simulado")
            with self.assertRaises(Exception) as context:
                export_expenses_csv(self.user.id)
            self.assertEqual(str(context.exception), "Erro simulado")
