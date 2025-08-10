"""
Configurações do Django - Despesa Certa

Importa configurações baseadas na variável de ambiente DJANGO_SETTINGS_MODULE
Padrão: configurações locais para desenvolvimento
"""

import os

# Determina qual configuração usar baseado na variável de ambiente
ENVIRONMENT = os.environ.get("DJANGO_SETTINGS_MODULE", "backend_expenses.settings.local")

if "production" in ENVIRONMENT:
    from .production import *
elif "local" in ENVIRONMENT:
    from .local import *
else:
    # Fallback para desenvolvimento local
    from .local import *
