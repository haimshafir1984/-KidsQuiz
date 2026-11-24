# שרת ה-API. בונים עם ההקשר (context) של שורש המאגר, כי סקריפט ייבוא השאלות קורא את src/data:
#   docker build -f server/Dockerfile .
# ב-Dokploy: Dockerfile Path = server/Dockerfile, Build Context = .
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# קובצי src/data הם ESM, ולכן צריך package.json של שורש עם type=module
RUN echo '{"type":"module","private":true}' > /app/package.json
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY server ./server
COPY src/data ./src/data
COPY src/utils ./src/utils
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
USER node
CMD ["node", "src/index.js"]
