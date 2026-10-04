FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm --prefix frontend ci
COPY frontend ./frontend
RUN npm --prefix frontend run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev
COPY backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
ENV PORT=5000
ENV DEFAULT_STORAGE_ROOT=/srv
EXPOSE 5000
VOLUME ["/srv"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "backend/index.js"]