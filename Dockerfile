FROM node:20-alpine
WORKDIR /app

# Install deps backend/root
COPY package*.json ./
RUN npm ci

# Install deps frontend (INI YANG BIKIN VITE ADA)
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

# Copy semua source setelah deps biar cache Docker kepake
COPY . .

# Build frontend
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
