#!/bin/bash

# Script para deploy na AWS EC2
# Execute este script na sua instância EC2

echo "🚀 Iniciando deploy na AWS EC2..."

# 1. Parar containers existentes se houver
echo "📦 Parando containers existentes..."
docker-compose -f docker-compose.aws.yml down 2>/dev/null || true

# 2. Obter IP público da instância
echo "🌐 Obtendo IP público da instância..."
PUBLIC_IP=$(curl -s http://{PUBLIC_IP}/latest/meta-data/public-ipv4)
echo "IP público: $PUBLIC_IP"

# 3. Criar arquivo .env.aws com o IP correto
echo "⚙️ Configurando variáveis de ambiente..."
cat > .env.aws << EOF
DEBUG=False
SECRET_KEY=django-insecure-MUDE-ESTA-CHAVE-EM-PRODUCAO-$(date +%s)
DJANGO_ALLOWED_HOSTS=*
RUNNING_IN_DOCKER=True
POSTGRES_DB=despesa_certa
POSTGRES_USER=user
POSTGRES_PASSWORD=password
DB_HOST=db
DB_PORT=5432
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
AWS_PUBLIC_IP=$PUBLIC_IP
DOMAIN=$PUBLIC_IP
POSTGRES_DB=despesa_certa
POSTGRES_USER=user
POSTGRES_PASSWORD=password
EOF

# 4. Build e start dos containers
echo "🔨 Buildando e iniciando containers..."
docker-compose -f docker-compose.aws.yml build --no-cache
docker-compose -f docker-compose.aws.yml up -d

# 5. Aguardar inicialização do banco
echo "⏳ Aguardando inicialização do banco de dados..."
sleep 30

# 6. Executar migrações
echo "📚 Executando migrações do Django..."
docker-compose -f docker-compose.aws.yml exec -T backend python manage.py migrate

# 7. Criar superuser (opcional)
echo "👤 Para criar um superuser, execute manualmente:"
echo "docker-compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser"

# 8. Status dos containers
echo "📊 Status dos containers:"
docker-compose -f docker-compose.aws.yml ps

echo "✅ Deploy concluído!"
echo "🌐 Frontend: http://$PUBLIC_IP:3000"
echo "🔧 Backend API: http://$PUBLIC_IP:8000"
echo "📖 Admin Django: http://$PUBLIC_IP:8000/admin"
