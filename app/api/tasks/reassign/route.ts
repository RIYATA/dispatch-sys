import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
 const { taskId, newCpId } = await request.json();

 try {
  const cp = db.prepare('SELECT name FROM cps WHERE id = ?').get(newCpId) as { name: string };

  if (!cp) {
   return NextResponse.json({ success: false, error: 'CP not found' }, { status: 404 });
  }

  db.prepare(`
      UPDATE tasks 
      SET cpName = ?
      WHERE id = ?
    `).run(cp.name, taskId);

  // Optionally update CP status if needed, but current logic relies on task count which is dynamic
  // So just updating the task is sufficient.

  return NextResponse.json({ success: true });
 } catch (error) {
  console.error(error);
  return NextResponse.json({ success: false, error: 'Failed to reassign' }, { status: 500 });
 }
}
