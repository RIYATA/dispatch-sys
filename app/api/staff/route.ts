import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const staff = db.prepare('SELECT * FROM staff ORDER BY name').all();
  return NextResponse.json(staff);
}
