# שלב 1: בניית האתר (Vite)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# משתני VITE נאפים בזמן הבנייה - להגדיר ב-Dokploy כ-Build Arg / Environment
ARG VITE_OFFLINE_DOWNLOAD_URL=""
ENV VITE_OFFLINE_DOWNLOAD_URL=$VITE_OFFLINE_DOWNLOAD_URL
# true = האתר עובד מול שרת ה-API (חשבונות ושאלות בבסיס נתונים); ריק/false = מצב דמו מקומי
ARG VITE_USE_API=""
ENV VITE_USE_API=$VITE_USE_API
RUN npx vite build

# שלב 2: הגשה סטטית עם nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
