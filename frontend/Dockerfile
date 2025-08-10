# Dockerfile para o Frontend React

# Usar imagem Node.js oficial
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Aumenta limite de heap do Node (instância t2.micro tem pouca RAM)
ENV NODE_OPTIONS=--max_old_space_size=768

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install --no-audit --no-fund

# Copiar código fonte
COPY . .

# Construir aplicação para produção
RUN npm run build

# Usar nginx para servir os arquivos estáticos
FROM nginx:alpine

# Copiar build para nginx
COPY --from=0 /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Expor porta
EXPOSE 80

# Comando para iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
