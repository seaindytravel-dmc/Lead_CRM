// routes/deals.js - REST API สำหรับ Deals
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// GET /api/deals/pipeline — ต้องอยู่ก่อน /:id
// คืน { stage, count, total_value } แต่ละ stage
router.get('/pipeline', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        stage,
        COUNT(*)            AS count,
        COALESCE(SUM(value), 0) AS total_value
      FROM deals
      GROUP BY stage
      ORDER BY
        CASE stage
          WHEN 'new'         THEN 1
          WHEN 'contacted'   THEN 2
          WHEN 'proposal'    THEN 3
          WHEN 'negotiation' THEN 4
          WHEN 'won'         THEN 5
          WHEN 'lost'        THEN 6
          ELSE 7
        END
    `);
    res.json(result.rows.map(row => ({
      stage:       row.stage,
      count:       parseInt(row.count),
      total_value: parseFloat(row.total_value),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals — รายการทั้งหมด พร้อม JOIN ชื่อ contact
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, c.name AS contact_name, c.company AS contact_company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals — สร้าง deal ใหม่
router.post('/', async (req, res) => {
  try {
    const { contact_id, title, value, stage, close_date, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      `INSERT INTO deals (contact_id, title, value, stage, close_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [contact_id, title.trim(), value || 0, stage || 'new', close_date || null, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/deals/:id — แก้ไข deal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { contact_id, title, value, stage, close_date, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await pool.query(
      `UPDATE deals
       SET contact_id=$1, title=$2, value=$3, stage=$4, close_date=$5, notes=$6
       WHERE id=$7
       RETURNING *`,
      [contact_id, title.trim(), value, stage, close_date || null, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/deals/:id — ลบ deal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM deals WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json({ message: 'Deal deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
