'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, CP } from '@/types';
import { Button, Card, Badge } from '@/components/ui';
import {
  CheckCircle, MapPin, User, Smartphone, TrendingUp, Lightbulb,
  Trophy, Calendar, MessageCircle, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { detectCarrier, getTaskDate } from '@/lib/utils';
import { Edit2, Save, X } from 'lucide-react';


type Tab = 'todo' | 'visited' | 'rescheduled' | 'no_answer' | 'opportunities';

interface CPStats {
  todayPoints: number;
  completedToday: number;
  totalOpportunities: number;
  totalPoints: number;
}

export default function CPPage() {
  const [cps, setCps] = useState<CP[]>([]);
  const [currentCp, setCurrentCp] = useState<CP | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<CPStats>({ todayPoints: 0, completedToday: 0, totalOpportunities: 0, totalPoints: 0 });
  const [activeTab, setActiveTab] = useState<Tab>('todo');
  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetContent, setEditingPresetContent] = useState<string>('');
  const dateScrollRef = useRef<HTMLDivElement>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  });

  // Form State
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [accessControlMap, setAccessControlMap] = useState<Record<string, boolean>>({});
  const [keyPersonHomeMap, setKeyPersonHomeMap] = useState<Record<string, boolean>>({});
  const [highValueMap, setHighValueMap] = useState<Record<string, boolean>>({});
  const [nonResidentMap, setNonResidentMap] = useState<Record<string, boolean>>({});
  const [opportunityMap, setOpportunityMap] = useState<Record<string, boolean>>({});
  const [opportunityNotesMap, setOpportunityNotesMap] = useState<Record<string, string>>({});
  const [pointsMap, setPointsMap] = useState<Record<string, string>>({});
  const [newInstallPointsMap, setNewInstallPointsMap] = useState<Record<string, string>>({});
  const [stockPointsMap, setStockPointsMap] = useState<Record<string, string>>({});
  const [visitResultMap, setVisitResultMap] = useState<Record<string, string>>({});
  const [competitorUserMap, setCompetitorUserMap] = useState<Record<string, boolean>>({});
  const [competitorSpendMap, setCompetitorSpendMap] = useState<Record<string, string>>({});
  const [competitorExpirationDateMap, setCompetitorExpirationDateMap] = useState<Record<string, string>>({});
  const [conversionMap, setConversionMap] = useState<Record<string, string>>({});
  const [weChatAddedMap, setWeChatAddedMap] = useState<Record<string, boolean>>({});

  const [elderlyHomeMap, setElderlyHomeMap] = useState<Record<string, boolean>>({});
  const [rescheduleTimeMap, setRescheduleTimeMap] = useState<Record<string, string>>({});
  const [residentCountMap, setResidentCountMap] = useState<Record<string, number>>({});
  const [monthlySpendingMap, setMonthlySpendingMap] = useState<Record<string, string>>({});
  const [isCompanyBillMap, setIsCompanyBillMap] = useState<Record<string, boolean>>({});
  const [activeFeedbackCategory, setActiveFeedbackCategory] = useState<string | null>(null);
  const [activeFeedbackSubCategory, setActiveFeedbackSubCategory] = useState<string | null>(null);

  // Helper to generate dates for a specific month
  const getDisplayDatesForMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const dates = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month - 1, i);
      const day = d.getDay();
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      dates.push({
        value: dateString,
        label: `${month}/${i}`,
        weekday: `周${['日', '一', '二', '三', '四', '五', '六'][day]}`,
        isToday: dateString === todayStr
      });
    }
    return dates;
  };

  const displayDates = getDisplayDatesForMonth(selectedMonth);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + offset, 1);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
    // Optionally auto-select 1st of month or today if in new month
    const today = new Date();
    const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (newMonth === todayMonth) {
      const day = String(today.getDate()).padStart(2, '0');
      setSelectedDate(`${newMonth}-${day}`);
    } else {
      setSelectedDate(`${newMonth}-01`);
    }
  };

  // Auto-scroll to today if selectedMonth is current month
  useEffect(() => {
    if (dateScrollRef.current) {
      const today = new Date();
      const todayMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      if (selectedMonth === todayMonth) {
        const todayElement = dateScrollRef.current.querySelector('[data-today="true"]');
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      } else {
        // Scroll to start of month for other months
        dateScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  }, [selectedMonth, currentCp]);

  // DateSelector component
  const DateSelector = () => (
    <div className="bg-white border-b sticky top-0 z-20">
      {/* Month Navigator */}
      <div className="flex items-center justify-between px-6 py-2 border-b bg-slate-50/50">
        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">
            {selectedMonth.split('-')[0]}年{parseInt(selectedMonth.split('-')[1])}月
          </span>
        </div>
        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Date Timeline */}
      <div ref={dateScrollRef} className="flex overflow-x-auto p-4 gap-3 scrollbar-hide">
        {displayDates.map(d => (
          <button
            key={d.value}
            data-today={d.isToday}
            onClick={(e) => {
              setSelectedDate(d.value);
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all ${selectedDate === d.value
              ? 'bg-blue-600 text-white shadow-md scale-105'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
          >
            <span className="text-[10px] font-medium opacity-80">{d.weekday}</span>
            <span className="text-sm font-bold">{d.label.split('/')[1]}</span>
            {d.isToday && <span className={`w-1 h-1 rounded-full mt-1 ${selectedDate === d.value ? 'bg-white' : 'bg-blue-600'}`}></span>}
          </button>
        ))}
      </div>
    </div>
  );

  // Helper to generate available dates (Thurs-Sun for rescheduling)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) { // Look ahead 2 weeks
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay();
      // Use local date components to avoid timezone issues
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${date}`;

      dates.push({
        value: dateString,
        label: `${d.getMonth() + 1}月${d.getDate()}日 (周${['日', '一', '二', '三', '四', '五', '六'][day]})`
      });
    }
    return dates;
  };

  const availableDates = getAvailableDates();
  const timeSlots = [
    '09:30-10:00', '10:00-10:30', '10:30-11:00', '11:00-11:30', '11:30-12:00',
    '15:30-16:00', '16:00-16:30', '16:30-17:00', '17:00-17:30', '17:30-18:00'
  ];

  const fetchTasks = useCallback(() => {
    fetch('/api/tasks').then(res => res.json()).then((data: Task[]) => {
      setTasks(data);
    });
  }, []);

  useEffect(() => {
    fetch('/api/cps').then(res => res.json()).then(setCps);
    fetch('/api/presets').then(res => res.json()).then(setDbPresets);
    fetchTasks(); // Fetch tasks immediately to filter CP list
  }, [fetchTasks]);

  const fetchStats = useCallback(() => {
    if (!currentCp) return;
    fetch(`/api/cp/stats?cpId=${currentCp.id}`).then(res => res.json()).then(setStats);
  }, [currentCp]);

  useEffect(() => {
    if (currentCp) {
      // fetchTasks(); // Already fetched on mount
      fetchStats();
    }
    // Do not clear tasks so we can maintain the filtered list
  }, [currentCp, fetchStats]);

  const handleLogin = (cpId: string) => {
    const cp = cps.find(c => c.id === cpId);
    if (cp) setCurrentCp(cp);
  };

  // Helper to infer period from time string
  const getPeriodFromTime = (timeStr: string) => {
    const hour = parseInt(timeStr.split(':')[0]);
    if (hour < 12) return '上午';
    if (hour < 18) return '下午';
    return '晚上';
  };

  const submitTask = async (taskId: string) => {
    if (!currentCp) return;

    // Construct reschedule string if needed
    let finalRescheduleTime = '';
    if (visitResultMap[taskId] === 'reschedule') {
      const date = rescheduleTimeMap[taskId]?.split(' ')[0];
      const time = rescheduleTimeMap[taskId]?.split(' ')[1];
      if (date && time) {
        const period = getPeriodFromTime(time);
        finalRescheduleTime = `${date} ${period} ${time}`;
      }
    }

    await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        cpId: currentCp.id,
        success: true,
        feedback: feedbackMap[taskId] || '',
        isAccessControlEntry: accessControlMap[taskId] || false,
        isKeyPersonHome: keyPersonHomeMap[taskId] || false,
        isHighValue: highValueMap[taskId] || false,
        isNonResident: nonResidentMap[taskId] || false,
        hasOpportunity: opportunityMap[taskId] || false,
        opportunityNotes: opportunityNotesMap[taskId] || '',
        // Total points prefer explicit input, otherwise sum of categorized
        points: (() => {
          const total = parseInt(pointsMap[taskId] || '0');
          const n = parseInt(newInstallPointsMap[taskId] || '0');
          const s = parseInt(stockPointsMap[taskId] || '0');
          return isNaN(total) || total === 0 ? (isNaN(n) ? 0 : n) + (isNaN(s) ? 0 : s) : total;
        })(),
        newInstallPoints: parseInt(newInstallPointsMap[taskId] || '0') || 0,
        stockPoints: parseInt(stockPointsMap[taskId] || '0') || 0,
        visitResult: visitResultMap[taskId] || 'success',
        isCompetitorUser: competitorUserMap[taskId] || false,
        competitorSpending: competitorSpendMap[taskId] || '',
        competitorExpirationDate: competitorExpirationDateMap[taskId] || '',
        conversionChance: conversionMap[taskId] || '',
        isWeChatAdded: weChatAddedMap[taskId] || false,
        rescheduleTime: finalRescheduleTime,

        isElderlyHome: elderlyHomeMap[taskId] || false,
        residentCount: residentCountMap[taskId] || 0,
        monthlySpending: monthlySpendingMap[taskId] || '',
        isCompanyBill: isCompanyBillMap[taskId] || false
      })
    });

    // Refresh data
    fetchTasks();
    fetchStats();
    setExpandedTaskId(null); // Close the form

    // Clear form state for this task
    const clearState = <T,>(setter: React.Dispatch<React.SetStateAction<Record<string, T>>>) =>
      setter((prev) => {
        const next = { ...prev } as Record<string, T>;
        delete next[taskId];
        return next;
      });

    clearState(setFeedbackMap);
    clearState(setAccessControlMap);
    clearState(setKeyPersonHomeMap);
    clearState(setHighValueMap);
    clearState(setNonResidentMap);
    clearState(setOpportunityMap);
    clearState(setOpportunityNotesMap);
    clearState(setPointsMap);
    clearState(setNewInstallPointsMap);
    clearState(setStockPointsMap);
    clearState(setVisitResultMap);
    clearState(setCompetitorUserMap);
    clearState(setCompetitorSpendMap);
    clearState(setCompetitorExpirationDateMap);
    clearState(setConversionMap);
    clearState(setWeChatAddedMap);
    clearState(setRescheduleTimeMap);
    clearState(setElderlyHomeMap);
    clearState(setResidentCountMap);
    clearState(setMonthlySpendingMap);
    clearState(setIsCompanyBillMap);
  };

  const getFilteredTasks = () => {
    if (!currentCp) return [];

    let filtered = tasks.filter(t => t.cpName === currentCp.name);

    // Filter by Today's Date (Strict "Today" filter as requested)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${date}`;

    filtered = filtered.filter(t => {
      // Always show if it's a reschedule for the selected date
      // Or if it's a normal task for the selected date
      const taskDate = getTaskDate(t.appointmentTime);
      return taskDate === selectedDate;
    });

    if (activeTab === 'todo') {
      // Assigned only (includes same-day reschedules)
      filtered = filtered.filter(t => t.status === 'Assigned');
    } else if (activeTab === 'visited') {
      // All tasks with submitted feedback
      filtered = filtered.filter(t => t.completedAt);
    } else if (activeTab === 'rescheduled') {
      // All reschedules (different-day or same-day)
      filtered = filtered.filter(t => t.status === 'Reschedule' || !!t.originalAppointmentTime);
    } else if (activeTab === 'no_answer') {
      // No Answer (In Progress + No Answer tag)
      filtered = filtered.filter(t =>
        t.status === 'In_Progress' &&
        t.visitResult === 'no_answer' &&
        !t.originalAppointmentTime
      );
    } else if (activeTab === 'opportunities') {
      // Has Opportunity
      filtered = filtered.filter(t => t.hasOpportunity);
    }

    // Sort: Urgent first, then by Appointment Time
    return filtered.sort((a, b) => {
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
    });
  };

  if (!currentCp) {
    // Filter CPs who have tasks TODAY
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${date}`;

    const activeCps = cps.filter(cp => {
      return tasks.some(t =>
        t.cpName === cp.name &&
        getTaskDate(t.appointmentTime) === selectedDate
      );
    });

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <DateSelector />
        <div className="p-6 flex-1 flex flex-col justify-center">
          <h1 className="text-2xl font-bold mb-6 text-center">员工登录</h1>
          <div className="space-y-4">
            {activeCps.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <p>今日暂无排班人员</p>
              </div>
            ) : (
              activeCps.map(cp => (
                <button
                  key={cp.id}
                  onClick={() => handleLogin(cp.id)}
                  className={`w-full p-4 rounded-xl text-white shadow-md flex justify-between items-center transition-transform active:scale-95 ${cp.color}`}
                >
                  <span className="text-lg font-bold">{cp.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <DateSelector />
      {/* Header & Scoreboard */}
      <div className={`${currentCp.color} text-white p-6 rounded-b-3xl shadow-lg`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{currentCp.name}</h1>
            <p className="text-white/80 text-sm">今天也要加油哦！</p>
          </div>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => setCurrentCp(null)}
          >
            退出
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <span className="font-medium">今日积分</span>
            </div>
            <div className="text-3xl font-bold">{stats.todayPoints}</div>
            <div className="text-xs text-white/70 mt-1">已完成 {stats.completedToday} 单</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-300" />
              <span className="font-medium">发现商机</span>
            </div>
            <div className="text-3xl font-bold">{stats.totalOpportunities}</div>
            <div className="text-xs text-white/70 mt-1">累计总积分 {stats.totalPoints}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-2 mx-4 -mt-6 bg-white rounded-xl shadow-md relative z-10 overflow-x-auto">
        <button
          onClick={() => setActiveTab('todo')}
          className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'todo' ? 'bg-slate-100 text-slate-900' : 'text-slate-500'}`}
        >
          待上门
        </button>
        <button
          onClick={() => setActiveTab('visited')}
          className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'visited' ? 'bg-green-50 text-green-600' : 'text-slate-500'}`}
        >
          已上门
        </button>
        <button
          onClick={() => setActiveTab('rescheduled')}
          className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'rescheduled' ? 'bg-blue-50 text-blue-600' : 'text-slate-500'}`}
        >
          已改约
        </button>
        <button
          onClick={() => setActiveTab('no_answer')}
          className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'no_answer' ? 'bg-amber-50 text-amber-600' : 'text-slate-500'}`}
        >
          无人接听
        </button>
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex-1 py-2 px-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === 'opportunities' ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
        >
          商机池
        </button>
      </div>

      {/* Task List */}
      <div className="p-4 space-y-4 mt-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>暂无相关任务</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const carrier = detectCarrier(task.phoneNumber);
            const isExpanded = expandedTaskId === task.id;
            const isCompleted = task.status === 'Completed';

            return (
              <Card key={task.id} className={`overflow-hidden transition-all ${task.priority === 'Urgent' ? 'border-l-4 border-l-red-500' : ''}`}>
                <div
                  className="p-4 cursor-pointer active:bg-slate-50"
                  onClick={() => !isCompleted && setExpandedTaskId(isExpanded ? null : task.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {task.customerName}
                        {task.priority === 'Urgent' && <Badge variant="destructive" className="h-5 text-xs">加急</Badge>}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[200px]">{task.address}</span>
                        {task.projectName && (
                          <span className="ml-2 text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">
                            {task.projectName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {task.originalAppointmentTime ? (
                        <div>
                          <div className="text-sm text-slate-400 line-through">{task.originalAppointmentTime}</div>
                          <div className="text-lg font-bold text-blue-600">→ {task.appointmentTime}</div>
                          <div className="text-xs text-slate-400">
                            {task.status === 'Reschedule' ? '已改约' : '已改约(当天)'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg font-bold text-blue-600">{task.appointmentTime}</div>
                          <div className="text-xs text-slate-400">预约时间</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <a href={`tel:${task.phoneNumber}`} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium" onClick={e => e.stopPropagation()}>
                      <Smartphone className="w-4 h-4" />
                      拨打
                    </a>
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">{carrier}</span>
                    {!isCompleted && (
                      <div className="ml-auto text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    )}
                  </div>

                  {(task.newInstallPoints || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                      <span>🆕</span>
                      <span>新装 +{task.newInstallPoints}</span>
                    </div>
                  )}
                  {(task.stockPoints || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                      <span>📦</span>
                      <span>存量 +{task.stockPoints}</span>
                    </div>
                  )}
                  {(task.newInstallPoints || 0) === 0 && (task.stockPoints || 0) === 0 && !!task.points && task.points > 0 && (
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 mt-2">
                      <span>⭐</span>
                      <span>+{task.points}</span>
                    </div>
                  )}
                  {task.adminNote && !isExpanded && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-1.5 shadow-sm">
                      <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span className="line-clamp-2 leading-relaxed">{task.adminNote}</span>
                    </div>
                  )}
                </div>

                {/* Expanded Form Area (Only for Todo tab) */}
                {
                  isExpanded && !isCompleted && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-6 animate-in slide-in-from-top-2">

                      {/* Admin Note */}
                      {task.adminNote && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800 flex gap-2">
                          <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{task.adminNote}</span>
                        </div>
                      )}

                      {/* 1. Visit Result */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">访问结果</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'success', label: '门禁已录入', icon: '✅' },
                            { id: 'reschedule', label: '需改约', icon: '🔄' },
                            { id: 'no_answer', label: '无人应答', icon: '📞' },
                            { id: 'rejected', label: '客户拒绝', icon: '🚫' },
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setVisitResultMap(prev => ({ ...prev, [task.id]: opt.id }))}
                              className={`p-3 rounded-lg border text-sm font-medium transition-all ${(visitResultMap[task.id] || 'success') === opt.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                              <span className="mr-1">{opt.icon}</span> {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dynamic Form Content */}
                      {visitResultMap[task.id] !== 'no_answer' && (
                        <div className="space-y-6 animate-in slide-in-from-top-2">

                          {/* Reschedule UI */}
                          {visitResultMap[task.id] === 'reschedule' && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> 选择改约时间
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xs text-blue-600 font-medium mb-1 block">日期</label>
                                  <select
                                    className="w-full p-2 rounded-lg border border-blue-200 text-sm"
                                    value={rescheduleTimeMap[task.id]?.split(' ')[0] || ''}
                                    onChange={e => {
                                      const time = rescheduleTimeMap[task.id]?.split(' ')[1] || '';
                                      setRescheduleTimeMap(prev => ({ ...prev, [task.id]: `${e.target.value} ${time}` }));
                                    }}
                                  >
                                    <option value="">选择日期...</option>
                                    {availableDates.map(d => (
                                      <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs text-blue-600 font-medium mb-1 block">时间段</label>
                                  <select
                                    className="w-full p-2 rounded-lg border border-blue-200 text-sm"
                                    value={rescheduleTimeMap[task.id]?.split(' ')[1] || ''}
                                    onChange={e => {
                                      const date = rescheduleTimeMap[task.id]?.split(' ')[0] || '';
                                      setRescheduleTimeMap(prev => ({ ...prev, [task.id]: `${date} ${e.target.value}` }));
                                    }}
                                  >
                                    <option value="">选择时间...</option>
                                    {timeSlots.map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="text-xs text-blue-500">
                                * 改约后任务将保留在您的列表，请按时跟进。
                              </div>
                            </div>
                          )}

                          {/* Key Info - Only for Success/Other */}
                          {(visitResultMap[task.id] === 'success' || visitResultMap[task.id] === 'other' || !visitResultMap[task.id]) && (
                            <>
                              {/* 6. Resident Profile (住户画像) - Only show when 门禁已录入 */}
                              {visitResultMap[task.id] === 'success' && (
                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                                  <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                                    <span className="text-lg">👤</span>
                                    住户画像登记
                                  </h3>
                                  <div className="space-y-3">
                                    {/* 关键人在家 */}
                                    <button
                                      onClick={() => setKeyPersonHomeMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${keyPersonHomeMap[task.id]
                                        ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                                        : 'bg-white border-purple-200 text-slate-700 hover:border-purple-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{keyPersonHomeMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>关键人在家</span>
                                      </span>
                                      {keyPersonHomeMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 高价值客户 */}
                                    <button
                                      onClick={() => setHighValueMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${highValueMap[task.id]
                                        ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                                        : 'bg-white border-amber-200 text-slate-700 hover:border-amber-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{highValueMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>高价值客户</span>
                                      </span>
                                      {highValueMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 他网用户 */}
                                    <button
                                      onClick={() => setCompetitorUserMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${competitorUserMap[task.id]
                                        ? 'bg-red-600 border-red-600 text-white shadow-md'
                                        : 'bg-white border-red-200 text-slate-700 hover:border-red-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{competitorUserMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>他网用户</span>
                                      </span>
                                      {competitorUserMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* Conditional: 他网月消费 & 策反可能性 */}
                                    {competitorUserMap[task.id] && (
                                      <div className="ml-4 space-y-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div>
                                          <label className="block text-sm font-medium text-red-900 mb-2">他网月消费/包年消费 (元)</label>
                                          <input
                                            type="text"
                                            className="w-full border-2 border-red-200 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="输入金额"
                                            value={competitorSpendMap[task.id] || ''}
                                            onChange={e => setCompetitorSpendMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-red-900 mb-2">易网到期时间</label>
                                          <input
                                            type="date"
                                            className="w-full border-2 border-red-200 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            value={competitorExpirationDateMap[task.id] || ''}
                                            onChange={e => setCompetitorExpirationDateMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-sm font-medium text-red-900 mb-2">策反可能性</label>
                                          <select
                                            className="w-full border-2 border-red-200 rounded-lg p-3 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            value={conversionMap[task.id] || ''}
                                            onChange={e => setConversionMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                          >
                                            <option value="">选择...</option>
                                            <option value="高">高</option>
                                            <option value="中">中</option>
                                            <option value="低">低</option>
                                          </select>
                                        </div>
                                      </div>
                                    )}

                                    {/* 是否已加微信 */}
                                    <button
                                      onClick={() => setWeChatAddedMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${weChatAddedMap[task.id]
                                        ? 'bg-green-600 border-green-600 text-white shadow-md'
                                        : 'bg-white border-green-200 text-slate-700 hover:border-green-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{weChatAddedMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>是否已加微信</span>
                                      </span>
                                      {weChatAddedMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 老人在家 */}
                                    <button
                                      onClick={() => setElderlyHomeMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${elderlyHomeMap[task.id]
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : 'bg-white border-blue-200 text-slate-700 hover:border-blue-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{elderlyHomeMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>只有老人住，子女不常在家</span>
                                      </span>
                                      {elderlyHomeMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 公司包话费 */}
                                    <button
                                      onClick={() => setIsCompanyBillMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${isCompanyBillMap[task.id]
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                        : 'bg-white border-indigo-200 text-slate-700 hover:border-indigo-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{isCompanyBillMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>公司包话费</span>
                                      </span>
                                      {isCompanyBillMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 不常住对象 */}
                                    <button
                                      onClick={() => setNonResidentMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                      className={`w-full p-4 rounded-lg border-2 transition-all font-medium text-left flex items-center justify-between ${nonResidentMap[task.id]
                                        ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                                        }`}
                                    >
                                      <span className="flex items-center gap-2">
                                        <span className="text-xl">{nonResidentMap[task.id] ? '✅' : '⭕'}</span>
                                        <span>不常住对象</span>
                                      </span>
                                      {nonResidentMap[task.id] && <span className="text-sm opacity-90">已选</span>}
                                    </button>

                                    {/* 额外信息输入 */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                      <div>
                                        <label className="block text-sm font-medium text-purple-900 mb-2">每月消费 (元)</label>
                                        <input
                                          type="text"
                                          className="w-full border-2 border-purple-200 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          placeholder="输入金额"
                                          value={monthlySpendingMap[task.id] || ''}
                                          onChange={e => setMonthlySpendingMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-purple-900 mb-2">居住人口 (人)</label>
                                        <input
                                          type="number"
                                          className="w-full border-2 border-purple-200 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                          placeholder="输入人数"
                                          value={residentCountMap[task.id] || ''}
                                          onChange={e => setResidentCountMap(prev => ({ ...prev, [task.id]: parseInt(e.target.value) || 0 }))}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4. Opportunity */}
                              <div className={`p-3 rounded-xl border transition-all ${opportunityMap[task.id] ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Lightbulb className={`w-5 h-5 ${opportunityMap[task.id] ? 'text-orange-500' : 'text-slate-400'}`} />
                                    <span className={`text-sm font-bold ${opportunityMap[task.id] ? 'text-orange-800' : 'text-slate-700'}`}>是否有意向</span>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={opportunityMap[task.id] || false}
                                      onChange={() => setOpportunityMap(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                  </label>
                                </div>

                                {opportunityMap[task.id] && (
                                  <div className="mt-3 pt-3 border-t border-orange-100">
                                    <input
                                      type="text"
                                      placeholder="请填写商机详情..."
                                      value={opportunityNotesMap[task.id] || ''}
                                      onChange={e => setOpportunityNotesMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      className="w-full p-2 border border-orange-200 rounded-lg text-sm focus:ring-orange-500 focus:border-orange-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </>
                          )}


                          {/* 5. Feedback & Points */}
                          <div className="space-y-3">
                            <textarea
                              placeholder="其他备注信息..."
                              value={feedbackMap[task.id] || ''}
                              onChange={e => setFeedbackMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                              className="w-full p-3 border rounded-xl text-sm h-20"
                            />

                            {/* Feedback Presets UI */}
                            <div className="bg-white border rounded-xl p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">快速填入反馈</span>
                                {(activeFeedbackCategory || activeFeedbackSubCategory) && (
                                  <button
                                    onClick={() => {
                                      setActiveFeedbackCategory(null);
                                      setActiveFeedbackSubCategory(null);
                                      setEditingPresetId(null);
                                    }}
                                    className="text-[10px] text-blue-600 font-medium"
                                  >
                                    重置
                                  </button>
                                )}
                              </div>

                              {(() => {
                                // Group presets by category
                                const categories = Array.from(new Set(dbPresets.map(p => p.category)));

                                if (!activeFeedbackCategory) {
                                  return (
                                    <div className="flex flex-wrap gap-2">
                                      {categories.map(cat => (
                                        <button
                                          key={cat}
                                          onClick={() => setActiveFeedbackCategory(cat)}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition-colors"
                                        >
                                          {cat}
                                        </button>
                                      ))}
                                    </div>
                                  );
                                }

                                const subcategories = Array.from(new Set(
                                  dbPresets.filter(p => p.category === activeFeedbackCategory).map(p => p.subcategory)
                                ));

                                if (!activeFeedbackSubCategory) {
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        <button
                                          onClick={() => setActiveFeedbackCategory(null)}
                                          className="p-1 hover:bg-slate-100 rounded flex-shrink-0"
                                        >
                                          <ChevronLeft className="w-4 h-4 text-slate-400" />
                                        </button>
                                        <span className="text-xs font-bold text-blue-600 truncate">{activeFeedbackCategory}</span>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {subcategories.map(sub => (
                                          <button
                                            key={sub}
                                            onClick={() => setActiveFeedbackSubCategory(sub)}
                                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs transition-colors"
                                          >
                                            {sub}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                }

                                const items = dbPresets.filter(
                                  p => p.category === activeFeedbackCategory && p.subcategory === activeFeedbackSubCategory
                                );

                                return (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                      <button
                                        onClick={() => {
                                          setActiveFeedbackSubCategory(null);
                                          setEditingPresetId(null);
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded flex-shrink-0"
                                      >
                                        <ChevronLeft className="w-4 h-4 text-slate-400" />
                                      </button>
                                      <span className="text-xs font-bold text-blue-600 truncate">
                                        {activeFeedbackCategory} › {activeFeedbackSubCategory}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                      {items.map((item) => (
                                        <div key={item.id} className="group relative">
                                          {editingPresetId === item.id ? (
                                            <div className="space-y-2 p-2 bg-slate-50 border border-blue-200 rounded-lg">
                                              <textarea
                                                value={editingPresetContent}
                                                onChange={(e) => setEditingPresetContent(e.target.value)}
                                                className="w-full p-2 text-xs border rounded focus:ring-1 focus:ring-blue-500 min-h-[60px]"
                                                autoFocus
                                              />
                                              <div className="flex justify-end gap-2">
                                                <button
                                                  onClick={() => setEditingPresetId(null)}
                                                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={async () => {
                                                    const res = await fetch('/api/presets', {
                                                      method: 'POST',
                                                      headers: { 'Content-Type': 'application/json' },
                                                      body: JSON.stringify({ id: item.id, content: editingPresetContent })
                                                    });
                                                    if (res.ok) {
                                                      setDbPresets(prev => prev.map(p => p.id === item.id ? { ...p, content: editingPresetContent } : p));
                                                      setEditingPresetId(null);
                                                    }
                                                  }}
                                                  className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                  <Save className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-stretch gap-1">
                                              <button
                                                onClick={() => {
                                                  const current = feedbackMap[task.id] || '';
                                                  const newValue = current ? `${current}\n${item.content}` : item.content;
                                                  setFeedbackMap(prev => ({ ...prev, [task.id]: newValue }));
                                                }}
                                                className="flex-1 p-2 text-left bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-l text-xs border border-slate-200 transition-colors"
                                              >
                                                {item.content}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingPresetId(item.id);
                                                  setEditingPresetContent(item.content);
                                                }}
                                                className="px-2 bg-slate-50 hover:bg-slate-200 border-y border-r border-slate-200 rounded-r text-slate-400 hover:text-blue-500 transition-colors"
                                              >
                                                <Edit2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                            {visitResultMap[task.id] !== 'reschedule' && (
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-bold text-slate-700 whitespace-nowrap">本次积分</span>
                                <input
                                  type="number"
                                  placeholder="总积分(可选)"
                                  value={pointsMap[task.id] || ''}
                                  onChange={e => setPointsMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  className="w-28 p-2 border rounded-lg text-sm text-center font-mono"
                                />
                                <input
                                  type="number"
                                  placeholder="新装积分"
                                  value={newInstallPointsMap[task.id] || ''}
                                  onChange={e => setNewInstallPointsMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  className="w-28 p-2 border rounded-lg text-sm text-center font-mono"
                                />
                                <input
                                  type="number"
                                  placeholder="存量积分"
                                  value={stockPointsMap[task.id] || ''}
                                  onChange={e => setStockPointsMap(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  className="w-28 p-2 border rounded-lg text-sm text-center font-mono"
                                />

                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => submitTask(task.id)}
                        className="w-full py-6 text-lg font-bold shadow-xl shadow-blue-200 rounded-xl"
                      >
                        提交反馈
                      </Button>
                    </div>
                  )
                }
              </Card>
            );
          })
        )}
      </div>
    </div >
  );
}

function ToggleBtn({ label, active, onClick, color, icon }: { label: string, active: boolean, onClick: () => void, color: string, icon: React.ReactNode }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 border-green-500 text-green-700',
    blue: 'bg-blue-50 border-blue-500 text-blue-700',
    indigo: 'bg-indigo-50 border-indigo-500 text-indigo-700',
    purple: 'bg-purple-50 border-purple-500 text-purple-700',
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${active ? colorClasses[color] : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
