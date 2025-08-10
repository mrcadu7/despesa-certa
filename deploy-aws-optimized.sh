#!/bin/bash

# Script de Deploy Otimizado - AWS EC2
# Automatiza deploy com limpeza de espaço e migrações

set -e  # Para o script se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🚀 DEPLOY AWS EC2                        ║"
echo "║                    Despesa Certa                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 1. Obter IP público automaticamente
log "🌐 Obtendo IP público da instância..."
PUBLIC_IP=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

# Verificar se o IP mudou desde o último deploy
LAST_IP=""
IP_CHANGED=false

# Tentar obter último IP de múltiplas fontes
if [ -f ".last_ip_deploy" ]; then
    LAST_IP=$(cat .last_ip_deploy 2>/dev/null)
elif [ -f ".env.aws" ]; then
    LAST_IP=$(grep "AWS_PUBLIC_IP=" .env.aws 2>/dev/null | cut -d'=' -f2)
fi

if [ "$PUBLIC_IP" = "localhost" ]; then
    warning "Não foi possível obter IP público. Usando localhost."
elif [ "$PUBLIC_IP" != "$LAST_IP" ] && [ -n "$LAST_IP" ]; then
    warning "🔄 IP público mudou de $LAST_IP para $PUBLIC_IP"
    warning "⚠️  Frontend será rebuilded automaticamente com novo IP"
    IP_CHANGED=true
    success "Novo IP público: $PUBLIC_IP"
else
    success "IP público: $PUBLIC_IP"
    if [ -n "$LAST_IP" ]; then
        log "✅ IP não mudou desde último deploy"
    fi
fi

# 2. Atualizar .env.aws com IP atual
log "⚙️  Atualizando arquivo .env.aws..."
if [ -f ".env.aws" ]; then
    # Backup do .env.aws atual
    cp .env.aws .env.aws.backup
    
    # Atualiza IP no arquivo
    sed -i "s/AWS_PUBLIC_IP=.*/AWS_PUBLIC_IP=$PUBLIC_IP/" .env.aws
    sed -i "s/DOMAIN=.*/DOMAIN=$PUBLIC_IP/" .env.aws
    success "Arquivo .env.aws atualizado"
else
    error "Arquivo .env.aws não encontrado!"
fi

# 3. Parar containers existentes
log "🛑 Parando containers existentes..."
docker compose -f docker-compose.aws.yml down || warning "Nenhum container estava rodando"

# 4. Limpeza de espaço (apenas imagens não utilizadas)
log "🧹 Limpando imagens antigas para liberar espaço..."
docker image prune -f
docker builder prune -f
success "Limpeza concluída"

# 5. Verificar espaço disponível
log "💾 Verificando espaço em disco..."
AVAILABLE_SPACE=$(df -h . | awk 'NR==2 {print $4}')
echo "   Espaço disponível: $AVAILABLE_SPACE"

# 6. Build dos containers (otimizado baseado em mudança de IP)
log "🔨 Buildando containers..."

# Decidir estratégia de build baseada na mudança de IP
if [ "$IP_CHANGED" = true ]; then
    warning "🔄 IP mudou - rebuild completo necessário (frontend precisa do novo IP)"
    BUILD_ARGS="--no-cache"
else
    log "✅ IP não mudou - build otimizado (usando cache quando possível)"
    BUILD_ARGS=""
fi

if docker compose -f docker-compose.aws.yml build $BUILD_ARGS; then
    if [ "$IP_CHANGED" = true ]; then
        success "Build completo concluído - frontend atualizado com IP: $PUBLIC_IP"
    else
        success "Build otimizado concluído - usando cache existente"
    fi
else
    error "Falha no build dos containers"
fi

# 7. Subir containers
log "🚀 Iniciando containers..."
if docker compose -f docker-compose.aws.yml up -d; then
    success "Containers iniciados"
else
    error "Falha ao iniciar containers"
fi

# 8. Aguardar inicialização do banco
log "⏳ Aguardando inicialização do banco de dados..."
for i in {1..60}; do
    if docker compose -f docker-compose.aws.yml exec -T db pg_isready -U user -d despesa_certa 2>/dev/null; then
        success "Banco de dados está pronto"
        break
    fi
    echo -n "."
    sleep 1
done

# 9. Executar migrações
log "📚 Executando migrações do Django..."
if docker compose -f docker-compose.aws.yml exec -T backend python manage.py migrate; then
    success "Migrações executadas com sucesso"
else
    error "Falha ao executar migrações"
fi

# 10. Coletar arquivos estáticos
log "📦 Coletando arquivos estáticos..."
docker compose -f docker-compose.aws.yml exec -T backend python manage.py collectstatic --noinput || warning "Falha ao coletar estáticos"

# 11. Status final
log "📊 Verificando status dos containers..."
docker compose -f docker-compose.aws.yml ps

# 12. Teste básico de conectividade
log "🧪 Testando conectividade..."
sleep 5

if curl -s -f http://localhost:8000/api/ > /dev/null; then
    success "Backend está respondendo"
else
    warning "Backend pode não estar respondendo corretamente"
fi

if curl -s -f http://localhost:3000 > /dev/null; then
    success "Frontend está respondendo"
else
    warning "Frontend pode não estar respondendo corretamente"
fi

# 13. Informações finais
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ DEPLOY CONCLUÍDO                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "🌐 ${BLUE}URLs da aplicação:${NC}"
echo -e "   Frontend:    ${GREEN}http://$PUBLIC_IP:3000${NC}"
echo -e "   Backend API: ${GREEN}http://$PUBLIC_IP:8000/api/${NC}"
echo -e "   Admin:       ${GREEN}http://$PUBLIC_IP:8000/admin/${NC}"
echo -e "   Swagger:     ${GREEN}http://$PUBLIC_IP:8000/swagger/${NC}"

# Salvar IP atual para próximo deploy
echo "$PUBLIC_IP" > .last_ip_deploy

echo -e "\n💡 ${BLUE}Sobre mudanças de IP:${NC}"
echo -e "   ${YELLOW}• O IP público muda quando a instância AWS para/inicia${NC}"
echo -e "   ${YELLOW}• Este script detecta automaticamente e rebuilda quando necessário${NC}"
echo -e "   ${YELLOW}• Para IP fixo, configure um Elastic IP no AWS Console${NC}"

echo -e "\n📋 ${BLUE}Comandos úteis:${NC}"
echo -e "   Logs:        ${YELLOW}docker compose -f docker-compose.aws.yml logs -f${NC}"
echo -e "   Status:      ${YELLOW}docker compose -f docker-compose.aws.yml ps${NC}"
echo -e "   Parar tudo:  ${YELLOW}docker compose -f docker-compose.aws.yml down${NC}"

echo -e "\n👤 ${BLUE}Para criar superuser:${NC}"
echo -e "   ${YELLOW}docker compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser${NC}"

# 14. Verificar se precisa criar superuser
if ! docker compose -f docker-compose.aws.yml exec -T backend python manage.py shell -c "from django.contrib.auth.models import User; print('exists' if User.objects.filter(is_superuser=True).exists() else 'none')" 2>/dev/null | grep -q "exists"; then
    echo -e "\n${YELLOW}⚠️  Nenhum superuser encontrado. Deseja criar um agora? (y/n)${NC}"
    read -r CREATE_USER
    if [ "$CREATE_USER" = "y" ] || [ "$CREATE_USER" = "Y" ]; then
        docker compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser
    fi
fi

success "Deploy finalizado! 🎉"
