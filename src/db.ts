import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leads.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    borrower_name TEXT,
    email TEXT,
    phone TEXT,
    loan_amount REAL,
    property_value REAL,
    monthly_rent REAL,
    credit_score INTEGER,
    dscr REAL,
    ltv REAL,
    status TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface LeadRecord {
  borrower_name: string;
  email: string;
  phone: string;
  loan_amount: number;
  property_value: number;
  monthly_rent: number;
  credit_score: number;
  dscr: number;
  ltv: number;
  status: string;
  notes: string;
}

export function saveLead(lead: LeadRecord): number {
  const stmt = db.prepare(`
    INSERT INTO leads (borrower_name, email, phone, loan_amount, property_value, monthly_rent, credit_score, dscr, ltv, status, notes)
    VALUES (@borrower_name, @email, @phone, @loan_amount, @property_value, @monthly_rent, @credit_score, @dscr, @ltv, @status, @notes)
  `);
  const info = stmt.run(lead);
  return Number(info.lastInsertRowid);
}

export function getAllLeads() {
  const stmt = db.prepare('SELECT * FROM leeds ORDER BY created_at DESC');
  // fix table name select
  const fixedStmt = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
  return fixedStmt.all();
}

export default db;
