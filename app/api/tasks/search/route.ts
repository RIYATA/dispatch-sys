import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const searchPattern = `%${query}%`;

  // Search with priority: Address (Room/Building) > Name > Phone
  const tasks = db.prepare(`
    SELECT 
      id, 
      customerName, 
      address, 
      appointmentTime, 
      status, 
      cpName,
      isAccessControlEntry,
      CASE 
        WHEN address LIKE ? THEN 1 
        WHEN customerName LIKE ? THEN 2 
        WHEN phoneNumber LIKE ? THEN 3 
        ELSE 4 
      END as match_priority
    FROM tasks 
    WHERE address LIKE ? OR customerName LIKE ? OR phoneNumber LIKE ?
    ORDER BY match_priority ASC, submissionTime DESC
  `).all(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);

  return NextResponse.json(tasks);
}
