# 🚀 Deploy Automatizado - AWS EC2

Este documento explica como configurar e usar o sistema de deploy automatizado para a aplicação **Despesa Certa**.

## 📋 Visão Geral

O sistema possui duas opções de deploy:

1. **Manual**: Script `deploy-aws-optimized.sh` para deploy direto no servidor
2. **Automatizado**: GitHub Actions que faz deploy automático quando código é enviado para a branch `develop`

## 🔧 Script de Deploy Manual

### `deploy-aws-optimized.sh`

Script otimizado que:
- ✅ Detecta automaticamente o IP público da instância AWS
- ✅ Atualiza configurações automaticamente
- ✅ Gerencia espaço em disco (importante para free tier)
- ✅ Executa migrações e coleta arquivos estáticos
- ✅ Verifica conectividade e status dos serviços
- ✅ Oferece criar superuser se necessário

### Como usar:

```bash
# Tornar executável (apenas primeira vez)
chmod +x deploy-aws-optimized.sh

# Executar deploy
./deploy-aws-optimized.sh
```

## 🤖 Deploy Automatizado com GitHub Actions

### Configuração Inicial

Para configurar o deploy automatizado, você precisa adicionar os seguintes **secrets** no seu repositório GitHub:

1. Vá para **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes secrets:

#### Secrets Necessários:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `EC2_SSH_KEY` | Chave privada SSH para acessar o EC2 | Conteúdo do arquivo `.pem` |
| `EC2_HOST` | IP público da instância EC2 | `15.228.243.19` |
| `EC2_USER` | Usuário do EC2 (geralmente ubuntu) | `ubuntu` |

### Como obter os valores:

#### 1. EC2_SSH_KEY
```bash
# No seu computador local, copie o conteúdo da chave privada:
cat ~/.ssh/despesa-certa-key.pem
```
Copie TODO o conteúdo (incluindo `-----BEGIN RSA PRIVATE KEY-----` e `-----END RSA PRIVATE KEY-----`)

#### 2. EC2_HOST
```bash
# No AWS Console, vá para EC2 → Instances
# Copie o "Public IPv4 address" da sua instância
```

#### 3. EC2_USER
```bash
# Para Amazon Linux: ec2-user
# Para Ubuntu: ubuntu
```

### Como funciona o workflow:

1. **Trigger**: Quando você faz `git push` para a branch `develop`
2. **Checkout**: GitHub baixa o código
3. **SSH Setup**: Configura conexão SSH com o EC2
4. **Deploy**: Conecta no servidor e executa:
   - `git pull` para atualizar código
   - Executa `deploy-aws-optimized.sh`
5. **Verificação**: Testa se aplicação está funcionando
6. **Notificação**: Informa sucesso ou falha

## 🔄 Fluxo de Trabalho Recomendado

### Para Desenvolvedores:

```bash
# 1. Trabalhar em feature branch
git checkout -b feature/nova-funcionalidade

# 2. Fazer commits
git add .
git commit -m "feat: adiciona nova funcionalidade"

# 3. Fazer merge para develop
git checkout develop
git merge feature/nova-funcionalidade

# 4. Push para develop (trigga deploy automático)
git push origin develop

# 5. Aguardar deploy automático (acompanhar em Actions)
```

### Estrutura de Branches:

```
main/master     ← Produção estável
    ↑
develop         ← Deploy automático (staging/produção)
    ↑
feature/*       ← Desenvolvimento de funcionalidades
hotfix/*        ← Correções urgentes
```

## 📊 Monitoramento

### Acompanhar Deploy:

1. **GitHub Actions**: `https://github.com/seu-usuario/despesa-certa/actions`
2. **Logs do servidor**:
   ```bash
   ssh ubuntu@SEU_IP
   cd despesa-certa
   docker compose -f docker-compose.aws.yml logs -f
   ```

### URLs da Aplicação:

Após deploy bem-sucedido:
- **Frontend**: `http://SEU_IP:3000`
- **Backend API**: `http://SEU_IP:8000/api/`
- **Admin Django**: `http://SEU_IP:8000/admin/`
- **Swagger API**: `http://SEU_IP:8000/swagger/`

## 🛠️ Comandos Úteis

### No servidor EC2:

```bash
# Ver status dos containers
docker compose -f docker-compose.aws.yml ps

# Ver logs
docker compose -f docker-compose.aws.yml logs -f

# Parar tudo
docker compose -f docker-compose.aws.yml down

# Reiniciar um serviço específico
docker compose -f docker-compose.aws.yml restart backend

# Criar superuser
docker compose -f docker-compose.aws.yml exec backend python manage.py createsuperuser

# Executar migrações manualmente
docker compose -f docker-compose.aws.yml exec backend python manage.py migrate

# Shell do Django
docker compose -f docker-compose.aws.yml exec backend python manage.py shell
```

### Limpeza de espaço (free tier):

```bash
# Limpar imagens não utilizadas
docker image prune -f

# Limpar tudo não utilizado (cuidado!)
docker system prune -f

# Ver uso de espaço
df -h
docker system df
```

## 🔍 Troubleshooting

### Deploy falha com "No space left on device":
```bash
# Conectar no servidor
ssh ubuntu@SEU_IP

# Limpar espaço
docker system prune -f
docker volume prune -f

# Tentar deploy novamente
./deploy-aws-optimized.sh
```

### Aplicação não responde:
```bash
# Verificar logs
docker compose -f docker-compose.aws.yml logs backend
docker compose -f docker-compose.aws.yml logs frontend

# Verificar se containers estão rodando
docker compose -f docker-compose.aws.yml ps

# Reiniciar se necessário
docker compose -f docker-compose.aws.yml restart
```

### GitHub Actions falha na conexão SSH:
1. Verificar se os secrets estão corretos
2. Verificar se o Security Group permite SSH (porta 22)
3. Verificar se a instância EC2 está rodando

## 🎯 Próximos Passos

1. **Notificações**: Adicionar integração com Slack/Discord para notificar deploys
2. **Testes**: Adicionar testes automatizados antes do deploy
3. **Rollback**: Sistema de rollback automático em caso de falha
4. **Monitoramento**: Integrar com serviços de monitoramento (New Relic, DataDog)
5. **SSL**: Configurar HTTPS com Let's Encrypt
6. **Domínio**: Configurar domínio personalizado

---

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs do GitHub Actions
2. Verificar logs dos containers no servidor
3. Consultar este documento
4. Abrir issue no repositório

**Happy coding! 🚀**
