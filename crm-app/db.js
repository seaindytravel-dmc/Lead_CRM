// db.js - PostgreSQL connection pool
// ใช้ pg.Pool เพื่อจัดการ connection หลายๆ อันพร้อมกัน (connection pooling)
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'crm_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// ทดสอบการเชื่อมต่อตอนเริ่ม
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // คืน connection กลับ pool
  }
});

module.exports = pool;
