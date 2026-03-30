import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      customerName, phoneNumber, address, appointmentTime, adminNote, cpName,
      status, priority, visitResult, points, newInstallPoints, stockPoints,
      isKeyPersonHome, isAccessControlEntry, hasOpportunity, opportunityNotes,
      isWeChatAdded, isHighValue, isCompetitorUser, competitorSpending, conversionChance, carrierInfo,
      residentCount, monthlySpending, isCompanyBill, competitorExpirationDate, isNonResident, isElderlyHome,
      actualStaffIds
    } = body;

    const updateTx = db.transaction(() => {
      const team = cpName
        ? (db.prepare('SELECT id FROM cps WHERE name = ?').get(cpName) as { id: string } | undefined)
        : undefined;

      const stmt = db.prepare(`
        UPDATE tasks 
        SET customerName = ?, phoneNumber = ?, address = ?, appointmentTime = ?, adminNote = ?, cpName = ?,
            status = ?, priority = ?, visitResult = ?, points = ?, newInstallPoints = ?, stockPoints = ?,
            isKeyPersonHome = ?, isAccessControlEntry = ?, hasOpportunity = ?, opportunityNotes = ?,
            isWeChatAdded = ?, isHighValue = ?, isCompetitorUser = ?, competitorSpending = ?, conversionChance = ?, carrierInfo = ?,
            residentCount = ?, monthlySpending = ?, isCompanyBill = ?, competitorExpirationDate = ?, isNonResident = ?, isElderlyHome = ?, projectName = ?, teamId = ?
        WHERE id = ?
      `);

      const result = stmt.run(
        customerName, phoneNumber, address, appointmentTime, adminNote, cpName || null,
        status, priority, visitResult, points || 0, newInstallPoints || 0, stockPoints || 0,
        isKeyPersonHome ? 1 : 0, isAccessControlEntry ? 1 : 0, hasOpportunity ? 1 : 0, opportunityNotes,
        isWeChatAdded ? 1 : 0, isHighValue ? 1 : 0, isCompetitorUser ? 1 : 0, competitorSpending, conversionChance, carrierInfo,
        residentCount || 0, monthlySpending, isCompanyBill ? 1 : 0, competitorExpirationDate, isNonResident ? 1 : 0, isElderlyHome ? 1 : 0, body.projectName, team?.id || null,
        id
      );

      if (Array.isArray(actualStaffIds)) {
        db.prepare('DELETE FROM task_staff WHERE taskId = ?').run(id);
        const insertStmt = db.prepare('INSERT OR IGNORE INTO task_staff (id, taskId, staffId) VALUES (?, ?, ?)');
        actualStaffIds.forEach((staffId: string) => {
          insertStmt.run(crypto.randomUUID(), id, staffId);
        });
      }

      return result;
    });

    const result = updateTx();

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
