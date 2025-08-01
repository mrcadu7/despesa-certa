import csv
import logging
import os

from celery import shared_task

from django.contrib.auth import get_user_model

from .models import Expense

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def export_expenses_csv(user_id):
    export_dir = "exports"
    os.makedirs(export_dir, exist_ok=True)
    export_path = os.path.join(export_dir, f"expenses_export_{user_id}.csv")

    try:
        user = User.objects.get(id=user_id)
        expenses = Expense.objects.filter(user=user).order_by("-date")

        with open(export_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["ID", "Valor", "Categoria", "Data", "Descrição", "Criado em"])

            for expense in expenses:
                writer.writerow(
                    [
                        expense.id,
                        str(expense.value),
                        expense.category,
                        expense.date.strftime("%Y-%m-%d"),
                        expense.description or "",
                        expense.created.strftime("%Y-%m-%d %H:%M:%S"),
                    ]
                )

        logger.info(
            f"Exportação de {expenses.count()} despesas concluída para usuário {user.username}"
        )
        return export_path

    except User.DoesNotExist:
        logger.error(f"Usuário {user_id} não encontrado")
        raise
    except Exception as e:
        logger.error(f"Erro ao exportar despesas para usuário {user_id}: {e}")
        if os.path.exists(export_path):
            os.remove(export_path)
        raise
