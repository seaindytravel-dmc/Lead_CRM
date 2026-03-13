// routes/contacts.js - REST API สำหรับ Contacts
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/contacts/export — ดาวน์โหลด CSV พร้อม BOM ให้ Excel อ่านภาษาไทยได้
// ต้องอยู่ก่อน /:id ทุกตัว
router.get('/export', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.company,
        c.email,
        c.phone,
        c.status,
        c.tags,
        c.notes,
        c.created_at,
        COUNT(d.id)              AS deal_count,
        COALESCE(SUM(d.value),0) AS deal_total
      FROM contacts c
      LEFT JOIN deals d ON c.id = d.contact_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    // escape field ที่มี comma / quote / newline
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['ID','ชื่อ','บริษัท','อีเมล','เบอร์โทร','สถานะ','Tags','Notes','จำนวน Deals','มูลค่า Deals','วันที่สร้าง'];
    const rows = result.rows.map(r => [
      r.id, r.name, r.company, r.email, r.phone, r.status,
      r.tags, r.notes, r.deal_count, r.deal_total,
      new Date(r.created_at).toLocaleDateString('th-TH'),
    ].map(esc).join(','));

    // \uFEFF = UTF-8 BOM ให้ Excel เปิดภาษาไทยได้โดยไม่ต้อง import
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const date = new Date().toISOString().substring(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contacts-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/stats — ต้องอยู่ก่อน /:id ไม่งั้น "stats" จะถูกแปลเป็น id
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM contacts
      GROUP BY status
      ORDER BY status
    `);
    // แปลงเป็น { lead: 3, prospect: 2, ... } ให้ frontend ใช้ง่าย
    const stats = {};
    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
    });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts — รายการทั้งหมด รองรับ ?search= และ ?status=
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR company ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM contacts ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id — ดู contact รายบุคคล
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM contacts WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts — เพิ่มใหม่
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, status, tags, notes } = req.body;

    // Validate: name และ email ต้องไม่ว่าง
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, company, email, phone, status, tags, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name.trim(), company, email.trim(), phone, status || 'lead', tags, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contacts/:id — แก้ไข (updated_at auto update)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, status, tags, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }

    const result = await pool.query(
      `UPDATE contacts
       SET name=$1, company=$2, email=$3, phone=$4, status=$5, tags=$6, notes=$7,
           updated_at=NOW()
       WHERE id=$8
       RETURNING *`,
      [name.trim(), company, email.trim(), phone, status, tags, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id — ลบ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM contacts WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
