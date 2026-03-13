# Dockerfile - สร้าง Docker image สำหรับ CRM App

# ใช้ Node.js 20 alpine (ขนาดเล็ก เร็ว)
FROM node:20-alpine

# กำหนด working directory ภายใน container
WORKDIR /app

# คัดลอก package files ก่อน (ใช้ Docker layer cache ให้เป็นประโยชน์)
COPY package*.json ./

# ติดตั้ง dependencies (production เท่านั้น)
RUN npm install --omit=dev

# คัดลอกไฟล์ทั้งหมด
COPY . .

# เปิด port 3000
EXPOSE 3000

# คำสั่งรัน app
CMD ["node", "server.js"]
