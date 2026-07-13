# Étape 1 : Construction de l'application
FROM node:lts-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Étape 2 : Serveur de production avec Nginx
FROM nginx:stable-alpine AS production-stage
# Copie des fichiers générés dans le dossier par défaut de Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]