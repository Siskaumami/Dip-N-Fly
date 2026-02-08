# ---- build frontend ----
FROM node:20-alpine AS build
WORKDIR /app

# install deps frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# copy source
COPY frontend ./frontend
COPY backend ./backend

# build frontend (hasilnya: /app/frontend/dist)
RUN cd frontend && npm run build

# >>> PENTING: pindahin hasil build ke backend/dist
RUN rm -rf /app/backend/dist \
  && mkdir -p /app/backend/dist \
  && cp -R /app/frontend/dist/* /app/backend/dist/

# ---- run backend ----
FROM node:20-alpine AS run
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

# copy backend source + dist hasil build
COPY --from=build /app/backend /app/backend

EXPOSE 8080
CMD ["npm","start"]
