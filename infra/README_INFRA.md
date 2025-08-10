# Infra / Segurança - Visão Simplificada

Este diretório contém arquivos para colocar o projeto em produção com HTTPS e cabeçalhos de segurança.

## Camadas
1. Navegador do usuário
2. Reverse Proxy (Nginx) com TLS (termina HTTPS) -> `infra/nginx/proxy.conf`
3. Containers internos (rede docker):
   - `frontend`: serve arquivos estáticos (HTTP interno)
   - `backend`: Django + Gunicorn (HTTP interno)
   - `db`: Postgres
   - `redis`: fila/cache

Somente o proxy fica exposto à internet (portas 80/443). O resto fica isolado na rede docker.

## Arquivos Principais
- `docker-compose.prod.yml`: Sobe todos os serviços + proxy.
- `infra/nginx/proxy.conf`: Configuração Nginx com redirecionamento 80→443, certificados e cabeçalhos.
- `infra/certs/`: Pasta onde você coloca `fullchain.pem` e `privkey.pem` (Let’s Encrypt ou outro).

## Fluxo de uma requisição
1. Usuário acessa https://seu-dominio/ -> chega no proxy (porta 443).
2. Proxy descriptografa (TLS) e encaminha requisições:
   - URLs começando com `/api/` -> backend (Django) via HTTP interno.
   - Demais caminhos -> frontend (HTML/CSS/JS) via HTTP interno.
3. Backend responde; proxy reembala dentro da conexão TLS já estabelecida.

## Segurança Implementada
- HTTPS obrigatório: porta 80 faz redirecionamento 301 para 443.
- HSTS: Navegadores passam a recusar voltar para HTTP simples (dificulta downgrade / MITM).
- Cabeçalhos: CSP, X-Frame-Options, Referrer-Policy, etc.
- Throttle de login no backend limita tentativas por IP/usuário.
- Hash de senhas: Argon2 (lento para brute force).
- Nenhuma “criptografia” custom no frontend; TLS protege o transporte real.

## Por que removemos a criptografia JS da senha?
A chave estava no próprio bundle e qualquer atacante poderia replicar. TLS já fornece criptografia forte contra sniffing. Simplicidade + padrões = menos risco.

## Variáveis Importantes
- `DEBUG=0` ativa reforços (HSTS, cookies secure, redirect). 
- `SECRET_KEY` deve ser única e secreta.
- `POSTGRES_*` credenciais do banco.
- `DOMAIN` usado para construir URL da API no frontend.

## Subindo Produção (exemplo)
1. Gere certificados (Let’s Encrypt com certbot no host ou manual).
2. Coloque os arquivos em `infra/certs/fullchain.pem` e `infra/certs/privkey.pem`.
3. Crie arquivo `.env.prod` com variáveis (SECRET_KEY, POSTGRES_* etc.).
4. Execute:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```
5. Acesse https://seu-dominio/.

## Rotação de Certificados
Atualize os arquivos em `infra/certs` e recarregue o Nginx:
```bash
docker compose -f docker-compose.prod.yml exec proxy nginx -s reload
```

## Próximos Passos (Opcional)
- Adicionar 2FA / WebAuthn.
- Monitoramento (Prometheus + grafana / logs centralizados).
- Backups automáticos do Postgres.

Dúvidas? Consulte o README principal ou abra uma issue.
