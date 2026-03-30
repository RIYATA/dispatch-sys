const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dispatch.db');
const db = new Database(dbPath);

const columns = db.prepare("PRAGMA table_info(tasks)").all();
console.log('Columns:', columns.map(c => c.name));
