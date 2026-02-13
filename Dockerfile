FROM node:20-alpine
WORKDIR /app

# Install deps backend
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --include=dev

# Install deps frontend
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend --include=dev

# Copy source
COPY . .

# Build frontend (Vite)
RUN npm --prefix frontend run build

# Pastikan backend/dist ada, lalu copy hasil build frontend ke backend/dist
RUN rm -rf backend/dist && mkdir -p backend/dist && cp -r frontend/dist/* backend/dist/

EXPOSE 8080
CMD ["npm", "start"]
