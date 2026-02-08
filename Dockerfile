# ---- build frontend ----
FROM node:20-alpine AS build
WORKDIR /app

# install deps frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --include=dev

# copy source
COPY frontend ./frontend
COPY backend ./backend

# build frontend -> hasil masuk ke /app/backend/dist
RUN cd frontend && npm run build

# ---- run backend ----
FROM node:20-alpine AS run
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

# copy backend source + dist hasil build
COPY --from=build /app/backend /app/backend

EXPOSE 8080
CMD ["npm","start"]
