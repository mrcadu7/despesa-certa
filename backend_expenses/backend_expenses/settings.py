"""
Configurações do Django - Despesa Certa

NOVA ESTRUTURA MODULAR:
- settings/base.py: Configurações comuns
- settings/local.py: Desenvolvimento local
- settings/production.py: Produção AWS

Importa configurações baseadas na variável de ambiente DJANGO_SETTINGS_MODULE
"""

import os

# Determina qual configuração usar baseado na variável de ambiente
DJANGO_SETTINGS_MODULE = os.environ.get('DJANGO_SETTINGS_MODULE')

if DJANGO_SETTINGS_MODULE == 'backend_expenses.settings.production':
    from .settings.production import *
    print("🚀 Usando configurações de PRODUÇÃO")
elif DJANGO_SETTINGS_MODULE == 'backend_expenses.settings.local':
    from .settings.local import *
    print("🔧 Usando configurações de DESENVOLVIMENTO")
else:
    # Fallback para desenvolvimento local se não especificado
    from .settings.local import *
    print("🔧 Usando configurações de DESENVOLVIMENTO (fallback)")

# Para debug - mostra qual configuração está sendo usada
print(f"DEBUG: {DEBUG}")
print(f"ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"DATABASE HOST: {DATABASES['default']['HOST']}")
print(f"CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
