import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
 const { searchParams } = new URL(request.url);
 const teamId = searchParams.get('teamId');

 if (!teamId) {
  return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
 }

 const rows = db.prepare(`
  SELECT staffId FROM team_members WHERE teamId = ?
 `).all(teamId) as { staffId: string }[];

 return NextResponse.json({ staffIds: rows.map(r => r.staffId) });
}

export async function POST(request: Request) {
 const body = await request.json();
 const { teamId, staffIds } = body;

 if (!teamId || !Array.isArray(staffIds)) {
  return NextResponse.json({ error: 'teamId and staffIds are required' }, { status: 400 });
 }

 try {
  const updateTx = db.transaction(() => {
   db.prepare('DELETE FROM team_members WHERE teamId = ?').run(teamId);
   const insert = db.prepare('INSERT OR IGNORE INTO team_members (id, teamId, staffId) VALUES (?, ?, ?)');
   staffIds.forEach((staffId: string) => {
    insert.run(crypto.randomUUID(), teamId, staffId);
   });
  });

  updateTx();
  return NextResponse.json({ success: true });
 } catch (error) {
  console.error('Failed to update team members:', error);
  return NextResponse.json({ error: 'Failed to update team members' }, { status: 500 });
 }
}
