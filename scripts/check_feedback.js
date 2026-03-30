const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dispatch.db');
const db = new Database(dbPath);

console.log('--- Checking CP Feedback ---');

try {
  // Query tasks where feedback is not null and not empty
  const tasks = db.prepare(`
    SELECT id, customerName, cpName, visitResult, feedback, opportunityNotes, completedAt 
    FROM tasks 
    WHERE feedback IS NOT NULL AND feedback != ''
    ORDER BY completedAt DESC 
    LIMIT 20
  `).all();

  if (tasks.length === 0) {
    console.log('No tasks found with feedback.');
  } else {
    console.log(`Found ${tasks.length} recent tasks with feedback:\n`);
    tasks.forEach((task, index) => {
      console.log(`[Task ${index + 1}]`);
      console.log(`  Customer: ${task.customerName}`);
      console.log(`  CP: ${task.cpName}`);
      console.log(`  Result: ${task.visitResult}`);
      console.log(`  Feedback: ${task.feedback}`);
      if (task.opportunityNotes) {
        console.log(`  Opportunity Notes: ${task.opportunityNotes}`);
      }
      console.log(`  Completed At: ${task.completedAt}`);
      console.log('-----------------------------------');
    });
  }

} catch (error) {
  console.error('Error querying database:', error);
}
