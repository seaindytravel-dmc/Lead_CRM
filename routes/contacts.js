// routes/contacts.js - REST API สำหรับ Contacts
const express  = require('express');
const router   = express.Router();
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

// GET /api/contacts/export-excel — ดาวน์โหลด .xlsx พร้อม styling
router.get('/export-excel', async (req, res) => {
  // lazy-load เพื่อไม่ให้ crash ทั้งไฟล์ถ้า exceljs โหลดไม่ได้
  const ExcelJS = require('exceljs');
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.name, c.company, c.email, c.phone, c.status,
        c.tags, c.notes, c.created_at,
        COUNT(d.id)              AS deal_count,
        COALESCE(SUM(d.value),0) AS deal_total
      FROM contacts c
      LEFT JOIN deals d ON c.id = d.contact_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MyCRM';
    wb.created = new Date();

    const ws = wb.addWorksheet('Contacts', {
      views: [{ state: 'frozen', ySplit: 1 }], // freeze header row
    });

    // ---- Column definitions ----
    ws.columns = [
      { header: 'ID',            key: 'id',          width: 8  },
      { header: 'ชื่อ',          key: 'name',        width: 24 },
      { header: 'บริษัท',        key: 'company',     width: 22 },
      { header: 'อีเมล',         key: 'email',       width: 28 },
      { header: 'เบอร์โทร',      key: 'phone',       width: 16 },
      { header: 'สถานะ',         key: 'status',      width: 14 },
      { header: 'Tags',          key: 'tags',        width: 20 },
      { header: 'Notes',         key: 'notes',       width: 30 },
      { header: 'จำนวน Deals',   key: 'deal_count',  width: 14 },
      { header: 'มูลค่า Deals',  key: 'deal_total',  width: 16 },
      { header: 'วันที่สร้าง',   key: 'created_at',  width: 16 },
    ];

    // ---- Header row styling ----
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
      };
    });
    headerRow.height = 28;

    // ---- Status color map ----
    const statusColor = {
      lead:     'FFdbeafe', // blue-100
      prospect: 'FFfef9c3', // yellow-100
      customer: 'FFdcfce7', // green-100
      inactive: 'FFf3f4f6', // gray-100
    };

    // ---- Data rows ----
    result.rows.forEach((r, i) => {
      const row = ws.addRow({
        id:         r.id,
        name:       r.name        || '',
        company:    r.company     || '',
        email:      r.email       || '',
        phone:      r.phone       || '',
        status:     r.status      || '',
        tags:       r.tags        || '',
        notes:      r.notes       || '',
        deal_count: Number(r.deal_count),
        deal_total: Number(r.deal_total),
        created_at: new Date(r.created_at).toLocaleDateString('th-TH'),
      });

      // สลับสี row
      const rowBg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        cell.alignment = { vertical: 'middle', wrapText: false };
      });

      // status cell สีตาม status
      const statusCell = row.getCell('status');
      const bg = statusColor[r.status] || 'FFF3F4F6';
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      statusCell.font = { bold: true };
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // deal_total format เป็น currency
      row.getCell('deal_total').numFmt = '#,##0.00';
      row.getCell('deal_count').alignment = { horizontal: 'center', vertical: 'middle' };
      row.height = 22;
    });

    // ---- Auto-filter ----
    ws.autoFilter = { from: 'A1', to: `K1` };

    // ---- Send file ----
    const date = new Date().toISOString().substring(0, 10);
    const filename = `contacts-${date}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
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
