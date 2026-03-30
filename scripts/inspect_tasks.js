const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dispatch.db');
const db = new Database(dbPath);

try {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  console.log(`Found ${tasks.length} tasks.`);
  if (tasks.length > 0) {
    console.log('First 5 tasks:');
    console.log(JSON.stringify(tasks.slice(0, 5), null, 2));
  }
} catch (error) {
  console.error('Error inspecting tasks:', error);
}
