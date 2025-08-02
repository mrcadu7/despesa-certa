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
