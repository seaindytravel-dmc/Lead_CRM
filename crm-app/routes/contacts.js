// routes/contacts.js - CRUD endpoints สำหรับ Contact (ลูกค้า/ผู้ติดต่อ)
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/contacts - ดึงรายชื่อ contacts ทั้งหมด
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts/:id - ดึง contact คนเดียวตาม id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM contacts WHERE id = $1', [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts - สร้าง contact ใหม่
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;
    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, company)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email, phone, company]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/contacts/:id - แก้ไขข้อมูล contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company } = req.body;
    const result = await pool.query(
      `UPDATE contacts
       SET name=$1, email=$2, phone=$3, company=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, email, phone, company, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id - ลบ contact
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contacts WHERE id = $1', [id]);
    res.json({ message: 'Contact deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
