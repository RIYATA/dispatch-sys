const db = require('../lib/db').default;
console.log('DB initialized');
const columns = db.prepare("PRAGMA table_info(tasks)").all();
console.log('Columns:', columns.map(c => c.name));
