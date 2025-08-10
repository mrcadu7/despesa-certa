"""
Configurações para desenvolvimento local - Despesa Certa
"""

from decouple import config

from .base import *

# Debug ativo para desenvolvimento
DEBUG = True

# Hosts permitidos para desenvolvimento
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

# Database para desenvolvimento local
if config("RUNNING_IN_DOCKER", cast=bool, default=False):
    # Quando rodando no Docker localmente
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("POSTGRES_DB"),
            "USER": config("POSTGRES_USER"),
            "PASSWORD": config("POSTGRES_PASSWORD"),
            "HOST": "db",
            "PORT": 5432,
        }
    }
else:
    # Quando rodando diretamente no host
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("POSTGRES_DB"),
            "USER": config("POSTGRES_USER"),
            "PASSWORD": config("POSTGRES_PASSWORD"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default=55432, cast=int),
        }
    }

# CORS settings para desenvolvimento
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

# Configurações de segurança relaxadas para desenvolvimento
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Logging para desenvolvimento
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
