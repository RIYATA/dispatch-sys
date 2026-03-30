import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
 try {
  const presets = db.prepare('SELECT * FROM feedback_presets').all();
  return NextResponse.json(presets);
 } catch (error) {
  return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
 }
}

export async function POST(req: NextRequest) {
 try {
  const body = await req.json();
  const { id, content } = body;

  if (!id || content === undefined) {
   return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });
  }

  const stmt = db.prepare('UPDATE feedback_presets SET content = ? WHERE id = ?');
  const result = stmt.run(content, id);

  if (result.changes === 0) {
   return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
 } catch (error) {
  return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
 }
}
