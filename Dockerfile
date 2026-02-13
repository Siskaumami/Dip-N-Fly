FROM node:20-alpine
WORKDIR /app

# 1) Install deps backend (ini yang bikin express ada)
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --include=dev

# 2) Install deps frontend (ini yang bikin vite ada)
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend --include=dev

# 3) Copy semua source
COPY . .

# 4) Build frontend (anggap script build root kamu memang build FE ke backend/dist)
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
