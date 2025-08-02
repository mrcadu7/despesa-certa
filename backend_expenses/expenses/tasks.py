import base64
import logging
from collections import defaultdict
from decimal import Decimal
from io import BytesIO

from celery import shared_task
from xlsxwriter import Workbook

from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Expense

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def export_expenses_csv(user_id):

    try:
        user = User.objects.get(id=user_id)

        now = timezone.localtime(timezone.now())

        expenses = Expense.objects.filter(
            user=user, date__year=now.year, date__month=now.month
        ).order_by("-date")

        categoria_totais = defaultdict(Decimal)

        with BytesIO() as fp:
            workbook = Workbook(
                fp,
                {
                    "in_memory": True,
                    "default_date_format": "dd/mm/yyyy",
                    "remove_timezone": True,
                },
            )
            worksheet = workbook.add_worksheet("Despesas")

            header_format = workbook.add_format({"bold": True, "bg_color": "#D9E1F2", "border": 1})
            currency_format = workbook.add_format({"num_format": "R$ #,##0.00"})
            date_format = workbook.add_format({"num_format": "dd/mm/yyyy"})

            meses = {
                1: "JANEIRO",
                2: "FEVEREIRO",
                3: "MARÇO",
                4: "ABRIL",
                5: "MAIO",
                6: "JUNHO",
                7: "JULHO",
                8: "AGOSTO",
                9: "SETEMBRO",
                10: "OUTUBRO",
                11: "NOVEMBRO",
                12: "DEZEMBRO",
            }
            mes_nome = f"{meses[now.month]}/{now.year}"

            title_format = workbook.add_format({"bold": True, "font_size": 14, "align": "left"})

            worksheet.write(0, 0, f"RELATORIO DE DESPESAS - {mes_nome}", title_format)
            worksheet.write(1, 0, f"Usuario: {user.username}")
            worksheet.write(2, 0, f"Gerado em: {now.strftime('%d/%m/%Y %H:%M:%S')}")

            headers = ["ID", "Valor", "Categoria", "Data", "Descricao", "Criado em"]
            for col, header in enumerate(headers):
                worksheet.write(4, col, header, header_format)

            row = 5
            for expense in expenses:
                worksheet.write_number(row, 0, expense.id)
                worksheet.write_number(row, 1, float(expense.value), currency_format)
                worksheet.write_string(row, 2, str(expense.category))

                expense_date = expense.date
                if hasattr(expense_date, "astimezone"):
                    expense_date = timezone.localtime(expense_date)
                worksheet.write_datetime(row, 3, expense_date, date_format)

                worksheet.write_string(row, 4, str(expense.description or ""))

                created_local = timezone.localtime(expense.created)
                worksheet.write_datetime(
                    row,
                    5,
                    created_local,
                    workbook.add_format({"num_format": "dd/mm/yyyy hh:mm:ss"}),
                )

                categoria_totais[expense.category] += expense.value
                row += 1

            row += 2
            worksheet.write_string(row, 0, "TOTAIS POR CATEGORIA", header_format)
            row += 1

            for categoria, total in categoria_totais.items():
                worksheet.write_string(row, 0, str(categoria))
                worksheet.write_number(row, 1, float(total), currency_format)
                row += 1

            total_geral = float(sum(categoria_totais.values()))
            row += 1
            worksheet.write_string(row, 0, "TOTAL GERAL", header_format)
            worksheet.write_number(row, 1, total_geral, currency_format)

            worksheet.set_column("A:A", 8)  # ID
            worksheet.set_column("B:B", 15)  # Valor
            worksheet.set_column("C:C", 20)  # Categoria
            worksheet.set_column("D:D", 12)  # Data
            worksheet.set_column("E:E", 30)  # Descrição
            worksheet.set_column("F:F", 20)  # Criado em

            workbook.close()

            file_content = fp.getvalue()
            file_base64 = base64.b64encode(file_content).decode("utf-8")

            logger.info(
                f"Exportação de {expenses.count()} despesas do mês {now.strftime('%m/%Y')} "
                f"concluída para usuário {user.username}"
            )

            filename = f"despesas-{user_id}-{now.strftime('%m_%Y')}-{now.strftime('%H%M%S')}.xlsx"
            return {
                "content": file_base64,
                "filename": filename,
            }

    except User.DoesNotExist:
        logger.error(f"Usuário {user_id} não encontrado")
        raise
    except Exception as e:
        logger.error(f"Erro ao exportar despesas para usuário {user_id}: {e}")
        raise
