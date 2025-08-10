#!/bin/bash

# Script para verificar mudanças de IP sem fazer deploy completo
# Útil para verificar rapidamente se o IP mudou

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando IP público atual...${NC}"

# Obter IP atual
CURRENT_IP=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

# Obter último IP conhecido
LAST_IP=""
if [ -f ".last_ip_deploy" ]; then
    LAST_IP=$(cat .last_ip_deploy 2>/dev/null)
elif [ -f ".env.aws" ]; then
    LAST_IP=$(grep "AWS_PUBLIC_IP=" .env.aws 2>/dev/null | cut -d'=' -f2)
fi

echo ""
echo "📊 Status do IP:"
echo "   IP Atual:     $CURRENT_IP"
echo "   Último Deploy: ${LAST_IP:-'Desconhecido'}"

if [ "$CURRENT_IP" = "localhost" ]; then
    echo -e "${RED}❌ Erro ao obter IP público${NC}"
    exit 1
elif [ "$CURRENT_IP" != "$LAST_IP" ] && [ -n "$LAST_IP" ]; then
    echo -e "${YELLOW}⚠️  IP MUDOU! Deploy necessário para atualizar frontend${NC}"
    echo ""
    echo -e "${BLUE}💡 Recomendações:${NC}"
    echo "   1. Execute: ./deploy-aws-optimized.sh"
    echo "   2. O frontend será rebuilded automaticamente"
    echo ""
    echo -e "${BLUE}URLs atuais (podem não funcionar se IP mudou):${NC}"
    echo "   Frontend: http://$CURRENT_IP:3000"
    echo "   Backend:  http://$CURRENT_IP:8000/api/"
    exit 2
else
    echo -e "${GREEN}✅ IP não mudou desde último deploy${NC}"
    echo ""
    echo -e "${BLUE}URLs da aplicação:${NC}"
    echo "   Frontend: http://$CURRENT_IP:3000"
    echo "   Backend:  http://$CURRENT_IP:8000/api/"
    echo "   Admin:    http://$CURRENT_IP:8000/admin/"
    exit 0
fi
