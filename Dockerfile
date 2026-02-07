# Multi-stage: build frontend then run backend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend ./
RUN npm run build

FROM node:20-alpine AS run
WORKDIR /app

# Backend deps
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install

# Backend source
COPY backend ./backend

# Frontend build output
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
EXPOSE 3001

WORKDIR /app/backend
CMD ["node", "server.js"]
