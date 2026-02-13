FROM node:20-alpine
WORKDIR /app

# install deps backend/root
COPY package.json ./
RUN npm install

# install deps frontend (supaya vite ada)
COPY frontend/package.json ./frontend/
RUN npm install --prefix frontend

# copy semua source
COPY . .

# build frontend (panggil script build di root yang udah kamu punya)
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
