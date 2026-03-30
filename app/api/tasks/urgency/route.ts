import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
 const { taskId, priority } = await request.json();

 if (!taskId || !priority) {
  return NextResponse.json({ success: false, error: 'taskId and priority are required' }, { status: 400 });
 }

 const result = db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(priority, taskId);
 if (result.changes === 0) {
  return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
 }

 return NextResponse.json({ success: true });
}
