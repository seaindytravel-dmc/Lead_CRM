// db.js - PostgreSQL connection & schema for Lead CRM
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ทดสอบการเชื่อมต่อตอนเริ่ม
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// สร้างตารางทั้งหมด (IF NOT EXISTS = ปลอดภัย รันซ้ำได้)
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100),
      company    VARCHAR(100),
      email      VARCHAR(100),
      phone      VARCHAR(20),
      status     VARCHAR(20) DEFAULT 'lead',   -- lead / prospect / customer / inactive
      tags       TEXT,
      notes      TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS deals (
      id         SERIAL PRIMARY KEY,
      contact_id INTEGER REFERENCES contacts(id),
      title      VARCHAR(200),
      value      DECIMAL(10,2),
      stage      VARCHAR(30) DEFAULT 'new',    -- new / contacted / proposal / negotiation / won / lost
      close_date DATE,
      notes      TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Tables initialized');
}

// ใส่ข้อมูลตัวอย่าง (เช็คก่อนว่ามีแล้วหรือยัง)
async function seedData() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM contacts');
  if (parseInt(rows[0].count) > 0) {
    console.log('⚡ Seed data already exists, skipping');
    return;
  }

  // 10 contacts
  const contactResult = await pool.query(`
    INSERT INTO contacts (name, company, email, phone, status, tags, notes) VALUES
      ('สมชาย ใจดี',    'บริษัท ABC จำกัด',      'somchai@abc.co.th',    '081-111-1111', 'customer',  'enterprise,vip',    'ลูกค้าเก่า ซื้อประจำ'),
      ('วิภา สุขใส',    'XYZ Corp',               'wipa@xyz.com',         '082-222-2222', 'prospect',  'sme',               'สนใจ package กลาง'),
      ('อนันต์ มีสุข',  'Tech Startup Co.',       'anan@techstartup.io',  '083-333-3333', 'lead',      'startup,tech',      'ติดต่อมาจาก LinkedIn'),
      ('นภา รักดี',     'นภา ดีไซน์',             'napa@design.com',      '084-444-4444', 'prospect',  'freelance',         'ต้องการ proposal'),
      ('กิตติ ชัยชนะ',  'Win Win Ltd.',            'kitti@winwin.co.th',   '085-555-5555', 'lead',      'enterprise',        'ส่ง brochure แล้ว'),
      ('มาลี วงศ์สกุล', 'Malee Foods',             'malee@foods.th',       '086-666-6666', 'customer',  'food,retail',       'ต่อสัญญาปีนี้'),
      ('ชัชวาล พงษ์ดี', 'ชัช เทรดดิ้ง',           'chatch@trading.com',   '087-777-7777', 'inactive',  'trading',           'หยุดซื้อ 6 เดือนแล้ว'),
      ('สุดา แสงทอง',   'Suda Consulting',         'suda@consulting.co.th','088-888-8888', 'prospect',  'consulting',        'นัด demo สัปดาห์หน้า'),
      ('ประสิทธิ์ ดำรง','รุ่งเรือง อินดัสทรี',      'prasit@rung.co.th',    '089-999-9999', 'lead',      'industrial',        'รอ budget อนุมัติ'),
      ('จิรา นพรัตน์',  'JN Digital',              'jira@jndigital.com',   '090-000-0000', 'customer',  'digital,agency',    'ลูกค้า premium')
    RETURNING id
  `);

  const ids = contactResult.rows.map(r => r.id);

  // 5 deals (ใช้ id จริงจาก insert ข้างบน)
  await pool.query(`
    INSERT INTO deals (contact_id, title, value, stage, close_date, notes) VALUES
      ($1, 'Enterprise Package ปีที่ 2',  150000.00, 'won',         '2026-01-31', 'ต่อสัญญาสำเร็จ'),
      ($2, 'SME Bundle Proposal',          45000.00,  'proposal',    '2026-04-15', 'รอ approval จาก MD'),
      ($3, 'Startup Starter Pack',         18000.00,  'contacted',   '2026-05-01', 'ส่ง demo แล้ว รอ feedback'),
      ($4, 'Design Service Retainer',      30000.00,  'negotiation', '2026-03-30', 'ต่อรองราคาอยู่'),
      ($5, 'Enterprise Suite',            200000.00,  'new',         '2026-06-30', 'เพิ่งได้ contact มา')
  `, [ids[0], ids[1], ids[2], ids[3], ids[4]]);

  console.log('✅ Seed data inserted: 10 contacts, 5 deals');
}

module.exports = { pool, initDB, seedData };
