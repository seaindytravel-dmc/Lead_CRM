// routes/deals.js - CRUD endpoints สำหรับ Deal (โอกาสการขาย)
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/deals - ดึง deals ทั้งหมด พร้อมชื่อ contact ที่เชื่อมกัน
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, c.name AS contact_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       ORDER BY d.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/:id - ดึง deal เดียวตาม id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, c.name AS contact_name
       FROM deals d
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE d.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals - สร้าง deal ใหม่
// stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
router.post('/', async (req, res) => {
  try {
    const { title, value, stage, contact_id } = req.body;
    const result = await pool.query(
      `INSERT INTO deals (title, value, stage, contact_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, value, stage || 'lead', contact_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deals/:id - แก้ไข deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, value, stage, contact_id } = req.body;
    const result = await pool.query(
      `UPDATE deals
       SET title=$1, value=$2, stage=$3, contact_id=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title, value, stage, contact_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deals/:id - ลบ deal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM deals WHERE id = $1', [id]);
    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
