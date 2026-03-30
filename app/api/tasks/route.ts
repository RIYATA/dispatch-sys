import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { Task } from '@/types';

export async function GET() {
  // Auto-update: Move rescheduled tasks back to "待上门" if appointment is today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const date = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${date}`;

  // Update Reschedule tasks whose appointment date is today
  db.prepare(`
    UPDATE tasks 
    SET status = 'Assigned' 
    WHERE status = 'Reschedule' 
    AND appointmentTime LIKE ?
  `).run(`${todayString}%`);

  const tasks = db.prepare('SELECT * FROM tasks ORDER BY submissionTime DESC').all();
  const taskIds = tasks.map((t: any) => t.id);

  const staffRows = taskIds.length
    ? db.prepare(
        `SELECT ts.taskId as taskId, s.id as staffId, s.name as staffName
         FROM task_staff ts
         JOIN staff s ON s.id = ts.staffId
         WHERE ts.taskId IN (${taskIds.map(() => '?').join(',')})`
      ).all(...taskIds)
    : [];

  const staffMap = new Map<string, { ids: string[]; names: string[] }>();
  for (const row of staffRows as any[]) {
    if (!staffMap.has(row.taskId)) staffMap.set(row.taskId, { ids: [], names: [] });
    const entry = staffMap.get(row.taskId)!;
    entry.ids.push(row.staffId);
    entry.names.push(row.staffName);
  }
  // Parse tags from JSON string
  const parsedTasks = tasks.map((task: any) => {
    let tags = [];
    try {
      tags = task.tags ? JSON.parse(task.tags) : [];
    } catch (e) {
      console.error(`Failed to parse tags for task ${task.id}:`, e);
      tags = [];
    }
    const staffInfo = staffMap.get(task.id) || { ids: [], names: [] };
    return {
      ...task,
      tags,
      isAccessControlEntry: Boolean(task.isAccessControlEntry),
      actualStaffIds: staffInfo.ids,
      actualStaffNames: staffInfo.names
    };
  });
  return NextResponse.json(parsedTasks);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    formId, submissionTime, customerName, phoneNumber, address, appointmentTime, priority,
    cpName, status, points, isAccessControlEntry, completedAt, adminNote, visitResult,
    competitorSpending, conversionChance, isWeChatAdded, isKeyPersonHome, isHighValue,
    hasOpportunity, opportunityNotes, isElderlyHome, competitorExpirationDate, isNonResident
  } = body;

  const id = crypto.randomUUID();
  try {
    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, formId, submissionTime, customerName, phoneNumber, address, 
        appointmentTime, status, priority, tags,
        cpName, points, isAccessControlEntry, completedAt, adminNote, visitResult,
        competitorSpending, conversionChance, isWeChatAdded, isKeyPersonHome, isHighValue,
        hasOpportunity, opportunityNotes, isElderlyHome, competitorExpirationDate, isNonResident, projectName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Simple logic to auto-tag "High Value" if needed (placeholder)
    const tags: string[] = [];

    stmt.run(
      id, formId, submissionTime, customerName, phoneNumber, address,
      appointmentTime, status || 'Pending', priority || 'Normal', JSON.stringify(tags),
      cpName || '', points || 0, isAccessControlEntry ? 1 : 0, completedAt, adminNote, visitResult || 'success',
      competitorSpending, conversionChance, isWeChatAdded ? 1 : 0, isKeyPersonHome ? 1 : 0, isHighValue ? 1 : 0,
      hasOpportunity ? 1 : 0, opportunityNotes, isElderlyHome ? 1 : 0, competitorExpirationDate, isNonResident ? 1 : 0, body.projectName || '合富明珠'
    );

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
