# Dockerfile — สำหรับ Railway deployment
FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies ก่อน (ใช้ Docker layer cache)
COPY package*.json ./
RUN npm install --omit=dev

# copy source code
COPY . .

# Railway inject PORT ผ่าน env var อัตโนมัติ
# ไม่ต้อง hardcode port — server.js ใช้ process.env.PORT || 3000
EXPOSE 3000

CMD ["node", "server.js"]
