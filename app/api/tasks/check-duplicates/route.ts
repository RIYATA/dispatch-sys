import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { Task } from '@/types';

export async function POST(request: Request) {
 try {
  const { phoneNumbers } = await request.json();

  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
   return NextResponse.json({ duplicates: [] });
  }

  // Create placeholders for the IN clause
  const placeholders = phoneNumbers.map(() => '?').join(',');

  // Query for existing tasks with these phone numbers
  // We only care about active tasks or recently completed ones? 
  // The requirement implies checking against ALL data to avoid re-entry.
  const stmt = db.prepare(`
      SELECT * FROM tasks 
      WHERE phoneNumber IN (${placeholders})
    `);

  const existingTasks = stmt.all(...phoneNumbers) as Task[];

  // Map results to a more usable format
  // We might have multiple tasks for one phone number (though ideally shouldn't for active ones)
  // Let's group by phone number
  const duplicates = existingTasks.map(task => ({
   phoneNumber: task.phoneNumber,
   existingTask: {
    ...task,
    tags: task.tags ? JSON.parse(task.tags as any) : [],
    isAccessControlEntry: Boolean(task.isAccessControlEntry)
   }
  }));

  return NextResponse.json({ duplicates });
 } catch (error) {
  console.error('Check duplicates error:', error);
  return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 });
 }
}
