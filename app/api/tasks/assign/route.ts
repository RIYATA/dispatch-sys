import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  const { taskId, cpId, adminNote, priority } = await request.json();

  // Transaction to update both Task and CP
  const assignTx = db.transaction(() => {
    // 1. Update Task
    const cp = db.prepare('SELECT id, name FROM cps WHERE id = ?').get(cpId) as { id: string; name: string } | undefined;
    if (!cp) {
      throw new Error('CP not found');
    }
    db.prepare(`
      UPDATE tasks 
      SET status = 'Assigned', cpName = ?, adminNote = ?, priority = ?, teamId = ?
      WHERE id = ?
    `).run(cp.name, adminNote || '', priority, cp.id, taskId);

    // 2. Update CP Status (Set to Busy to indicate they have work, but don't block)
    db.prepare(`
      UPDATE cps 
      SET status = 'Busy'
      WHERE id = ?
    `).run(cpId);
  });

  try {
    assignTx();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to assign';
    const status = message === 'CP not found' ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
