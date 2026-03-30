import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
  const {
    taskId,
    cpId,
    success,
    feedback,
    isAccessControlEntry,
    isKeyPersonHome,
    isHighValue,
    hasOpportunity,
    opportunityNotes,
    points,
    newInstallPoints,
    stockPoints,
    visitResult,
    isCompetitorUser,
    competitorSpending,
    conversionChance,
    isWeChatAdded,
    rescheduleTime,
    isElderlyHome
  } = await request.json();

  console.log('📝 Task Complete Request:', { taskId, visitResult });

  // Determine Status based on Visit Result
  let newStatus = 'Completed';
  let completedAtValue: string | null = new Date().toISOString();

  if (visitResult === 'reschedule' && rescheduleTime) {
    // Get current task to compare dates
    const currentTask = db.prepare('SELECT appointmentTime FROM tasks WHERE id = ?').get(taskId) as { appointmentTime: string };
    const originalDate = currentTask.appointmentTime.split(' ')[0]; // Extract date part
    const newDate = rescheduleTime.split(' ')[0]; // Extract date part

    // If same day, keep as Assigned; if different day, set as Reschedule
    if (originalDate === newDate) {
      newStatus = 'Assigned'; // Same day reschedule stays in "待上门"
    } else {
      newStatus = 'Reschedule'; // Different day goes to "已改约"
    }
    completedAtValue = null;
  } else if (visitResult === 'no_answer') {
    newStatus = 'In_Progress';
    completedAtValue = null;
  } else if (visitResult === 'rejected') {
    newStatus = 'Failure';
  } else if (visitResult === 'other') {
    newStatus = 'Failure';
  }

  console.log('✅ Calculated Status:', { visitResult, newStatus });

  const completeTx = db.transaction(() => {
    // 1. Update Task
    // If rescheduling, save original time and update appointmentTime
    if (visitResult === 'reschedule' && rescheduleTime) {
      const currentTask = db.prepare('SELECT appointmentTime FROM tasks WHERE id = ?').get(taskId) as { appointmentTime: string };
      db.prepare(`UPDATE tasks SET originalAppointmentTime = ?, appointmentTime = ? WHERE id = ?`).run(currentTask.appointmentTime, rescheduleTime, taskId);
    }

    db.prepare(`
      UPDATE tasks 
      SET status = ?, 
          feedback = ?,
          isAccessControlEntry = ?,
          isKeyPersonHome = ?,
          isHighValue = ?,
          hasOpportunity = ?,
          opportunityNotes = ?,
          points = ?,
          newInstallPoints = ?,
          stockPoints = ?,
          visitResult = ?,
          isCompetitorUser = ?,
          competitorSpending = ?,
          conversionChance = ?,
          isWeChatAdded = ?,
          isElderlyHome = ?,
          completedAt = ?
      WHERE id = ?
    `).run(
      newStatus,
      feedback,
      isAccessControlEntry ? 1 : 0,
      isKeyPersonHome ? 1 : 0,
      isHighValue ? 1 : 0,
      hasOpportunity ? 1 : 0,
      opportunityNotes || '',
      points || 0,
      newInstallPoints || 0,
      stockPoints || 0,
      visitResult,
      isCompetitorUser ? 1 : 0,
      competitorSpending || '',
      conversionChance || '',
      isWeChatAdded ? 1 : 0,
      isElderlyHome ? 1 : 0,
      completedAtValue,
      taskId
    );

    // 2. Update CP Status to Idle (only if no other tasks)
    const cp = db.prepare('SELECT id FROM cps WHERE id = ?').get(cpId) as { id: string };
    const cpName = db.prepare('SELECT name FROM cps WHERE id = ?').get(cpId) as { name: string };
    const remainingTasks = db.prepare(`SELECT COUNT(*) as count FROM tasks WHERE cpName = ? AND (status = 'Assigned' OR status = 'In_Progress')`).get(cpName.name) as { count: number };

    if (remainingTasks.count === 0) {
      db.prepare(`UPDATE cps SET status = 'Idle' WHERE id = ?`).run(cpId);
    }
  });

  try {
    completeTx();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to complete task' }, { status: 500 });
  }
}
