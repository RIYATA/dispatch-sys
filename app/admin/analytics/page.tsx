'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { ArrowLeft, Download, TrendingUp, Users, Calendar, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { Task, CP } from '@/types';
import * as XLSX from 'xlsx';
import { PROJECTS, getTaskDate, isCompetitor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cps, setCps] = useState<CP[]>([]);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');

  // Date range filter
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  });
  const [selectedProject, setSelectedProject] = useState<string>('合富明珠');

  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  });

  useEffect(() => {
    fetch('/api/tasks').then(res => res.json()).then(setTasks);
    fetch('/api/cps').then(res => res.json()).then(setCps);
  }, []);

  // Date helpers
  const toLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const extractDate = (s?: string) => {
    if (!s) return '';
    // ISO with T
    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return toLocalDateString(d);
    }
    // YYYY-MM-DD or YYYY/MM/DD anywhere in string
    const m1 = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m1) {
      const y = m1[1];
      const mm = String(Number(m1[2])).padStart(2, '0');
      const dd = String(Number(m1[3])).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    // Chinese format: 11 月 20 日
    const m2 = s.match(/(\d+)\s*月\s*(\d+)\s*日/);
    if (m2) {
      const y = new Date().getFullYear();
      const mm = String(Number(m2[1])).padStart(2, '0');
      const dd = String(Number(m2[2])).padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    }
    // Fallbacks
    if (s.includes(' ')) return s.split(' ')[0];
    if (s.length >= 10) return s.slice(0, 10);
    return '';
  };

  // Address parsing helpers for building and floor
  const parseBuildingAndFloor = (address?: string): { building: string; floor: number | null } => {
    if (!address) return { building: '', floor: null };
    // Try to find building keywords like 栋/楼/座 and number before it
    const bMatch = address.match(/(\d+)[\s\-]*([栋楼座])/);
    let building = '';
    if (bMatch) {
      building = `${bMatch[1]}${bMatch[2]}`;
    } else {
      // Fallback: first number sequence as building
      const firstNum = address.match(/(\d{1,3})/);
      building = firstNum ? firstNum[1] : '';
    }
    // Try to find room number (3-4 digits) and deduce floor
    const roomMatch = address.match(/(\d{3,4})(?!\d)/);
    let floor: number | null = null;
    if (roomMatch) {
      const room = roomMatch[1];
      if (room.length === 4) floor = parseInt(room.slice(0, 2));
      else if (room.length === 3) floor = parseInt(room.slice(0, 1));
    }
    const floorValid: number | null = floor === null || Number.isNaN(floor) ? null : floor;
    return { building, floor: floorValid };
  };

  // Extract building letter like A/B/C from address
  const extractBuildingLetter = (address?: string): string => {
    if (!address) return '';
    const letter = address.match(/[A-Za-z](?=[座栋楼号区苑园幢])/);
    if (letter) return letter[0].toUpperCase();
    const anyLetter = address.match(/[A-Za-z]/);
    return anyLetter ? anyLetter[0].toUpperCase() : '';
  };

  // Today helpers
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const tasksToday = tasks.filter(t => extractDate(t.appointmentTime) === todayStr);
  const tasksImportedToday = tasks.filter(t => extractDate(t.submissionTime) === todayStr);

  // Tasks within the selected date range
  const rangeTasks = tasks.filter(t => {
    const date = extractDate(t.appointmentTime);
    return date >= startDate && date <= endDate;
  });

  // Determine current view task set for charts and leaderboard, filtered by project
  const viewTasks = useMemo(() => {
    const baseTasks = viewMode === 'today' ? tasksToday : rangeTasks;
    return baseTasks.filter(t => (t.projectName || '合富明珠') === selectedProject);
  }, [viewMode, tasksToday, rangeTasks, selectedProject]);

  // CP Performance Data (using current view) with categorized points
  const cpPerformance = cps.map(cp => {
    const cpTasks = viewTasks.filter(t => t.cpName === cp.name);
    const assigned = cpTasks.length;
    const completed = cpTasks.filter(t => t.completedAt).length; // Has submitted feedback
    const successRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    const newInstallPoints = cpTasks.filter(t => t.completedAt).reduce((sum, t) => sum + (t.newInstallPoints || 0), 0);
    const stockPoints = cpTasks.filter(t => t.completedAt).reduce((sum, t) => sum + (t.stockPoints || 0), 0);

    return {
      name: cp.name,
      assigned,
      completed,
      successRate,
      newInstallPoints,
      stockPoints,
      color: cp.color
    };
  }).sort((a, b) => (b.newInstallPoints + b.stockPoints) - (a.newInstallPoints + a.stockPoints));

  // Chart Data (Tasks by Status) - using current view
  const tasksByStatus = viewTasks.reduce((acc, task) => {
    const status = task.status === 'In_Progress' ? 'In Progress' : task.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: '待派单', count: tasksByStatus['Pending'] || 0 },
    { name: '已派单', count: tasksByStatus['Assigned'] || 0 },
    { name: '服务中', count: tasksByStatus['In Progress'] || 0 },
    { name: '已完成', count: tasksByStatus['Completed'] || 0 },
  ];

  // Resident profile datasets (based on completed tasks in current view)
  const completedViewTasks = viewTasks.filter(t => t.completedAt);
  const keyPersonHomeCount = completedViewTasks.filter(t => t.isKeyPersonHome).length;
  const elderlyHomeCount = completedViewTasks.filter(t => t.isElderlyHome).length;
  const highValueCount = completedViewTasks.filter(t => t.isHighValue).length;
  const weChatAddedCount = completedViewTasks.filter(t => t.isWeChatAdded).length;
  const nonResidentCount = completedViewTasks.filter(t => t.isNonResident).length;

  // Building letter proportions: today vs all
  const completedToday = tasks.filter(t => t.completedAt && extractDate(t.completedAt) === toLocalDateString(new Date()));
  const letterMapToday: Record<string, number> = {};
  completedToday.forEach(t => {
    const letter = extractBuildingLetter(t.address);
    if (letter) letterMapToday[letter] = (letterMapToday[letter] || 0) + 1;
  });
  const buildingPieToday: { name: string; value: number }[] = Object.entries(letterMapToday)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const completedAll = tasks.filter(t => t.completedAt);
  const letterMapAll: Record<string, number> = {};
  completedAll.forEach(t => {
    const letter = extractBuildingLetter(t.address);
    if (letter) letterMapAll[letter] = (letterMapAll[letter] || 0) + 1;
  });
  const buildingPieAll: { name: string; value: number }[] = Object.entries(letterMapAll)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);


  // Metric calculations for a task set
  const calcMetrics = (arr: Task[], mode: 'today' | 'all') => {
    const newInstallPointsSum = arr.filter(t => t.completedAt).reduce((sum, t) => sum + (t.newInstallPoints || 0), 0);
    const stockPointsSum = arr.filter(t => t.completedAt).reduce((sum, t) => sum + (t.stockPoints || 0), 0);
    const totalPoints = arr.filter(t => t.completedAt).reduce((sum, t) => sum + (t.points || 0), 0);
    const points = newInstallPointsSum + stockPointsSum || totalPoints;
    const appointments = arr.length;
    // Visits:
    // - Always count tasks with completedAt (提交反馈即视为已上门)
    // - Also count tasks with a visitResult that is not 'rejected' or 'reschedule'
    // For 'today' mode, include tasks completed today even if their appointment date is not today
    const isCompletedToday = (t: Task) => {
      if (!t.completedAt) return false;
      const d = toLocalDateString(new Date(t.completedAt));
      return d === todayStr;
    };
    const baseVisits = arr.filter(t => Boolean(t.completedAt) || (Boolean(t.visitResult) && t.visitResult !== 'rejected' && t.visitResult !== 'reschedule')).length;
    const todayExtra = mode === 'today'
      ? tasks.filter(t => isCompletedToday(t)).filter(t => !arr.includes(t)).length
      : 0;
    const visits = mode === 'today' ? baseVisits + todayExtra : baseVisits;
    const opportunities = arr.filter(t => t.hasOpportunity).length;
    return { points, newInstallPointsSum, stockPointsSum, appointments, visits, opportunities };
  };

  let todayMetrics = calcMetrics(tasksToday, 'today');
  let historicalMetrics = calcMetrics(rangeTasks, 'all');
  // Override appointments based on definitions
  todayMetrics = { ...todayMetrics, appointments: tasksImportedToday.length };
  historicalMetrics = { ...historicalMetrics, appointments: rangeTasks.length };

  // Calculate Battle Report Data
  const battleReportData = useMemo(() => {
    // Group tasks by CP team
    const teamStatsMap = new Map<string, {
      name: string;
      groupName: string; // e.g. "第1组"
      totalContacted: number;
      totalConverted: number; // hasOpportunity
      stockContacted: number;
      stockConverted: number;
      competitorContacted: number;
      competitorConverted: number;
      totalPoints: number;
      stockPoints: number;
      count129: number;
      promotionCount: number; // Placeholder for now
    }>();

    // Reset stats for all CPs
    cps.forEach((cp, index) => {
      teamStatsMap.set(cp.name, {
        name: cp.name,
        groupName: `第${index + 1}组`,
        totalContacted: 0,
        totalConverted: 0,
        stockContacted: 0,
        stockConverted: 0,
        competitorContacted: 0,
        competitorConverted: 0,
        totalPoints: 0,
        stockPoints: 0,
        count129: 0,
        promotionCount: 0
      });
    });

    viewTasks.forEach(t => {
      const stats = teamStatsMap.get(t.cpName);
      if (!stats) return; // Skip if CP not found or unassigned

      // "Contacted" definition: Task is completed OR visitResult is known (visited) and valid
      // Excluding 'rejected' or 'reschedule' might depend on specific business logic, 
      // but usually "Contacted" means we successfully talked to them.
      // For this report, let's assume valid visit = contacted.
      const isContacted = Boolean(t.completedAt) || (Boolean(t.visitResult) && t.visitResult !== 'reschedule');

      if (isContacted) {
        stats.totalContacted++;

        // Check Conversion (hasOpportunity)
        const isConverted = t.hasOpportunity;
        if (isConverted) stats.totalConverted++;

        // Stock vs Competitor - Determined by carrier
        const isActuallyCompetitor = isCompetitor(t.phoneNumber);
        if (isActuallyCompetitor) {
          stats.competitorContacted++;
          if (isConverted) stats.competitorConverted++;
        } else {
          // Default to Stock if not competitor (Telecom user)
          stats.stockContacted++;
          if (isConverted) stats.stockConverted++;
        }

        // Metrics
        stats.totalPoints += ((t.newInstallPoints || 0) + (t.stockPoints || 0) || t.points || 0);
        stats.stockPoints += (t.stockPoints || 0);

        // 129+ Calculation (parse monthlySpending)
        const spending = parseFloat(t.monthlySpending || '0');
        if (!isNaN(spending) && spending >= 129) {
          stats.count129++;
        }

        // Promotion count (placeholder logic, maybe based on specific tag or points)
        if (t.promotionPoints && t.promotionPoints > 0) {
          stats.promotionCount++;
        }
      }
    });

    const reportData = Array.from(teamStatsMap.values());

    // Calculate Totals
    const totals = reportData.reduce((acc, curr) => ({
      name: '合计',
      groupName: '',
      totalContacted: acc.totalContacted + curr.totalContacted,
      totalConverted: acc.totalConverted + curr.totalConverted,
      stockContacted: acc.stockContacted + curr.stockContacted,
      stockConverted: acc.stockConverted + curr.stockConverted,
      competitorContacted: acc.competitorContacted + curr.competitorContacted,
      competitorConverted: acc.competitorConverted + curr.competitorConverted,
      totalPoints: acc.totalPoints + curr.totalPoints,
      stockPoints: acc.stockPoints + curr.stockPoints,
      count129: acc.count129 + curr.count129,
      promotionCount: acc.promotionCount + curr.promotionCount
    }), {
      name: '合计', groupName: '', totalContacted: 0, totalConverted: 0,
      stockContacted: 0, stockConverted: 0, competitorContacted: 0, competitorConverted: 0,
      totalPoints: 0, stockPoints: 0, count129: 0, promotionCount: 0
    });

    return { reportData, totals };
  }, [cps, viewTasks]);

  const handleExport = () => {
    const { reportData, totals } = battleReportData;
    // 1. Prepare Data
    // Group tasks by CP team
    // This logic is now in useMemo, so we just use the result.

    // 2. Build Excel Sheet using AOA (Array of Arrays)
    const title = `${selectedProject}城东促销活动战报(${startDate}至${endDate})`;

    const headerRow1 = [
      "组别", null, null,
      "派单数", // Actual dispatched count? Image says "派单数". Let's calculate assigned count too? 
      // Wait, image col 4 is "派单数" (Dispatched) or "总触客" (Contacted)? 
      // Image col 4 is "派单数". Col 5 is "总体触客".
      // My map calculated Contacted. I need Assigned (Dispatched) too.
      "总体触客", "总体转化数", "总体转化率",
      "存量触客", "存量转化数", "存量转化率",
      "异网触客", "异网转化数", "异网转化率",
      "总体积分", "其中存量积分",
      "129+", "保全 (折算后)"
    ];

    // Re-calc dispatched for table
    const getDispatched = (cpName: string) => viewTasks.filter(t => t.cpName === cpName).length;
    const totalDispatched = viewTasks.length;

    const dataRows = reportData.map(stat => {
      const dispatched = getDispatched(stat.name);

      const calcRate = (num: number, den: number) => den > 0 ? `${Math.round((num / den) * 100)}%` : '0%';

      return [
        "城东", // Zone (fixed for now)
        stat.name,
        stat.groupName,
        dispatched,
        stat.totalContacted,
        stat.totalConverted,
        calcRate(stat.totalConverted, stat.totalContacted),
        stat.stockContacted,
        stat.stockConverted,
        calcRate(stat.stockConverted, stat.stockContacted),
        stat.competitorContacted,
        stat.competitorConverted,
        calcRate(stat.competitorConverted, stat.competitorContacted),
        stat.totalPoints,
        stat.stockPoints,
        stat.count129,
        stat.promotionCount
      ];
    });

    const footerRow = [
      "合计", null, null,
      totalDispatched,
      totals.totalContacted,
      totals.totalConverted,
      totals.totalContacted > 0 ? `${Math.round((totals.totalConverted / totals.totalContacted) * 100)}%` : '0%',
      totals.stockContacted,
      totals.stockConverted,
      totals.stockContacted > 0 ? `${Math.round((totals.stockConverted / totals.stockContacted) * 100)}%` : '0%',
      totals.competitorContacted,
      totals.competitorConverted,
      totals.competitorContacted > 0 ? `${Math.round((totals.competitorConverted / totals.competitorContacted) * 100)}%` : '0%',
      totals.totalPoints,
      totals.stockPoints,
      totals.count129,
      totals.promotionCount
    ];

    // Combine all
    const wsData = [
      [title], // Row 0: Title
      headerRow1, // Row 1: Headers
      ...dataRows,
      footerRow
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge Cells
    if (!ws['!merges']) ws['!merges'] = [];
    // Merge Title: A1 to S1 (19 columns)
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 18 } });

    // Merge "合计": A(last) to C(last)
    const lastRowIndex = wsData.length - 1;
    ws['!merges'].push({ s: { r: lastRowIndex, c: 0 }, e: { r: lastRowIndex, c: 2 } });

    // Set Column Widths
    ws['!cols'] = [
      { wch: 6 }, // A: Zone
      { wch: 15 }, // B: Team
      { wch: 8 },  // C: Group
      { wch: 8 },  // D: Dispatched
      { wch: 8 },  // E: Contacted
      { wch: 10 }, // F: Total Conv
      { wch: 10 }, // G: Total Rate
      { wch: 8 },  // H: Stock Contact
      { wch: 10 }, // I: Stock Conv
      { wch: 10 }, // J: Stock Rate
      { wch: 8 },  // K: Comp Contact
      { wch: 10 }, // L: Comp Conv
      { wch: 10 }, // M: Comp Rate
      { wch: 8 },  // N: Total Points
      { wch: 12 }, // O: Stock Points
      { wch: 6 },  // R: 129+
      { wch: 10 }  // S: Promotion
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "战报");
    XLSX.writeFile(wb, `${selectedProject}_战报_${startDate}_${endDate}.xlsx`);
  };

  const handleExportDetails = () => {
    const title = `${selectedProject}上门数据明细(${startDate}至${endDate})`;

    const headers = [
      '状态', '姓名', '电话', '地址', '楼栋', '房号',
      '预约时间', '上门人员', '上门结果',
      '积分', '新装积分', '存量积分',
      '门禁录入', '关键人在家', '老人住', '高价值', '不常住', '已加微信', '公司包话费',
      '他网用户', '他网月消费', '易网到期', '策反可能性',
      '月消费', '居住人口',
      '商机备注', '反馈', '完成时间'
    ];

    const dataRows = viewTasks.map(t => {
      const { building, floor } = parseBuildingAndFloor(t.address);
      return [
        t.status,
        t.customerName,
        t.phoneNumber,
        t.address,
        building || extractBuildingLetter(t.address),
        t.address?.match(/\d{3,4}/)?.[0] || '',
        t.appointmentTime,
        t.cpName,
        t.visitResult || '-',
        (t.newInstallPoints || 0) + (t.stockPoints || 0), // Total Points: New + Stock
        t.newInstallPoints,
        t.stockPoints,
        // User Profile Flags
        t.visitResult === 'success' ? '是' : '否',
        t.isKeyPersonHome ? '是' : '否',
        t.isElderlyHome ? '是' : '否',
        t.isHighValue ? '是' : '否',
        t.isNonResident ? '是' : '否',
        t.isWeChatAdded ? '是' : '否',
        t.isCompanyBill ? '是' : '否',
        // Competitor Info
        isCompetitor(t.phoneNumber) ? '是' : '否',
        t.competitorSpending,
        t.competitorExpirationDate,
        t.conversionChance,
        // Other Stats
        t.monthlySpending,
        t.residentCount,
        // Notes
        t.hasOpportunity ? (t.opportunityNotes || '有意向') : '',
        t.feedback ||
        (t.isCompanyBill ? '公司包话费' :
          t.isNonResident ? '在德庆不常住' :
            t.isElderlyHome ? '只有老人住，没有话事人在家' :
              t.visitResult === 'reschedule' ? '改约' :
                t.visitResult === 'rejected' ? '用户拒绝上门' :
                  t.visitResult === 'no_answer' ? '无人接电话' :
                    ((Number(t.newInstallPoints || 0) + Number(t.stockPoints || 0) > 0) || Number(t.points || 0) > 0) ? '成功' : ''),
        t.completedAt
      ];
    });

    const wsData = [
      [title],
      headers,
      ...dataRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge title
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } });

    // Column widths
    ws['!cols'] = [
      { wch: 10 }, // Status
      { wch: 10 }, // Name
      { wch: 12 }, // Phone
      { wch: 25 }, // Address
      { wch: 8 },  // Building
      { wch: 8 },  // Room
      { wch: 18 }, // Time
      { wch: 10 }, // CP
      { wch: 10 }, // Result
      { wch: 8 },  // Points
      { wch: 8 },  // New Points

      { wch: 8 },  // Stock Points
      { wch: 8 },  // Access Control
      { wch: 10 }, // Key Person
      { wch: 8 },  // Elderly
      { wch: 8 },  // High Value
      { wch: 8 },  // Non Resident
      { wch: 8 },  // WeChat
      { wch: 8 },  // Company Bill
      { wch: 8 },  // Competitor
      { wch: 12 }, // Comp Spending
      { wch: 12 }, // Comp Expire
      { wch: 10 }, // Conversion
      { wch: 10 }, // Monthly Spending
      { wch: 8 },  // Resident Count
      { wch: 25 }, // Opportunity
      { wch: 30 }, // Feedback
      { wch: 18 }  // CompletedAt
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "明细");
    XLSX.writeFile(wb, `${selectedProject}_上门数据_${startDate}_${endDate}.xlsx`);
  };

  // Build per-letter tag stats for pie tooltips
  type LetterStats = Record<string, { total: number; keyPersonHome: number; elderlyHome: number; highValue: number; nonResident: number }>;
  const buildLetterStats = (arr: Task[]): LetterStats => {
    const stats: LetterStats = {};
    arr.forEach(t => {
      if (!t.completedAt) return;
      const letter = extractBuildingLetter(t.address);
      if (!letter) return;
      if (!stats[letter]) stats[letter] = { total: 0, keyPersonHome: 0, elderlyHome: 0, highValue: 0, nonResident: 0 };
      stats[letter].total += 1;
      if (t.isKeyPersonHome) stats[letter].keyPersonHome += 1;
      if (t.isElderlyHome) stats[letter].elderlyHome += 1;
      if (t.isHighValue) stats[letter].highValue += 1;
      if (t.isNonResident) stats[letter].nonResident += 1;
    });
    return stats;
  };

  const letterStatsToday = buildLetterStats(completedToday);
  const letterStatsAll = buildLetterStats(completedAll);

  // Tooltip components for pies
  const PieTooltipBase = ({ active, payload, stats }: any) => {
    if (active && payload && payload.length) {
      const name = payload[0]?.name as string;
      const s = (stats && name && stats[name]) || { total: 0, keyPersonHome: 0, elderlyHome: 0, highValue: 0, nonResident: 0 };
      return (
        <div className="bg-white border rounded-lg shadow-sm p-3 text-xs text-slate-700">
          <div className="font-bold text-slate-900 mb-1">{name} 楼栋</div>
          <div>总数：{s.total}</div>
          <div>关键人在家：{s.keyPersonHome}</div>
          <div>老人：{s.elderlyHome}</div>
          <div>高价值：{s.highValue}</div>
          <div>不常住对象：{s.nonResident}</div>
        </div>
      );
    }
    return null;
  };

  const TodayPieTooltip = (props: any) => <PieTooltipBase {...props} stats={letterStatsToday} />;
  const AllPieTooltip = (props: any) => <PieTooltipBase {...props} stats={letterStatsAll} />;

  // Custom pie label outside the slice (props fields may be undefined per Recharts types)
  type PieLabelProps = { cx?: number; cy?: number; midAngle?: number; outerRadius?: number; percent?: number; name?: string };
  const renderPieLabel = (props: PieLabelProps) => {
    const RADIAN = Math.PI / 180;
    const cx = props.cx ?? 0;
    const cy = props.cy ?? 0;
    const midAngle = props.midAngle ?? 0;
    const outerRadius = props.outerRadius ?? 0;
    const percent = props.percent ?? 0;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pct = `${Math.round(percent * 100)}%`;
    const label = props.name ? `${props.name} ${pct}` : pct;
    return (
      <text x={x} y={y} fill="#334155" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
        {label}
      </text>
    );
  };

  // ========== FEEDBACK ANALYSIS UTILITIES ==========

  // Chinese stop words to filter out
  const STOP_WORDS = new Set([
    '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
    '你', '会', '着', '没有', '看', '好', '自己', '这', '个', '那', '什么', '为', '与', '及', '已', '已经', '还', '能',
    '把', '给', '让', '从', '但', '而', '或', '因为', '所以', '如果', '这样', '那样', '等', '等等', '比较', '非常', '一些',
    '这个', '那个', '怎么', '为什么', '可以', '应该', '他', '她', '它', '我们', '他们', '她们', '它们', '您'
  ]);

  // Simple Chinese text segmentation (extracts meaningful words/phrases)
  const segmentChinese = (text: string): string[] => {
    if (!text || text.trim() === '') return [];

    // Remove punctuation and special characters
    const cleaned = text.replace(/[，。！？；：""''（）【】《》、\.,!?;:()[\]{}<>]/g, ' ');

    // Split by whitespace
    const parts = cleaned.split(/\s+/).filter(p => p.length > 0);

    // Extract 2-4 character Chinese phrases and single meaningful words
    const keywords: string[] = [];
    parts.forEach(part => {
      // Try to extract multi-character sequences (2-4 chars)
      for (let i = 0; i < part.length; i++) {
        for (let len = 4; len >= 2; len--) {
          if (i + len <= part.length) {
            const word = part.slice(i, i + len);
            if (/^[\u4e00-\u9fa5]+$/.test(word) && !STOP_WORDS.has(word)) {
              keywords.push(word);
            }
          }
        }
        // Also capture single characters if they're meaningful
        const char = part[i];
        if (/[\u4e00-\u9fa5]/.test(char) && !STOP_WORDS.has(char) && char.length > 0) {
          keywords.push(char);
        }
      }
    });

    return keywords;
  };

  // Calculate word frequency from array of texts
  const calculateWordFrequency = (texts: string[]): Record<string, number> => {
    const frequency: Record<string, number> = {};

    texts.forEach(text => {
      const words = segmentChinese(text);
      words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });
    });

    return frequency;
  };

  // Analyze feedback from view tasks
  const analyzeFeedback = (tasks: Task[]) => {
    const completedTasks = tasks.filter(t => t.completedAt);

    // Collect all feedback and notes
    const allFeedback = completedTasks
      .map(t => t.feedback || '')
      .filter(f => f.length > 0);

    const allOpportunityNotes = completedTasks
      .filter(t => t.hasOpportunity)
      .map(t => t.opportunityNotes || '')
      .filter(n => n.length > 0);

    // Calculate frequency for feedback
    const feedbackFreq = calculateWordFrequency(allFeedback);
    const opportunityFreq = calculateWordFrequency(allOpportunityNotes);

    // Categorize by visit result
    const byVisitResult: Record<string, { count: number; feedbackTexts: string[] }> = {
      success: { count: 0, feedbackTexts: [] },
      reschedule: { count: 0, feedbackTexts: [] },
      no_answer: { count: 0, feedbackTexts: [] },
      rejected: { count: 0, feedbackTexts: [] },
      other: { count: 0, feedbackTexts: [] }
    };

    completedTasks.forEach(t => {
      const result = t.visitResult || 'other';
      if (byVisitResult[result]) {
        byVisitResult[result].count += 1;
        if (t.feedback) byVisitResult[result].feedbackTexts.push(t.feedback);
      }
    });

    // Filter out redundant keywords (substrings with same count as superstring)
    const filterRedundantKeywords = (freqMap: Record<string, number>): { word: string; count: number }[] => {
      // Convert to array and sort by length descending (longest first)
      let candidates = Object.entries(freqMap)
        .filter(([word]) => word.length >= 2)
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.word.length - a.word.length);

      const result: { word: string; count: number }[] = [];

      candidates.forEach(candidate => {
        // Check if this word is a substring of any already accepted word with the SAME count
        // If it is, it's likely just a fragment of the longer phrase
        const isRedundant = result.some(accepted =>
          accepted.word.includes(candidate.word) && accepted.count === candidate.count
        );

        if (!isRedundant) {
          result.push(candidate);
        }
      });

      // Finally sort by count descending for display
      return result.sort((a, b) => b.count - a.count);
    };

    // Get top keywords from feedback
    const topFeedbackKeywords = filterRedundantKeywords(feedbackFreq).slice(0, 10);
    const topOpportunityKeywords = filterRedundantKeywords(opportunityFreq).slice(0, 10);

    return {
      totalFeedback: allFeedback.length,
      totalOpportunityNotes: allOpportunityNotes.length,
      topFeedbackKeywords,
      topOpportunityKeywords,
      byVisitResult
    };
  };

  // Get feedback analysis for current view
  const feedbackAnalysis = analyzeFeedback(viewTasks);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" className="w-10 h-10 p-0 flex items-center justify-center">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">数据报表 (Analytics)</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border rounded-lg p-1 flex mr-3">
              {PROJECTS.map(p => (
                <button
                  key={p}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${selectedProject === p ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setSelectedProject(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="bg-white border rounded-lg p-1 flex">
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'today' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                onClick={() => {
                  setViewMode('today');
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const date = String(today.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${date}`;
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
              >
                今日实时
              </button>
              <button
                className={`px-3 py-1 rounded-md text-sm font-medium ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-slate-700'}`}
                onClick={() => setViewMode('all')}
              >
                历史累计/自定义
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 h-8 text-xs">
                <Download className="w-3 h-3 mr-2" /> 导出战报
              </Button>
              <Button onClick={handleExportDetails} variant="outline" className="text-slate-600 border-slate-300 hover:bg-slate-50 py-1 px-3 h-8 text-xs">
                <ClipboardList className="w-3 h-3 mr-2" /> 导出明细
              </Button>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Date Mode Toggle */}
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${dateMode === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => {
                    setDateMode('single');
                    // Sync dates when switching to single
                    setEndDate(startDate);
                    setViewMode('all');
                  }}
                >
                  单日查询
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${dateMode === 'range' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setDateMode('range')}
                >
                  日期范围
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">
                  {dateMode === 'single' ? '选择日期:' : '开始日期:'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setStartDate(newDate);
                    if (dateMode === 'single') {
                      setEndDate(newDate);
                    }
                    setViewMode('all');
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>

              {dateMode === 'range' && (
                <>
                  <span className="text-slate-400">—</span>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">结束日期:</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setViewMode('all');
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  const today = new Date();
                  const year = today.getFullYear();
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const date = String(today.getDate()).padStart(2, '0');
                  const todayStr = `${year}-${month}-${date}`;
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                  setViewMode('today');
                }}
                className="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
              >
                回到今天
              </button>
            </div>
          </div>
        </Card>

        {/* 今日实时数据 */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">今日实时数据</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="p-4 border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">新装积分</p>
                  <h3 className="text-2xl font-bold mt-2">{todayMetrics.newInstallPointsSum}</h3>
                </div>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-rose-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">存量积分</p>
                  <h3 className="text-2xl font-bold mt-2">{todayMetrics.stockPointsSum}</h3>
                </div>
                <div className="bg-rose-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-rose-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">预约</p>
                  <h3 className="text-2xl font-bold mt-2">{todayMetrics.appointments}</h3>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">上门</p>
                  <h3 className="text-2xl font-bold mt-2">{todayMetrics.visits}</h3>
                </div>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-pink-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">商机</p>
                  <h3 className="text-2xl font-bold mt-2">{todayMetrics.opportunities}</h3>
                </div>
                <div className="bg-pink-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* 历史累计数据 */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">历史累计数据</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Card className="p-4 border-l-4 border-l-orange-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">新装积分</p>
                  <h3 className="text-2xl font-bold mt-2">{historicalMetrics.newInstallPointsSum}</h3>
                </div>
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-rose-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">存量积分</p>
                  <h3 className="text-2xl font-bold mt-2">{historicalMetrics.stockPointsSum}</h3>
                </div>
                <div className="bg-rose-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-rose-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">预约</p>
                  <h3 className="text-2xl font-bold mt-2">{historicalMetrics.appointments}</h3>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">上门</p>
                  <h3 className="text-2xl font-bold mt-2">{historicalMetrics.visits}</h3>
                </div>
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-pink-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">商机</p>
                  <h3 className="text-2xl font-bold mt-2">{historicalMetrics.opportunities}</h3>
                </div>
                <div className="bg-pink-100 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                </div>
              </div>
            </Card>
          </div>
        </Card>

        {/* Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <Card className="p-6 lg:col-span-1">
            <h3 className="font-bold text-lg mb-6">工单状态分布</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Resident Profile */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-bold text-lg mb-4">住户画像（基于{viewMode === 'today' ? '今日' : '全库'}已完成）</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-slate-500">关键人在家</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{keyPersonHomeCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-slate-500">老人</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{elderlyHomeCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-slate-500">高价值</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{highValueCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-slate-500">已加微信</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{weChatAddedCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-white">
                <div className="text-xs text-slate-500">不常住</div>
                <div className="text-2xl font-bold text-slate-800 mt-1">{nonResidentCount}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">今日楼栋占比</h4>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<TodayPieTooltip />} />
                      <Pie data={buildingPieToday} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine label={renderPieLabel}>
                        {buildingPieToday.map((entry, index) => (
                          <Cell key={`cell-today-${index}`} fill={["#60a5fa", "#34d399", "#f472b6", "#f59e0b", "#a78bfa", "#ef4444", "#14b8a6"][index % 7]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">累计楼栋占比</h4>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<AllPieTooltip />} />
                      <Pie data={buildingPieAll} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} labelLine label={renderPieLabel}>
                        {buildingPieAll.map((entry, index) => (
                          <Cell key={`cell-all-${index}`} fill={["#60a5fa", "#34d399", "#f472b6", "#f59e0b", "#a78bfa", "#ef4444", "#14b8a6"][index % 7]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>

          {/* Personnel Performance Ranking (Replacing old CP Table) */}
          <Card className="p-6 lg:col-span-2">
            <h3 className="font-bold text-lg mb-6">人员绩效排行榜</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3 pl-6">搭档组</th>
                    <th className="p-3">接单数</th>
                    <th className="p-3">完成数</th>
                    <th className="p-3">成功率</th>
                    <th className="p-3">新装积分</th>
                    <th className="p-3">存量积分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cpPerformance.map((cp, index) => (
                    <tr key={cp.name} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-3 pl-6 font-medium flex items-center gap-3">
                        {/* Rank Indicator Bar */}
                        <div className={`w-1.5 h-8 rounded-full ${index === 0 ? 'bg-sky-500' :
                          index === 1 ? 'bg-emerald-500' :
                            index === 2 ? 'bg-purple-500' :
                              index === 3 ? 'bg-pink-500' :
                                index === 4 ? 'bg-blue-600' :
                                  index === 5 ? 'bg-indigo-500' :
                                    index === 6 ? 'bg-sky-600' :
                                      'bg-orange-500'
                          }`} />
                        <span className="text-slate-900">{index + 1}. {cp.name}</span>
                      </td>
                      <td className="p-3 text-slate-600">{cp.assigned}</td>
                      <td className="p-3 text-slate-600">{cp.completed}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${cp.successRate >= 100 ? 'bg-emerald-500' :
                          cp.successRate === 0 ? 'bg-red-500' : 'bg-red-500'
                          // Image shows 0% is Red, 100% is Green. Adjust logic to match strictly or reasonably.
                          }`}>
                          {cp.successRate}%
                        </span>
                      </td>
                      <td className="p-3 font-bold text-blue-600">{cp.newInstallPoints}</td>
                      <td className="p-3 font-bold text-red-600">{cp.stockPoints}</td>
                    </tr>
                  ))}
                  {cpPerformance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Intelligent Feedback Summary */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-6">智能反馈小结 (Intelligent Feedback Summary)</h3>

          {feedbackAnalysis.totalFeedback === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p>当前时间段暂无反馈数据</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="text-xs text-slate-500 mb-1">成功完成</div>
                  <div className="text-2xl font-bold text-blue-600">{feedbackAnalysis.byVisitResult.success.count}</div>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                  <div className="text-xs text-slate-500 mb-1">需改约</div>
                  <div className="text-2xl font-bold text-amber-600">{feedbackAnalysis.byVisitResult.reschedule.count}</div>
                </Card>
                <Card className="p-4 border-l-4 border-l-orange-500">
                  <div className="text-xs text-slate-500 mb-1">无人应答</div>
                  <div className="text-2xl font-bold text-orange-600">{feedbackAnalysis.byVisitResult.no_answer.count}</div>
                </Card>
                <Card className="p-4 border-l-4 border-l-red-500">
                  <div className="text-xs text-slate-500 mb-1">客户拒绝</div>
                  <div className="text-2xl font-bold text-red-600">{feedbackAnalysis.byVisitResult.rejected.count}</div>
                </Card>
                <Card className="p-4 border-l-4 border-l-slate-500">
                  <div className="text-xs text-slate-500 mb-1">其他</div>
                  <div className="text-2xl font-bold text-slate-600">{feedbackAnalysis.byVisitResult.other.count}</div>
                </Card>
              </div>

              {/* Keyword Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feedback Keywords */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4">高频反馈关键词 ({feedbackAnalysis.totalFeedback}条反馈)</h4>
                  {feedbackAnalysis.topFeedbackKeywords.length > 0 ? (
                    <div className="space-y-2">
                      {feedbackAnalysis.topFeedbackKeywords.map((item, index) => (
                        <div key={`feedback-${index}`} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="font-medium text-slate-700">{item.word}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-400 h-full flex items-center justify-end pr-2"
                                style={{ width: `${(item.count / feedbackAnalysis.topFeedbackKeywords[0].count) * 100}%` }}
                              >
                                <span className="text-xs text-white font-semibold">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 py-8 text-center">暂无关键词数据</div>
                  )}
                </div>

                {/* Opportunity Keywords */}
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4">商机关键词 ({feedbackAnalysis.totalOpportunityNotes}条商机)</h4>
                  {feedbackAnalysis.topOpportunityKeywords.length > 0 ? (
                    <div className="space-y-2">
                      {feedbackAnalysis.topOpportunityKeywords.map((item, index) => (
                        <div key={`opportunity-${index}`} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <div className="font-medium text-slate-700">{item.word}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full flex items-center justify-end pr-2"
                                style={{ width: `${(item.count / feedbackAnalysis.topOpportunityKeywords[0].count) * 100}%` }}
                              >
                                <span className="text-xs text-white font-semibold">{item.count}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 py-8 text-center">暂无商机关键词数据</div>
                  )}
                </div>
              </div>

              {/* Improvement Suggestions */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-100">
                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  改进建议 (Improvement Suggestions)
                </h4>
                <div className="space-y-3">
                  {/* Auto-generated suggestions based on data */}
                  {feedbackAnalysis.byVisitResult.no_answer.count > feedbackAnalysis.byVisitResult.success.count * 0.3 && (
                    <div className="flex gap-3 bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">!</div>
                      <div>
                        <div className="font-medium text-slate-800">高"无人应答"率</div>
                        <div className="text-sm text-slate-600 mt-1">
                          无人应答占比较高({Math.round((feedbackAnalysis.byVisitResult.no_answer.count / (feedbackAnalysis.byVisitResult.success.count + feedbackAnalysis.byVisitResult.no_answer.count)) * 100)}%)，建议：
                          <ul className="list-disc list-inside mt-1 ml-2">
                            <li>与客户提前电话确认上门时间</li>
                            <li>优化预约时段选择，避开客户外出高峰</li>
                            <li>增加短信或微信提醒</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {feedbackAnalysis.byVisitResult.reschedule.count > feedbackAnalysis.byVisitResult.success.count * 0.2 && (
                    <div className="flex gap-3 bg-white rounded-lg p-3 border border-amber-200">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center">!</div>
                      <div>
                        <div className="font-medium text-slate-800">改约率偏高</div>
                        <div className="text-sm text-slate-600 mt-1">
                          改约占比{Math.round((feedbackAnalysis.byVisitResult.reschedule.count / (feedbackAnalysis.byVisitResult.success.count + feedbackAnalysis.byVisitResult.reschedule.count)) * 100)}%，建议：
                          <ul className="list-disc list-inside mt-1 ml-2">
                            <li>提高首次预约时间准确性</li>
                            <li>了解客户时间偏好并做好记录</li>
                            <li>预约时充分确认客户可用时间</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {feedbackAnalysis.byVisitResult.rejected.count > 0 && (
                    <div className="flex gap-3 bg-white rounded-lg p-3 border border-red-200">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center">!</div>
                      <div>
                        <div className="font-medium text-slate-800">客户拒绝情况</div>
                        <div className="text-sm text-slate-600 mt-1">
                          有{feedbackAnalysis.byVisitResult.rejected.count}例客户拒绝，建议：
                          <ul className="list-disc list-inside mt-1 ml-2">
                            <li>分析拒绝原因，优化沟通话术</li>
                            <li>在预约阶段充分说明服务价值</li>
                            <li>针对拒绝客户制定跟进策略</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {feedbackAnalysis.byVisitResult.success.count > 0 && (
                    <div className="flex gap-3 bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold flex items-center justify-center">✓</div>
                      <div>
                        <div className="font-medium text-slate-800">成功完成率</div>
                        <div className="text-sm text-slate-600 mt-1">
                          成功完成{feedbackAnalysis.byVisitResult.success.count}单，成功率{Math.round((feedbackAnalysis.byVisitResult.success.count / Object.values(feedbackAnalysis.byVisitResult).reduce((sum, r) => sum + r.count, 0)) * 100)}%。继续保持！
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
