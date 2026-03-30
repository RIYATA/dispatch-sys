import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export async function DELETE() {
 try {
  const dbPath = path.join(process.cwd(), 'dispatch.db');
  const db = new Database(dbPath);

  // Delete all tasks
  const result = db.prepare('DELETE FROM tasks').run();

  db.close();

  return NextResponse.json({
   success: true,
   message: `成功删除 ${result.changes} 条任务数据`,
   deletedCount: result.changes
  });
 } catch (error: any) {
  console.error('Error deleting tasks:', error);
  return NextResponse.json({ error: error.message }, { status: 500 });
 }
}
