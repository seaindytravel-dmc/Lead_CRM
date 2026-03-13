// server.js - Main Express server entry point
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // โหลด environment variables จาก .env

const app = express();

// --- Middleware ---
app.use(cors()); // อนุญาต Cross-Origin requests
app.use(express.json()); // parse JSON body
app.use(express.urlencoded({ extended: true })); // parse URL-encoded body

// --- Static Files ---
// เสิร์ฟไฟล์ HTML/CSS/JS จากโฟลเดอร์ /public
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
const contactsRouter = require('./routes/contacts');
const dealsRouter = require('./routes/deals');

app.use('/api/contacts', contactsRouter); // จัดการ Contact CRUD
app.use('/api/deals', dealsRouter);       // จัดการ Deal CRUD

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Catch-All: ส่ง index.html สำหรับ SPA routing ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ CRM Server running at http://localhost:${PORT}`);
});
