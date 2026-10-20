# Desafio das Peças na VPS (Dokploy): nginx servindo os arquivos do jogo em /desafio/
# No Dokploy: Build Type = Dockerfile, domínio com path /desafio e "Strip Path" DESLIGADO, porta 80.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/desafio
