# Builds the viewer only. Game-derived data (web/public/arcs) is NOT baked in; mount it at /usr/share/nginx/html/arcs.
FROM node:24-alpine AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN rm -rf public/arcs && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
