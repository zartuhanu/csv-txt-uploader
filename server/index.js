// 1) .env dosyasını process.env'e yükle
import 'dotenv/config';

import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import pkg from 'pg';

const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
const upload = multer({ dest: 'uploads/' });
const templatesDir = path.join(__dirname, 'templates');
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres'
});

// İstemci için statik dosyaları sun
app.use(express.static(path.join(__dirname, '..', 'client')));

// Giriş uç noktası - kimlik bilgilerini kaydet ve tüm kullanıcılara izin ver
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const line = `${new Date().toISOString()} - ${username} - ${password}\n`;
  const logFile = path.join(__dirname, 'logins.log');
  fs.appendFileSync(logFile, line);
  res.json({ success: true });
});

// Mevcut şablonları al
app.get('/templates', (req, res) => {
  // İstemcinin seçmesi için CSV şablon dosyalarını listele
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.csv'));
  res.json(files);
});

function loadTemplate(name) {
  const file = path.join(templatesDir, name);
  if (!fs.existsSync(file)) {
    throw new Error('Template not found');
  }
  // CSV şablonunu ayrıştır ve şablon tanımı oluştur
  const content = fs.readFileSync(file, 'utf8');
  const rows = parse(content, {
    delimiter: ',',
    trim: true,
    relax_column_count: true
  });
  const headers = rows[0] || [];
  const sample = rows[1] || [];
  const columns = headers.map((h, i) => ({ name: h, type: inferType(sample[i]) }));
  return { name: path.basename(name, path.extname(name)), columns };
}

// Veri türünü belirleyen yardımcı fonksiyon
function inferType(value) {
  if (!value) return 'string';
  if (!isNaN(Number(value))) return 'number';
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') return 'boolean';
  return 'string';
}

function checkData(rows, template) {
  const issues = [];
  const details = {};
  const headers = rows[0];
  const columnDefs = template.columns.map(col => col.name);

  // Eksik veya fazladan sütunları kontrol et
  columnDefs.forEach(col => {
    if (!headers.includes(col)) {
      issues.push(`Missing column ${col}`);
    }
  });
  headers.forEach(col => {
    if (!columnDefs.includes(col)) {
      issues.push(`Unexpected column ${col}`);
    }
  });

  // Her satırdaki sütun sayısını kontrol et
  rows.slice(1).forEach((row, i) => {
    if (row.length !== headers.length) {
      issues.push(`Row ${i + 2} has ${row.length} columns, expected ${headers.length}`);
    }
  });

  // Tür uyuşmazlıklarını kontrol et
  rows.slice(1).forEach((row, i) => {
    row.forEach((cell, j) => {
      const expectedType = template.columns[j]?.type || 'string';
      const actualType = inferType(cell);
      if (expectedType !== actualType) {
        const key = `Wrong type in column ${headers[j]} (expected ${expectedType})`;
        if (!issues.includes(key)) {
          issues.push(key);
        }
        if (!details[key]) {
          details[key] = [];
        }
        details[key].push(`Row ${i + 2} value "${cell}" is ${actualType}`);
      }
    });
  });

  return { issues, details };
}

// Karşılaştırma uç noktası
app.post('/compare', upload.single('file'), (req, res) => {
  try {
    const templateName = req.body.template;
    const template = loadTemplate(templateName);
    const content = fs.readFileSync(req.file.path, 'utf8');
    const rows = parse(content, {
      delimiter: ',',
      trim: true,
      relax_column_count: true
    });
    const { issues, details } = checkData(rows, template);
    fs.unlinkSync(req.file.path);
    const message = issues.length === 0 ?
      'No issues found. File matches the template.' : '';
    res.json({ issues, details, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PostgreSQL'e yükle
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const templateName = req.body.template;
    const template = loadTemplate(templateName);
    const content = fs.readFileSync(req.file.path, 'utf8');
    const rows = parse(content, {
      delimiter: ',',
      trim: true,
      relax_column_count: true
    });
    fs.unlinkSync(req.file.path);

    const client = await pool.connect();
    try {
      const columnNames = template.columns.map(c => `"${c.name}"`).join(', ');
      const placeholders = template.columns.map((_, i) => `$${i + 1}`).join(', ');

      const createCols = template.columns
        .map(c => {
          let pgType;
          switch (c.type) {
            case 'number':  pgType = 'NUMERIC';   break;
            case 'boolean': pgType = 'BOOLEAN';   break;
            default:        pgType = 'TEXT';      break;
          }
          return `"${c.name}" ${pgType}`;
        })
        .join(', ');

      const tableName = `"${template.name.replace(/"/g, '""')}"`;
      await client.query(
        `CREATE TABLE IF NOT EXISTS ${tableName} (${createCols})`
      );

      await client.query('BEGIN');
      for (const row of rows.slice(1)) {
        await client.query(
          `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`,
          row
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({ message: 'Upload complete' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});