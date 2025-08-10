#!/bin/bash

# Script para ajudar na configuração dos GitHub Secrets
# Este script coleta as informações necessárias para configurar o CI/CD

echo -e "\033[0;34m"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🔧 CONFIGURAÇÃO CI/CD                    ║"
echo "║                  GitHub Actions Setup                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"

echo "Este script irá coletar as informações necessárias para configurar"
echo "os GitHub Secrets para deploy automatizado."
echo ""

# 1. Obter IP público
echo "🌐 Obtendo IP público da instância AWS..."
PUBLIC_IP=$(curl -s --max-time 10 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")

if [ -n "$PUBLIC_IP" ]; then
    echo "✅ IP público detectado: $PUBLIC_IP"
else
    echo "❌ Não foi possível detectar o IP público automaticamente."
    echo "   Vá para AWS Console → EC2 → Instances e copie o Public IPv4 address"
    read -p "   Digite o IP público manualmente: " PUBLIC_IP
fi

echo ""

# 2. Detectar usuário
echo "👤 Detectando usuário do sistema..."
CURRENT_USER=$(whoami)

if [ "$CURRENT_USER" = "ubuntu" ]; then
    echo "✅ Usuário detectado: ubuntu"
    EC2_USER="ubuntu"
elif [ "$CURRENT_USER" = "ec2-user" ]; then
    echo "✅ Usuário detectado: ec2-user"
    EC2_USER="ec2-user"
else
    echo "⚠️  Usuário atual: $CURRENT_USER"
    read -p "   Confirme o usuário para SSH (ubuntu/ec2-user): " EC2_USER
fi

echo ""

# 3. Localizar chave SSH
echo "🔑 Localizando chave SSH privada..."

# Possíveis localizações da chave
POSSIBLE_KEYS=(
    "$HOME/.ssh/despesa-certa-key.pem"
    "$HOME/.ssh/despesa-certa.pem"
    "$HOME/.ssh/id_rsa"
    "/home/$EC2_USER/.ssh/despesa-certa-key.pem"
)

SSH_KEY_PATH=""
for key in "${POSSIBLE_KEYS[@]}"; do
    if [ -f "$key" ]; then
        echo "✅ Chave encontrada: $key"
        SSH_KEY_PATH="$key"
        break
    fi
done

if [ -z "$SSH_KEY_PATH" ]; then
    echo "❌ Chave SSH não encontrada automaticamente."
    read -p "   Digite o caminho completo para sua chave SSH (.pem): " SSH_KEY_PATH
    
    if [ ! -f "$SSH_KEY_PATH" ]; then
        echo "❌ Arquivo não encontrado: $SSH_KEY_PATH"
        exit 1
    fi
fi

echo ""

# 4. Exibir informações coletadas
echo "📋 INFORMAÇÕES COLETADAS:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌐 EC2_HOST (IP público):"
echo "   $PUBLIC_IP"
echo ""
echo "👤 EC2_USER (usuário SSH):"
echo "   $EC2_USER"
echo ""
echo "🔑 EC2_SSH_KEY (conteúdo da chave privada):"
echo "   Arquivo: $SSH_KEY_PATH"
echo ""

# 5. Exibir conteúdo da chave SSH
echo "📝 CONTEÚDO DA CHAVE SSH PRIVADA:"
echo "═══════════════════════════════════════════════════════════════"
echo "Copie EXATAMENTE o conteúdo abaixo (incluindo as linhas BEGIN/END):"
echo ""
echo "------- INÍCIO DO CONTEÚDO DA CHAVE -------"
cat "$SSH_KEY_PATH"
echo ""
echo "------- FIM DO CONTEÚDO DA CHAVE -------"
echo ""

# 6. Instruções para GitHub
echo "🐙 COMO CONFIGURAR NO GITHUB:"
echo "═══════════════════════════════════════════════════════════════"
echo "1. Vá para seu repositório no GitHub"
echo "2. Clique em Settings → Secrets and variables → Actions"
echo "3. Clique em 'New repository secret' e adicione:"
echo ""
echo "   Nome: EC2_HOST"
echo "   Valor: $PUBLIC_IP"
echo ""
echo "   Nome: EC2_USER"
echo "   Valor: $EC2_USER"
echo ""
echo "   Nome: EC2_SSH_KEY"
echo "   Valor: [Cole todo o conteúdo da chave SSH mostrado acima]"
echo ""

# 7. Teste de conectividade
echo "🧪 TESTE DE CONECTIVIDADE:"
echo "═══════════════════════════════════════════════════════════════"
echo "Para testar se a configuração está correta, execute:"
echo ""
echo "ssh -i $SSH_KEY_PATH $EC2_USER@$PUBLIC_IP 'echo \"Conexão SSH funcionando!\"'"
echo ""

# 8. Próximos passos
echo "📋 PRÓXIMOS PASSOS:"
echo "═══════════════════════════════════════════════════════════════"
echo "1. Configure os secrets no GitHub (instruções acima)"
echo "2. Faça um commit e push para a branch 'develop'"
echo "3. Acompanhe o deploy em: https://github.com/seu-usuario/despesa-certa/actions"
echo "4. Após o deploy, acesse: http://$PUBLIC_IP:3000"
echo ""

# 9. Criar arquivo de backup com as informações
BACKUP_FILE="github-secrets-info.txt"
cat > "$BACKUP_FILE" << EOF
# GitHub Secrets para Deploy Automatizado
# Gerado em: $(date)

EC2_HOST=$PUBLIC_IP
EC2_USER=$EC2_USER
SSH_KEY_PATH=$SSH_KEY_PATH

# Para configurar no GitHub:
# Settings → Secrets and variables → Actions → New repository secret

# Teste de conexão SSH:
ssh -i $SSH_KEY_PATH $EC2_USER@$PUBLIC_IP 'echo "Conexão OK"'
EOF

echo "💾 Informações salvas em: $BACKUP_FILE"
echo ""
echo "✅ Configuração concluída! Siga as instruções acima para configurar o GitHub."
