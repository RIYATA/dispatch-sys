const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dispatch.db');
const db = new Database(dbPath);

try {
  const info = db.prepare('DELETE FROM tasks').run();
  console.log(`Deleted ${info.changes} tasks.`);
} catch (error) {
  console.error('Error clearing tasks:', error);
}
