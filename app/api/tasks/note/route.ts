import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
 const { taskId, adminNote } = await request.json();

 if (!taskId) {
  return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
 }

 const result = db.prepare('UPDATE tasks SET adminNote = ? WHERE id = ?').run(adminNote || '', taskId);
 if (result.changes === 0) {
  return NextResponse.json({ error: 'Task not found' }, { status: 404 });
 }

 return NextResponse.json({ success: true });
}
