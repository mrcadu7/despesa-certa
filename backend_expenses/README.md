# Backend - Despesa Certa

## Instalação

1. **Clone o repositório:**
   ```sh
   git clone https://github.com/mrcadu7/despesa-certa.git
   cd despesa-certa/backend_expenses
   ```
2. **Crie e ative o ambiente virtual:**
   ```sh
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate # Linux/Mac
   ```
3. **Instale as dependências:**
   ```sh
   pip install -r requirements.txt
   ```
4. **Configure o banco de dados:**
   - Edite o arquivo `backend_expenses/settings.py` com suas credenciais.
   - Execute as migrações:
     ```sh
     python manage.py migrate
     ```
5. **Crie um superusuário (opcional):**
   ```sh
   python manage.py createsuperuser
   ```
6. **Execute o servidor:**
   ```sh
   python manage.py runserver
   ```

## Testes

Execute todos os testes com:
```sh
python -m pytest tests/ -v
```

## Documentação da API

Acesse a documentação interativa:
- **Swagger:** [`/swagger/`](http://localhost:8000/swagger/)
- **Redoc:** [`/redoc/`](http://localhost:8000/redoc/)

Esses links estarão disponíveis após iniciar o servidor local.

## Estrutura dos Endpoints

A API oferece recursos para:
- Gerenciar despesas
- Consultar e cadastrar rendas mensais
- Gerar e visualizar alertas financeiros
- Exportar dados

Consulte exemplos e descrições completas diretamente no Swagger/Redoc.

---

Dúvidas ou sugestões? Abra uma issue no repositório!

## Segurança e HTTPS

Em produção:
1. Todo tráfego deve passar por HTTPS (reverse proxy como Nginx / Traefik terminando TLS).
2. Variáveis de ambiente `DEBUG=0` ativam hardening (HSTS, cookies secure, etc.).
3. Cabeçalhos de segurança adicionais estão configurados no `nginx.conf` do frontend (HSTS, CSP, etc.). Garanta que só sejam enviados quando sob HTTPS real.
4. Senhas são enviadas em texto claro dentro do túnel TLS e armazenadas com Argon2 (ver `PASSWORD_HASHERS`).
5. Para evitar brute force há throttle específico no endpoint `/api/token/` (escopo `login`). Ajuste a taxa em `DEFAULT_THROTTLE_RATES` conforme necessidade.
6. Próximos upgrades recomendados: 2FA (TOTP) e/ou WebAuthn (passkeys) para reduzir dependência de senhas.

Exemplo de bloco Nginx reverse proxy (fora do container) forçando HTTPS:
```
server {
   listen 80;
   server_name exemplo.com;
   return 301 https://$host$request_uri;
}

server {
   listen 443 ssl http2;
   server_name exemplo.com;

   ssl_certificate /etc/letsencrypt/live/exemplo.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/exemplo.com/privkey.pem;
   include /etc/letsencrypt/options-ssl-nginx.conf;
   ssl_stapling on;

   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

   location /api/ {
      proxy_pass http://backend:8000/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto https;
      proxy_set_header X-Forwarded-For $remote_addr;
   }

   location / {
      proxy_pass http://frontend:80/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto https;
      proxy_set_header X-Forwarded-For $remote_addr;
   }
}
```

