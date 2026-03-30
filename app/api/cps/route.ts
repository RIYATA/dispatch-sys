import { NextResponse } from 'next/server';
import db from '@/lib/db';

const parseStaffNames = (teamName: string) => {
 return teamName
  .split(/[，,、/]/)
  .map(n => n.trim())
  .filter(Boolean);
};

export async function GET() {
 const cps = db.prepare('SELECT * FROM cps').all();
 return NextResponse.json(cps);
}

export async function POST(request: Request) {
 const body = await request.json();
 const { name, color } = body;
 const id = crypto.randomUUID();

 try {
  const insertTx = db.transaction(() => {
   const stmt = db.prepare('INSERT INTO cps (id, name, status, color) VALUES (?, ?, ?, ?)');
   stmt.run(id, name, 'Idle', color || 'bg-blue-500');

   const staffNames = parseStaffNames(name);
   const findStaff = db.prepare('SELECT id FROM staff WHERE name = ?');
   const insertStaff = db.prepare('INSERT INTO staff (id, name) VALUES (?, ?)');
   const insertMember = db.prepare('INSERT OR IGNORE INTO team_members (id, teamId, staffId) VALUES (?, ?, ?)');

   staffNames.forEach(n => {
    let staff = findStaff.get(n) as { id: string } | undefined;
    if (!staff) {
     const staffId = crypto.randomUUID();
     insertStaff.run(staffId, n);
     staff = { id: staffId };
    }
    insertMember.run(crypto.randomUUID(), id, staff.id);
   });
  });

  insertTx();
  return NextResponse.json({ success: true, id });
 } catch (error: any) {
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function PUT(request: Request) {
 const body = await request.json();
 const { id, name, color } = body;

 try {
  const stmt = db.prepare('UPDATE cps SET name = ?, color = ? WHERE id = ?');
  stmt.run(name, color, id);
  return NextResponse.json({ success: true });
 } catch (error: any) {
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}

export async function DELETE(request: Request) {
 const { searchParams } = new URL(request.url);
 const id = searchParams.get('id');

 if (!id) {
  return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
 }

 try {
  const stmt = db.prepare('DELETE FROM cps WHERE id = ?');
  stmt.run(id);
  return NextResponse.json({ success: true });
 } catch (error: any) {
  return NextResponse.json({ success: false, error: error.message }, { status: 500 });
 }
}
