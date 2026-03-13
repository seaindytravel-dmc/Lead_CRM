-- init.sql - สร้าง Database Tables สำหรับ CRM
-- รัน: psql -U postgres -d crm_db -f init.sql

-- สร้าง database (ถ้ายังไม่มี - รันแยกหรือสร้างผ่าน pgAdmin)
-- CREATE DATABASE crm_db;

-- ตาราง contacts (ผู้ติดต่อ/ลูกค้า)
CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(50),
  company    VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ตาราง deals (โอกาสการขาย)
CREATE TABLE IF NOT EXISTS deals (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  value      NUMERIC(15, 2) DEFAULT 0,
  stage      VARCHAR(50) DEFAULT 'lead',  -- lead, qualified, proposal, negotiation, closed_won, closed_lost
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ข้อมูลตัวอย่าง (optional)
INSERT INTO contacts (name, email, phone, company) VALUES
  ('สมชาย ใจดี',   'somchai@example.com', '081-234-5678', 'บริษัท ABC จำกัด'),
  ('สมหญิง รักงาน', 'somying@example.com', '089-876-5432', 'XYZ Corp');

INSERT INTO deals (title, value, stage, contact_id) VALUES
  ('โปรเจกต์เว็บไซต์', 150000, 'proposal',    1),
  ('ระบบ ERP',          500000, 'negotiation', 2),
  ('Maintenance รายปี',  60000, 'closed_won',  1);
