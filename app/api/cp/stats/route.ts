import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cpId = searchParams.get('cpId');

  if (!cpId) {
    return NextResponse.json({ error: 'CP ID is required' }, { status: 400 });
  }

  try {
    // Get CP Name first
    const cp = db.prepare('SELECT name FROM cps WHERE id = ?').get(cpId) as { name: string };
    if (!cp) {
      return NextResponse.json({ error: 'CP not found' }, { status: 404 });
    }

    // Get Today's start time (YYYY-MM-DD)
    // We use local time for simplicity, or UTC if preferred. 
    // Since we store completedAt as ISO string or similar, we can filter by string prefix or date function.
    // SQLite's date('now', 'localtime') might be useful if we stored as such, but we will store as ISO in route.ts.
    // Let's assume we filter by JS date for now to be safe with timezones if the server is local.

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIsoStart = todayStart.toISOString();

    // 1. Today's Points
    // We need to check tasks completed by this CP (cpName) that were completed after todayStart
    // Note: tasks table has cpName, not cpId.
    const todayStats = db.prepare(`
      SELECT SUM(points) as points, COUNT(*) as count
      FROM tasks 
      WHERE cpName = ? 
      AND completedAt IS NOT NULL
      AND completedAt >= ?
    `).get(cp.name, todayIsoStart) as { points: number, count: number };

    // 2. Total Opportunities
    const opportunities = db.prepare(`
      SELECT COUNT(*) as count
      FROM tasks 
      WHERE cpName = ? 
      AND hasOpportunity = 1
    `).get(cp.name) as { count: number };

    // 3. Total Points
    const totalPoints = db.prepare(`
      SELECT SUM(points) as points
      FROM tasks 
      WHERE cpName = ? 
      AND completedAt IS NOT NULL
    `).get(cp.name) as { points: number };

    return NextResponse.json({
      todayPoints: todayStats.points || 0,
      completedToday: todayStats.count || 0,
      totalOpportunities: opportunities.count || 0,
      totalPoints: totalPoints.points || 0
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
