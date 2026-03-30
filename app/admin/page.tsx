'use client';

import { useState, useEffect, useRef } from 'react';
import { detectCarrier, getTaskDate, isCompetitor, PROJECTS } from '@/lib/utils';
import { Task, CP, Staff } from '@/types';
import { Button, Card, Badge } from '@/components/ui';
import { Upload, RefreshCw, User, Phone, MapPin, AlertCircle, BarChart2, ChevronLeft, ChevronRight, Calendar, ClipboardList, Loader2, CheckCircle2, Camera, LayoutGrid, LayoutList, Pencil, Trash2, X, Settings, Users, Smartphone, QrCode, MessageCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import * as XLSX from 'xlsx';
import Link from 'next/link';



export default function AdminPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cps, setCps] = useState<CP[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);

  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;

  });

  // Project filter state
  const [selectedProject, setSelectedProject] = useState<string>('合富明珠');

  // Historical CPs to hide after 2025-11-20
  const HISTORICAL_CPS = [
    '李锐英, 麦伟杰',
    '林海英, 何中健',
    '梁丽华, 麦金凤',
    '杨巧连, 黄伟豪'
  ];

  const filteredCps = cps.filter(cp => {
    if (selectedDate >= '2025-11-20') {
      return !HISTORICAL_CPS.includes(cp.name);
    }
    return true;
  });

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  };

  const fetchCps = async () => {
    const res = await fetch('/api/cps');
    const data = await res.json();
    setCps(data);
  };

  const fetchStaff = async () => {
    const res = await fetch('/api/staff');
    const data = await res.json();
    setStaff(data);
  };

  const exportTaskListAsImage = async () => {
    if (!taskListRef.current) return;

    setIsExporting(true);
    try {
      // @ts-ignore
      const domtoimage = (await import('dom-to-image-more')).default;
      const blob = await domtoimage.toBlob(taskListRef.current, {
        bgcolor: '#ffffff',
        scale: 2,
        style: {
          overflow: 'visible',
          maxHeight: 'none',
          height: 'auto',
          boxShadow: 'none', // Remove shadows which might render as borders
          margin: '0',
          padding: '20px' // Add some padding
        },
        filter: (node: Node) => {
          // Filter out potential problematic elements if needed
          return true;
        }
      });

      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('任务列表已复制到剪贴板！您可以在微信/QQ等应用中直接粘贴');
        } catch (err) {
          console.error('Failed to copy image:', err);
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `任务列表-${selectedCpForView?.name}-${new Date().toLocaleDateString()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert('图片已下载到本地，请查收！');
        }
      }
      setIsExporting(false);
    } catch (error: any) {
      console.error('Export error:', error);
      alert(`导出失败: ${error.message || '未知错误'}，请尝试刷新页面后重试`);
      setIsExporting(false);
    }
  };


  // Helper: Get CP color
  const getCpColor = (cpName: string) => {
    const cp = cps.find(c => c.name === cpName);
    return cp?.color || 'bg-slate-500';
  };

  // Task Management Handlers
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？此操作不可恢复！')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('任务删除成功');
        fetchData();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除出错');
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: editingTask.customerName,
          phoneNumber: editingTask.phoneNumber,
          address: editingTask.address,
          appointmentTime: editingTask.appointmentTime,
          adminNote: editingTask.adminNote,
          cpName: editingTask.cpName,
          status: editingTask.status,
          priority: editingTask.priority,
          visitResult: editingTask.visitResult,
          points: editingTask.points,
          newInstallPoints: editingTask.newInstallPoints,
          stockPoints: editingTask.stockPoints,

          isKeyPersonHome: editingTask.isKeyPersonHome,
          isAccessControlEntry: editingTask.isAccessControlEntry,
          hasOpportunity: editingTask.hasOpportunity,
          opportunityNotes: editingTask.opportunityNotes,
          isWeChatAdded: editingTask.isWeChatAdded,
          isHighValue: editingTask.isHighValue,
          isCompetitorUser: editingTask.isCompetitorUser,
          competitorSpending: editingTask.competitorSpending,
          conversionChance: editingTask.conversionChance,
          carrierInfo: editingTask.carrierInfo,
          competitorExpirationDate: editingTask.competitorExpirationDate,
          isNonResident: editingTask.isNonResident,
          isElderlyHome: editingTask.isElderlyHome,
          projectName: editingTask.projectName,
          actualStaffIds: editingTask.actualStaffIds || []
        })
      });

      if (res.ok) {
        alert('任务更新成功');
        setIsEditModalOpen(false);
        setEditingTask(null);
        fetchData();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('更新出错');
    }
  };

  const handleReassign = async (taskId: string, newCpId: string) => {
    await fetch('/api/tasks/reassign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, newCpId })
    });
    setReassigningTaskId(null);
    fetchTasks();
  };

  const fetchData = async () => {
    setLoading(true);
    const [tasksRes, cpsRes] = await Promise.all([
      fetch('/api/tasks'),
      fetch('/api/cps')
    ]);
    setTasks(await tasksRes.json());
    setCps(await cpsRes.json());
    fetchStaff();
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const parseStaffNames = (teamName: string) => {
    return teamName
      .split(/[，,、/]/)
      .map(n => n.trim())
      .filter(Boolean);
  };

  const openTeamMembersModal = async (cp: CP) => {
    setTeamEditCp(cp);
    try {
      const res = await fetch(`/api/teams/members?teamId=${cp.id}`);
      const data = await res.json();
      setTeamMemberIds(data.staffIds || []);
      setIsTeamMembersOpen(true);
    } catch (e) {
      console.error('Failed to load team members', e);
      alert('加载成员失败');
    }
  };

  const saveTeamMembers = async () => {
    if (!teamEditCp) return;
    try {
      const res = await fetch('/api/teams/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: teamEditCp.id, staffIds: teamMemberIds })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '保存失败');
        return;
      }
      setIsTeamMembersOpen(false);
      setTeamEditCp(null);
    } catch (e) {
      console.error('Failed to save team members', e);
      alert('保存失败');
    }
  };

  const startEditNote = (task: Task) => {
    setNoteEditTaskId(task.id);
    setNoteEditValue(task.adminNote || '');
  };

  const cancelEditNote = () => {
    setNoteEditTaskId(null);
    setNoteEditValue('');
  };

  const saveEditNote = async () => {
    if (!noteEditTaskId) return;
    setNoteSavingTaskId(noteEditTaskId);
    try {
      const res = await fetch('/api/tasks/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: noteEditTaskId, adminNote: noteEditValue })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '保存失败');
        return;
      }
      setTasks(prev => prev.map(t => t.id === noteEditTaskId ? { ...t, adminNote: noteEditValue } : t));
      cancelEditNote();
    } catch (e) {
      console.error('Failed to save note', e);
      alert('保存失败');
    } finally {
      setNoteSavingTaskId(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      // Process and upload
      data.forEach(async (row: any) => {
        // Map WPS columns to our schema
        const payload = {
          formId: row['填写ID'],
          submissionTime: row['提交时间'],
          customerName: row['请输入姓名'],
          phoneNumber: row['请输入您的手机号'],
          address: `${row['请选择您的楼'] || ''} ${row['请输入您的房间号码'] || ''}`,
          appointmentTime: row['请选择上门服务时日'],
          priority: 'Normal', // Default
          projectName: selectedProject
        };

        await fetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      });

      setTimeout(fetchData, 1000); // Refresh after import
    };
    reader.readAsBinaryString(file);
  };

  const assignTask = async (taskId: string, cpId: string) => {
    // TODO: Implement assignment API
    alert(`Assign task ${taskId} to CP ${cpId}`);
  };

  const toggleUrgency = async (taskId: string, currentPriority: string) => {
    const newPriority = currentPriority === 'Urgent' ? 'Normal' : 'Urgent';
    await fetch('/api/tasks/urgency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        priority: newPriority
      }),
    });
    fetchData();
  };

  const [timeFilter, setTimeFilter] = useState<'All' | '上午' | '下午' | '晚上'>('All');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dispatchNote, setDispatchNote] = useState('');
  const [dispatchPriority, setDispatchPriority] = useState('Normal');
  const [selectedCpId, setSelectedCpId] = useState('');
  const [selectedCpForView, setSelectedCpForView] = useState<CP | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // Mobile Access State
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [localIp, setLocalIp] = useState('');

  const handleOpenMobileAccess = async () => {
    try {
      const res = await fetch('/api/network');
      const data = await res.json();
      setLocalIp(data.ip);
      setMobileModalOpen(true);
    } catch (e) {
      console.error('Failed to get IP', e);
      alert('无法获取本机IP');
    }
  };

  const taskListRef = useRef<HTMLDivElement>(null);

  // View Mode State
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'personnel'>('board');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'paste' | 'manual'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [manualRows, setManualRows] = useState<ImportRow[]>([
    { id: '1', name: '', phone: '', building: '', room: '', time: '', period: '', note: '', date: '', timePeriod: '', priority: 'Normal' }
  ]);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[] | null>(null);
  const [importTargetStatus, setImportTargetStatus] = useState<'Auto' | 'Pending' | 'Assigned' | 'Completed'>('Auto');
  const [importing, setImporting] = useState(false);

  // Import Row Type
  type ImportRow = {
    id: string;
    name: string;
    phone: string;
    building: string;
    room: string;
    time: string;
    period: string;
    note: string;
    error?: string;
    date?: string;
    timePeriod?: string;
    priority?: 'Normal' | 'Urgent';
    cp?: string;
    accessControl?: string;
    success?: string;
    points?: string;
    rawArray?: any[];
    projectName?: string;
  };

  type DuplicateConflict = {
    phoneNumber: string;
    existingTask: Task;
    newRow: ImportRow;
    resolution?: 'skip' | 'replace' | 'keep';
  };

  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<DuplicateConflict[]>([]);
  const [pendingRows, setPendingRows] = useState<ImportRow[]>([]);
  const [isCpManagerOpen, setIsCpManagerOpen] = useState(false);
  const [cpFilter, setCpFilter] = useState<'all' | 'active' | 'idle'>('all');
  const [isTeamMembersOpen, setIsTeamMembersOpen] = useState(false);
  const [teamEditCp, setTeamEditCp] = useState<CP | null>(null);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [noteEditTaskId, setNoteEditTaskId] = useState<string | null>(null);
  const [noteEditValue, setNoteEditValue] = useState('');
  const [noteSavingTaskId, setNoteSavingTaskId] = useState<string | null>(null);

  // Helper to parse complex time string
  const parseComplexTime = (rawStr: string) => {
    const result = { date: '', period: '', time: '' };
    if (!rawStr) return result;

    // 1. Extract Date (MM.DD, MM/DD, MM月DD日)
    // Matches: 11.20, 11/20, 11月20日, 2025-11-20
    const dateMatch = rawStr.match(/(\d{4})?[-./年]?\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*[日]?/);
    if (dateMatch) {
      const year = dateMatch[1] || new Date().getFullYear();
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      result.date = `${year}-${month}-${day}`;
    } else {
      // Default to selectedDate if no date found in string
      result.date = selectedDate;
    }

    // 2. Extract Period (上午, 下午, 晚上)
    const periodMatch = rawStr.match(/(上午|下午|晚上|全天)/);
    if (periodMatch) {
      result.period = periodMatch[1];
    }

    // 3. Extract Time Range (15:00-17:30, 15:00)
    const timeMatch = rawStr.match(/(\d{1,2}:\d{2}(?:-\d{1,2}:\d{2})?)/);
    if (timeMatch) {
      result.time = timeMatch[1];

      // If period is missing but we have time, infer it
      if (!result.period) {
        const startHour = parseInt(result.time.split(':')[0]);
        if (startHour < 12) result.period = '上午';
        else if (startHour < 18) result.period = '下午';
        else result.period = '晚上';
      }
    }

    return result;
  };

  // Parse text to rows (Adaptive sequence: handles Name, Time, Phone, Building, Room sequence)
  const parseTextToRows = (text: string): ImportRow[] => {
    if (!text.trim()) return [];

    const lines = text.trim().split('\n').filter(line => line.trim());
    const rows: ImportRow[] = [];

    lines.forEach((line, index) => {
      // Skip common header strings
      if (line.includes('姓名') || line.includes('手机号') || line.includes('预约时间')) return;

      // Detect delimiter: tab > comma > space
      let parts: string[];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes(',')) {
        parts = line.split(',');
      } else {
        parts = line.split(/\s+/);
      }

      // Clean up parts
      parts = parts.map(p => p.trim());

      if (parts.length >= 2) {
        // Source data sequence: 1.姓名, 2.预约内容/时间, 3.电话, 4.楼栋, 5.房号, 6.备注...
        const name = parts[0] || '';
        const rawTimeContent = parts[1] || '';
        const phone = parts[2] || '';
        const building = parts[3] || '';
        const room = parts[4] || '';
        const note = parts[5] || '';
        const priorityStr = parts[6] || '';

        // Parse time/date from the 2nd column (rawTimeContent)
        const parsedTimeInfo = parseComplexTime(rawTimeContent);

        // Normalize time to match manual entry options (9:30-11:30, 15:30-18:00, 18:00-20:30)
        const timeMapping: Record<string, string> = {
          '上午': '9:30-11:30',
          '下午': '15:30-18:00',
          '晚上': '18:00-20:30'
        };
        const normalizedTime = timeMapping[parsedTimeInfo.period] || parsedTimeInfo.time || rawTimeContent;

        // Priority detection
        const isUrgent = priorityStr.includes('加急') || priorityStr.toLowerCase().includes('urgent') || priorityStr === '1' || priorityStr.includes('是');

        rows.push({
          id: `paste-${index}`,
          name,
          phone,
          building,
          room,
          time: normalizedTime, // Use mapped time range
          period: parsedTimeInfo.period || '',
          note,
          date: parsedTimeInfo.date || selectedDate,
          priority: isUrgent ? 'Urgent' : 'Normal',
          projectName: selectedProject
        });
      }
    });

    return rows;
  };

  // Validate import row
  const validateRow = (row: ImportRow): string => {
    if (!row.name) return '姓名不能为空';
    if (!row.phone) return '电话不能为空';
    if (!/^1\d{10}$/.test(row.phone)) return '电话格式错误';
    if (!row.building) return '楼栋不能为空';
    if (!row.room) return '房间号不能为空';
    if (!row.time) return '预约时间不能为空';
    return '';
  };

  // Handle paste import
  const handlePasteImport = () => {
    const parsed = parseTextToRows(pasteText);
    const validated = parsed.map(row => ({
      ...row,
      error: validateRow(row)
    }));
    setImportPreview(validated);
  };

  // Handle manual row changes
  const updateManualRow = (id: string, field: keyof ImportRow, value: string) => {
    setManualRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addManualRow = () => {
    setManualRows(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '',
      phone: '',
      building: '',
      room: '',
      time: '',
      period: '',
      note: '',
      date: '',
      timePeriod: '',
      priority: 'Normal',
      projectName: selectedProject
    }]);
  };

  const removeManualRow = (id: string) => {
    setManualRows(prev => {
      if (prev.length > 1) {
        return prev.filter(row => row.id !== id);
      } else {
        // If it's the last row, clear it instead of removing
        return prev.map(row =>
          row.id === id ? {
            id: row.id,
            name: '',
            phone: '',
            building: '',
            room: '',
            time: '',
            period: '',
            note: '',
            date: '',
            timePeriod: '',
            priority: 'Normal',
            projectName: selectedProject
          } : row
        );
      }
    });
  };

  const handleManualImport = () => {
    const validated = manualRows
      .filter(row => row.name || row.phone) // Only validate non-empty rows
      .map(row => {
        // Generate time from date and period/time if available
        let finalTime = row.time;
        if (row.date && row.period && row.time) {
          finalTime = `${row.date} ${row.period} ${row.time}`;
        } else if (row.date && row.timePeriod) {
          const timeMap: Record<string, string> = {
            '上午': '09:30',
            '下午': '15:30',
            '晚上': '18:00'
          };
          finalTime = `${row.date} ${row.timePeriod} ${timeMap[row.timePeriod] || '09:30'}`;
        }

        return {
          ...row,
          error: validateRow({ ...row, time: finalTime })
        };
      });
    setImportPreview(validated);
  };

  // Submit import
  const submitImport = async () => {
    // For file upload, import all rows; for manual/paste, only import valid rows
    const rowsToImport = importPreview.filter(row => row.name && row.phone);

    if (rowsToImport.length === 0) {
      alert('没有可导入的数据（至少需要姓名和电话）');
      return;
    }

    setImporting(true);

    // Check for duplicates
    try {
      const phoneNumbers = rowsToImport.map(r => r.phone);
      const checkRes = await fetch('/api/tasks/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumbers })
      });
      const { duplicates } = await checkRes.json();

      if (duplicates && duplicates.length > 0) {
        const newConflicts: DuplicateConflict[] = duplicates.map((d: any) => ({
          phoneNumber: d.phoneNumber,
          existingTask: d.existingTask,
          newRow: rowsToImport.find(r => r.phone === d.phoneNumber)!,
          resolution: 'skip' // Default to skip
        }));

        setConflicts(newConflicts);
        setPendingRows(rowsToImport);
        setDuplicateModalOpen(true);
        setImporting(false);
        return;
      }

      // No duplicates, proceed directly
      await executeImport(rowsToImport);

    } catch (error) {
      console.error('Import check error:', error);
      alert('检查重复数据时出错，请重试');
      setImporting(false);
    }
  };

  const executeImport = async (rows: ImportRow[]) => {
    let importedCount = 0;
    let dateMismatchCount = 0;

    for (const row of rows) {
      // Construct appointmentTime from parsed fields if available
      let finalAppointmentTime = row.time || new Date().toISOString();

      if (row.date) {
        // Combine date, period, and time into a single string
        // Format: "YYYY-MM-DD Period Time" (e.g. "2025-11-20 下午 15:00-17:30")
        const parts = [row.date];
        if (row.period) parts.push(row.period);
        if (row.time && row.time !== row.date) parts.push(row.time); // Avoid duplicating if time is just date

        finalAppointmentTime = parts.join(' ');
      } else {
        // Fallback: try to parse date from the raw time string
        const parsedDate = getTaskDate(finalAppointmentTime);
        if (parsedDate && parsedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          if (!finalAppointmentTime.includes(parsedDate)) {
            finalAppointmentTime = parsedDate;
          }
        } else {
          // If no date found, use the currently selected date
          finalAppointmentTime = `${selectedDate} ${finalAppointmentTime}`;
        }
      }

      const isSuccess = row.success && (row.success.includes('是') || row.success.includes('成功') || row.success.toLowerCase() === 'yes');

      let status = 'Pending';
      if (importTargetStatus === 'Auto') {
        if (isSuccess) {
          status = 'Completed';
        } else if (row.cp) {
          // Smart Auto:
          // If task is in the past, assume it was assigned.
          // If task is today or future, assume it's a draft assignment (Pending).
          const taskDate = getTaskDate(finalAppointmentTime);
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          if (taskDate < todayStr) {
            status = 'Assigned';
          } else {
            status = 'Pending';
          }
        } else {
          status = 'Pending';
        }
      } else {
        status = importTargetStatus;
      }

      const completedAt = (status === 'Completed' || isSuccess) ? (row.date ? `${row.date} ${row.time ? row.time.split('-')[0] : '00:00'}` : new Date().toISOString()) : undefined;
      const points = row.points ? parseInt(row.points.replace(/\D/g, '')) || 0 : 0;
      const isAccessControlEntry = row.accessControl && (row.accessControl.includes('是') || row.accessControl.includes('已') || row.accessControl.toLowerCase() === 'yes');

      const payload = {
        customerName: row.name,
        phoneNumber: row.phone,
        address: `${row.building || ''} ${row.room || ''}`.trim(),
        appointmentTime: finalAppointmentTime,
        submissionTime: new Date().toISOString(),
        status: status,
        cpName: row.cp || '', // Use imported CP name if available
        priority: row.priority || 'Normal',
        adminNote: row.note || '',
        points: points,
        isAccessControlEntry: isAccessControlEntry,
        completedAt: completedAt,
        projectName: row.projectName || selectedProject,
        isCompetitorUser: isCompetitor(row.phone),
        carrierInfo: detectCarrier(row.phone)
      };

      // Check if task date matches selected date
      const taskDate = getTaskDate(payload.appointmentTime);
      if (taskDate !== selectedDate) {
        dateMismatchCount++;
      }

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      importedCount++;
    }

    setImporting(false);
    setImportModalOpen(false);
    setPasteText('');
    setManualRows([{ id: '1', name: '', phone: '', building: '', room: '', time: '', period: '', note: '', date: '', timePeriod: '', priority: 'Normal', projectName: selectedProject }]);
    setImportPreview([]);
    fetchData();

    let message = `成功导入 ${importedCount} 条数据`;
    if (dateMismatchCount > 0) {
      message += `\n\n⚠️ 注意：有 ${dateMismatchCount} 条任务的预约日期不是今天(${selectedDate})，\n请切换日期查看这些任务。`;
    }
    alert(message);
  };

  const handleConfirmDuplicateResolution = async () => {
    setImporting(true);

    const tasksToDelete: string[] = [];
    const phonesToSkip: string[] = [];

    for (const conflict of conflicts) {
      if (conflict.resolution === 'replace') {
        tasksToDelete.push(conflict.existingTask.id);
      } else if (conflict.resolution === 'skip') {
        phonesToSkip.push(conflict.phoneNumber);
      }
      // 'keep' means do nothing (import new, keep old)
    }

    // Delete replaced tasks
    if (tasksToDelete.length > 0) {
      await Promise.all(tasksToDelete.map(id =>
        fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      ));
    }

    // Filter rows to import
    const finalRows = pendingRows.filter(r => !phonesToSkip.includes(r.phone));

    setDuplicateModalOpen(false);
    await executeImport(finalRows);
  };

  // Clear all tasks
  const clearAllTasks = async () => {
    if (!confirm('确定要清空所有任务数据吗？此操作不可恢复！')) {
      return;
    }

    try {
      const response = await fetch('/api/tasks/clear', {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert('清空失败：' + result.error);
      }
    } catch (error) {
      alert('清空失败，请重试');
      console.error('Clear error:', error);
    }
  };

  const openDispatchModal = (task: Task) => {
    setSelectedTask(task);
    setDispatchPriority(task.priority);
    setDispatchNote(task.adminNote || '');
    setSelectedCpId('');
    setDispatchModalOpen(true);
  };

  const handleDispatch = async () => {
    if (!selectedTask || !selectedCpId) return;

    await fetch('/api/tasks/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: selectedTask.id,
        cpId: selectedCpId,
        adminNote: dispatchNote,
        priority: dispatchPriority
      })
    });

    setDispatchModalOpen(false);
    setDispatchNote('');
    fetchData();
  };

  // Date navigation helpers
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const date = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${date}`);
  };

  const goToToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${date}`);
  };

  // Helper to parse date from appointmentTime
  const getTaskDate = (timeStr: string | null) => {
    if (!timeStr) return '';

    // Try YYYY-MM-DD first
    const isoMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // Try MM月DD日
    const cnMatch = timeStr.match(/(\d+)\s*月\s*(\d+)\s*日/);
    if (cnMatch) {
      const month = cnMatch[1].padStart(2, '0');
      const day = cnMatch[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }

    // Try MM.DD or MM/DD or MM-DD (without year)
    const shortMatch = timeStr.match(/^(\d{1,2})[.\/-](\d{1,2})/);
    if (shortMatch) {
      const month = shortMatch[1].padStart(2, '0');
      const day = shortMatch[2].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }

    return timeStr.split(' ')[0];
  };

  // Filter tasks by selected date
  // Pending and Assigned: by appointmentTime
  // Completed: by completedAt (when they finished)
  const pendingTasks = tasks.filter(t => {
    // Filter by Project
    if ((t.projectName || '合富明珠') !== selectedProject) return false;

    if (t.status !== 'Pending') return false;
    const taskDate = getTaskDate(t.appointmentTime);
    return taskDate === selectedDate;
  });

  const filteredPendingTasks = timeFilter === 'All'
    ? pendingTasks
    : pendingTasks.filter(t => t.appointmentTime?.includes(timeFilter));

  const assignedTasks = tasks.filter(t => {
    // Filter by Project
    if ((t.projectName || '合富明珠') !== selectedProject) return false;

    if (!(t.status === 'Assigned' || t.status === 'In_Progress' || t.status === 'Reschedule')) return false;
    const taskDate = getTaskDate(t.appointmentTime);
    return taskDate === selectedDate;
  });

  const completedTasks = tasks.filter(t => {
    // Filter by Project
    if ((t.projectName || '合富明珠') !== selectedProject) return false;


    // Include both Completed and Failure (User Rejected)
    if (t.status !== 'Completed' && t.status !== 'Failure') return false; // Must have submitted feedback


    // Filter by Appointment Time (Show tasks scheduled for today that are completed)
    // instead of tasks completed today
    const taskDate = getTaskDate(t.appointmentTime);
    return taskDate === selectedDate;
  });

  // Calculate statistics
  // Today's stats: tasks completed today (by completedAt date)
  const todayStats = {
    points: completedTasks.reduce((sum, t) => sum + (t.points || 0), 0),
    tasks: completedTasks.length
  };

  // Total stats: all historical data
  const totalStats = {
    points: tasks.filter(t => t.completedAt).reduce((sum, t) => sum + (t.points || 0), 0),
    tasks: tasks.length
  };

  const getResultLabel = (result: string) => {
    const map: Record<string, string> = {
      'success': '成功完成',
      'reschedule': '需改约',
      'no_answer': '无人应答',
      'rejected': '客户拒绝',
      'other': '其他'
    };
    return map[result] || result;
  };

  const getResultColor = (result: string) => {
    const map: Record<string, string> = {
      'success': 'bg-green-100 text-green-700',
      'reschedule': 'bg-blue-100 text-blue-700',
      'no_answer': 'bg-yellow-100 text-yellow-700',
      'rejected': 'bg-red-100 text-red-700',
      'other': 'bg-slate-100 text-slate-700'
    };
    return map[result] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 relative" >
      {/* Duplicate Resolution Modal */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-[900px] max-h-[80vh] flex flex-col shadow-2xl text-slate-900">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="text-orange-500" />
                发现 {conflicts.length} 条重复数据
              </h2>
              <button onClick={() => setDuplicateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-lg">{conflict.newRow.name} <span className="text-slate-500 text-sm font-normal">({conflict.phoneNumber})</span></div>
                      <div className="flex bg-white rounded-lg border p-1">
                        <button
                          onClick={() => {
                            const newConflicts = [...conflicts];
                            newConflicts[index].resolution = 'skip';
                            setConflicts(newConflicts);
                          }}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${conflict.resolution === 'skip' ? 'bg-slate-200 font-bold' : 'hover:bg-slate-50'}`}
                        >
                          保留旧数据 (跳过)
                        </button>
                        <button
                          onClick={() => {
                            const newConflicts = [...conflicts];
                            newConflicts[index].resolution = 'replace';
                            setConflicts(newConflicts);
                          }}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${conflict.resolution === 'replace' ? 'bg-red-100 text-red-700 font-bold' : 'hover:bg-slate-50'}`}
                        >
                          使用新数据 (覆盖)
                        </button>
                        <button
                          onClick={() => {
                            const newConflicts = [...conflicts];
                            newConflicts[index].resolution = 'keep';
                            setConflicts(newConflicts);
                          }}
                          className={`px-3 py-1 rounded-md text-sm transition-colors ${conflict.resolution === 'keep' ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}
                        >
                          保留两者 (新增)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-3 rounded border ${conflict.resolution === 'skip' ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase">现有数据 (旧)</div>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-slate-500">姓名:</span> {conflict.existingTask.customerName}</div>
                          <div><span className="text-slate-500">地址:</span> {conflict.existingTask.address}</div>
                          <div><span className="text-slate-500">时间:</span> {conflict.existingTask.appointmentTime}</div>
                          <div><span className="text-slate-500">状态:</span> {conflict.existingTask.status}</div>
                          <div><span className="text-slate-500">CP:</span> {conflict.existingTask.cpName || '未分配'}</div>
                        </div>
                      </div>
                      <div className={`p-3 rounded border ${conflict.resolution === 'replace' || conflict.resolution === 'keep' ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
                        <div className="text-xs font-bold text-slate-500 mb-2 uppercase">导入数据 (新)</div>
                        <div className="space-y-1 text-sm">
                          <div><span className="text-slate-500">姓名:</span> {conflict.newRow.name}</div>
                          <div><span className="text-slate-500">地址:</span> {conflict.newRow.building} {conflict.newRow.room}</div>
                          <div><span className="text-slate-500">时间:</span> {conflict.newRow.time}</div>
                          <div><span className="text-slate-500">备注:</span> {conflict.newRow.note || '-'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <div className="text-sm text-slate-500">
                批量操作:
                <button onClick={() => setConflicts(prev => prev.map(c => ({ ...c, resolution: 'skip' })))} className="ml-2 text-blue-600 hover:underline">全部跳过</button>
                <button onClick={() => setConflicts(prev => prev.map(c => ({ ...c, resolution: 'replace' })))} className="ml-2 text-blue-600 hover:underline">全部覆盖</button>
                <button onClick={() => setConflicts(prev => prev.map(c => ({ ...c, resolution: 'keep' })))} className="ml-2 text-blue-600 hover:underline">全部新增</button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDuplicateModalOpen(false)}>取消导入</Button>
                <Button onClick={handleConfirmDuplicateResolution} className="bg-blue-600 text-white">确认并继续</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ... (Dispatch Modal & Header remain same) ... */}
      {dispatchModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] shadow-2xl max-h-[85vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4 shrink-0">派单给...</h2>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 shrink-0">
              <div className="font-medium text-slate-900 mb-1">{selectedTask.customerName}</div>
              <div>{selectedTask.address}</div>
              <div>{selectedTask.appointmentTime}</div>
              {selectedTask.adminNote && (
                <div className="mt-2 text-amber-600 font-medium">备注: {selectedTask.adminNote}</div>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">选择搭档组</label>
                <div className="grid grid-cols-2 gap-2">
                  {filteredCps.map(cp => {
                    const activeCount = tasks.filter(t => (t.status === 'Assigned' || t.status === 'In_Progress') && t.cpName === cp.name).length;
                    const isSelected = selectedCpId === cp.id;
                    const isBusy = activeCount > 0;

                    return (
                      <button
                        key={cp.id}
                        onClick={() => setSelectedCpId(cp.id)}
                        className={`p-3 rounded-lg border text-left transition-all relative ${isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02] z-10'
                          : isBusy
                            ? 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-300 hover:text-slate-600'
                            : 'bg-white border-slate-200 text-slate-900 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className={`font-bold text-sm ${isSelected ? 'text-white' : isBusy ? 'text-slate-500' : 'text-slate-900'}`}>
                            {cp.name}
                          </div>
                          {!isBusy && !isSelected && (
                            <span className="flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-blue-100' : isBusy ? 'text-slate-400' : 'text-green-600 font-medium'}`}>
                          {activeCount > 0 ? `${activeCount}单进行中` : '空闲 (推荐)'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">加急状态</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDispatchPriority('Normal')}
                    className={`flex-1 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 ${dispatchPriority === 'Normal'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${dispatchPriority === 'Normal' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                    普通
                  </button>
                  <button
                    onClick={() => setDispatchPriority('Urgent')}
                    className={`flex-1 py-2.5 rounded-lg border transition-all duration-200 flex items-center justify-center gap-2 ${dispatchPriority === 'Urgent'
                      ? 'bg-red-50 border-red-500 text-red-700 font-bold ring-1 ring-red-500'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${dispatchPriority === 'Urgent' ? 'bg-red-500' : 'bg-slate-300'}`} />
                    加急
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">给CP留言 (可选)</label>
                <textarea
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
                  placeholder="输入需要注意的事项..."
                  value={dispatchNote}
                  onChange={e => setDispatchNote(e.target.value)}
                />
              </div>
            </div>


            <div className="flex justify-end gap-3 mt-6 pt-4 border-t shrink-0">
              <Button variant="outline" onClick={() => setDispatchModalOpen(false)}>取消</Button>
              <Button
                onClick={handleDispatch}
                disabled={!selectedCpId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                确认派单
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {
        isEditModalOpen && editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl bg-white shadow-xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" /> 编辑任务
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">基本信息</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">客户姓名</label>
                        <input
                          type="text"
                          required
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingTask.customerName}
                          onChange={e => setEditingTask({ ...editingTask, customerName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">电话号码</label>
                        <input
                          type="tel"
                          required
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingTask.phoneNumber}
                          onChange={e => setEditingTask({ ...editingTask, phoneNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">地址</label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.address}
                        onChange={e => setEditingTask({ ...editingTask, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">预约时间</label>
                      <input
                        type="text"
                        required
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.appointmentTime}
                        onChange={e => setEditingTask({ ...editingTask, appointmentTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">运营商信息</label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.carrierInfo || ''}
                        onChange={e => setEditingTask({ ...editingTask, carrierInfo: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Status & Assignment */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">状态与指派</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          所属项目
                        </label>
                        <select
                          value={editingTask.projectName || '合富明珠'}
                          onChange={(e) => setEditingTask({ ...editingTask, projectName: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        >
                          {PROJECTS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                        <select
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingTask.priority}
                          onChange={e => setEditingTask({ ...editingTask, priority: e.target.value as any })}
                        >
                          <option value="Normal">普通</option>
                          <option value="Urgent">加急</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">任务状态</label>
                      <select
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.status}
                        onChange={e => setEditingTask({ ...editingTask, status: e.target.value as any })}
                      >
                        <option value="Pending">待派单</option>
                        <option value="Assigned">已派单</option>
                        <option value="In_Progress">进行中</option>
                        <option value="Completed">已完成</option>
                        <option value="Failure">失败</option>
                        <option value="Reschedule">需改约</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">指派跟单员</label>
                      <select
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.cpName || ''}
                        onChange={e => setEditingTask({ ...editingTask, cpName: e.target.value })}
                      >
                        <option value="">未分配</option>
                        {filteredCps.map(cp => (
                          <option key={cp.id} value={cp.name}>{cp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">实际参与人员</label>
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-700"
                          onClick={() => {
                            const names = editingTask.cpName ? parseStaffNames(editingTask.cpName) : [];
                            const nameToId = new Map(staff.map(s => [s.name, s.id]));
                            const ids = names.map(n => nameToId.get(n)).filter(Boolean) as string[];
                            setEditingTask({ ...editingTask, actualStaffIds: ids });
                          }}
                        >
                          按团队填充
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
                        {staff.length === 0 && (
                          <div className="text-xs text-slate-400">暂无人员数据</div>
                        )}
                        {staff.map(s => {
                          const selected = editingTask.actualStaffIds?.includes(s.id) || false;
                          return (
                            <label key={s.id} className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-sm ${selected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(e) => {
                                  const next = new Set(editingTask.actualStaffIds || []);
                                  if (e.target.checked) next.add(s.id);
                                  else next.delete(s.id);
                                  setEditingTask({ ...editingTask, actualStaffIds: Array.from(next) });
                                }}
                              />
                              {s.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">访问结果</label>
                      <select
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                        value={editingTask.visitResult || ''}
                        onChange={e => {
                          const result = e.target.value;
                          let newStatus = editingTask.status;

                          if (result === 'success') newStatus = 'Completed';
                          else if (result === 'reschedule') newStatus = 'Reschedule';
                          else if (result === 'no_answer') newStatus = 'In_Progress';
                          else if (result === 'rejected' || result === 'other') newStatus = 'Failure';

                          setEditingTask({
                            ...editingTask,
                            visitResult: result as any,
                            status: newStatus
                          });
                        }}
                      >
                        <option value="">未反馈</option>
                        <option value="success">成功完成</option>
                        <option value="reschedule">需改约</option>
                        <option value="no_answer">无人应答</option>
                        <option value="rejected">客户拒绝</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                  </div>

                  {/* Feedback & Metrics */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">反馈与指标</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">新装积分</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingTask.newInstallPoints ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            const newVal = val === '' ? undefined : Number(val);
                            setEditingTask({
                              ...editingTask,
                              newInstallPoints: newVal,
                              points: (newVal || 0) + (editingTask.stockPoints || 0)
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">存量积分</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                          value={editingTask.stockPoints ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            const newVal = val === '' ? undefined : Number(val);
                            setEditingTask({
                              ...editingTask,
                              stockPoints: newVal,
                              points: (editingTask.newInstallPoints || 0) + (newVal || 0)
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">合计积分</label>
                        <input
                          type="number"
                          readOnly
                          className="w-full p-2 border rounded-md bg-slate-100 text-slate-500 outline-none cursor-not-allowed"
                          value={editingTask.points || 0}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isKeyPersonHome || false}
                          onChange={e => setEditingTask({ ...editingTask, isKeyPersonHome: e.target.checked })}
                        />
                        关键人在家
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isAccessControlEntry || false}
                          onChange={e => setEditingTask({ ...editingTask, isAccessControlEntry: e.target.checked })}
                        />
                        门禁已录入
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isWeChatAdded || false}
                          onChange={e => setEditingTask({ ...editingTask, isWeChatAdded: e.target.checked })}
                        />
                        已加微信
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isHighValue || false}
                          onChange={e => setEditingTask({ ...editingTask, isHighValue: e.target.checked })}
                        />
                        高价值客户
                      </label>
                    </div>
                  </div>

                  {/* Opportunity & Competitor */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 border-b pb-2">商机与竞品</h4>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer w-full">
                        <input
                          type="checkbox"
                          checked={editingTask.hasOpportunity || false}
                          onChange={e => setEditingTask({ ...editingTask, hasOpportunity: e.target.checked })}
                        />
                        发现商机
                      </label>
                      {editingTask.hasOpportunity && (
                        <textarea
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                          placeholder="商机说明..."
                          value={editingTask.opportunityNotes || ''}
                          onChange={e => setEditingTask({ ...editingTask, opportunityNotes: e.target.value })}
                        />
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer w-full">
                        <input
                          type="checkbox"
                          checked={editingTask.isCompetitorUser || false}
                          onChange={e => setEditingTask({ ...editingTask, isCompetitorUser: e.target.checked })}
                        />
                        他网用户
                      </label>
                      {editingTask.isCompetitorUser && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="月消费"
                              className="w-full p-2 border rounded-md text-sm"
                              value={editingTask.competitorSpending || ''}
                              onChange={e => setEditingTask({ ...editingTask, competitorSpending: e.target.value })}
                            />
                            <select
                              className="w-full p-2 border rounded-md text-sm"
                              value={editingTask.conversionChance || ''}
                              onChange={e => setEditingTask({ ...editingTask, conversionChance: e.target.value as any })}
                            >
                              <option value="">策反可能性</option>
                              <option value="high">高</option>
                              <option value="medium">中</option>
                              <option value="low">低</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 whitespace-nowrap">到期时间:</span>
                            <input
                              type="date"
                              className="w-full p-2 border rounded-md text-sm"
                              value={editingTask.competitorExpirationDate || ''}
                              onChange={e => setEditingTask({ ...editingTask, competitorExpirationDate: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isNonResident || false}
                          onChange={e => setEditingTask({ ...editingTask, isNonResident: e.target.checked })}
                        />
                        不常住对象
                      </label>
                      <label className="flex items-center gap-2 p-2 border rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingTask.isElderlyHome || false}
                          onChange={e => setEditingTask({ ...editingTask, isElderlyHome: e.target.checked })}
                        />
                        只有老人住
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-1">管理员备注</label>
                  <textarea
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                    value={editingTask.adminNote || ''}
                    onChange={e => setEditingTask({ ...editingTask, adminNote: e.target.value })}
                    placeholder="添加备注信息..."
                  />
                </div>
              </form>

              <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpdateTask}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  保存修改
                </Button>
              </div>
            </Card>
          </div>
        )
      }

      {/* Import Modal */}
      {
        importModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">批量导入预约数据</h2>
                    <p className="text-blue-100 text-sm mt-1">支持文件上传、文本粘贴、手动填写</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="h-9 px-4"
                    onClick={() => {
                      setImportModalOpen(false);
                      setPasteText('');
                      setImportPreview([]);
                    }}
                  >
                    关闭
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b bg-slate-50">
                <button
                  onClick={() => setImportTab('paste')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${importTab === 'paste'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  📋 粘贴导入
                </button>
                <button
                  onClick={() => setImportTab('file')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${importTab === 'file'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  📁 文件上传
                </button>
                <button
                  onClick={() => setImportTab('manual')}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${importTab === 'manual'
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                >
                  ✏️ 手动填写
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Paste Tab */}
                {importTab === 'paste' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-bold text-blue-900 mb-2">📝 使用说明</h3>
                      <p className="text-sm text-blue-700 mb-2">从WPS/Excel复制数据后粘贴到下方文本框，支持自动识别：</p>
                      <ul className="text-xs text-blue-600 space-y-1 ml-4">
                        <li>• 制表符分隔（从Excel/WPS直接复制）</li>
                        <li>• 逗号分隔（CSV格式）</li>
                        <li>• 空格分隔（简单文本）</li>
                      </ul>
                      <p className="text-xs text-blue-600 mt-2">
                        <strong>格式：</strong>姓名 电话 楼栋 房间号 预约时间 时段 备注
                      </p>
                    </div>

                    <textarea
                      className="w-full h-64 p-4 border-2 border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="示例：&#10;张三	13800138000	1栋	101	2025-11-21 09:30	上午	&#10;李四	13900139000	2栋	202	2025-11-21 14:00	下午	VIP客户"
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                    />

                    <Button
                      onClick={handlePasteImport}
                      disabled={!pasteText.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      解析数据
                    </Button>
                  </div>
                )}

                {/* File Upload Tab */}
                {importTab === 'file' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h3 className="font-bold text-amber-900 mb-2">📁 文件格式要求</h3>
                      <p className="text-sm text-amber-800 mb-2">
                        请确保表格包含以下<strong>表头名称</strong>（列顺序不限）：
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-xs text-amber-700 font-mono">
                        <div className="bg-white p-2 rounded border border-amber-200">姓名 / 客户姓名</div>
                        <div className="bg-white p-2 rounded border border-amber-200">电话 / 手机号</div>
                        <div className="bg-white p-2 rounded border border-amber-200">楼栋</div>
                        <div className="bg-white p-2 rounded border border-amber-200">房间号 / 房号</div>
                        <div className="bg-white p-2 rounded border border-amber-200">预约时间 / 时间</div>
                        <div className="bg-white p-2 rounded border border-amber-200">时段</div>
                        <div className="bg-white p-2 rounded border border-amber-200">备注</div>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const bstr = evt.target?.result;
                            const wb = XLSX.read(bstr, { type: 'binary' });
                            const wsname = wb.SheetNames[0];
                            const ws = wb.Sheets[wsname];
                            // Read as array of arrays to manually find headers
                            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                            // 1. Find the header row
                            let headerRowIndex = -1;
                            const columnMap: Record<string, number> = {};

                            const keywords = {
                              name: ['姓名', '客户姓名', 'Name', 'Customer Name', '客户', '业主', '联系人', '用户', '用户姓名'],
                              phone: ['电话', '电话号码', '手机', '手机号', 'Phone', 'Mobile', '联系方式', '联系电话', '移动电话'],
                              building: ['楼栋', 'Building', '区域', '地址', '住址', '安装地址', '请选择您的楼'],
                              room: ['房间', '房间号', '房号', 'Room', '室'],
                              time: ['预约时间', '时间', 'Time', 'Appointment Time', '日期', '请选择上门服务时日'],
                              period: ['时段', 'Period', '时间段', '上午/下午/全日'],
                              note: ['备注', 'Note', 'Comments', '说明'],
                              cp: ['上门cp', 'CP', '上门人员', '派单给'],
                              accessControl: ['是否已录入门禁', '门禁', '录入门禁'],
                              success: ['是否成功', '成功', '完成'],
                              points: ['净增积分', '积分', '分数']
                            };

                            // Scan first 10 rows for headers
                            for (let i = 0; i < Math.min(data.length, 10); i++) {
                              const row = data[i];
                              let matchCount = 0;
                              row.forEach((cell: any, index: number) => {
                                const val = String(cell).trim();
                                if (keywords.name.some(k => val.includes(k))) { columnMap.name = index; matchCount++; }
                                else if (keywords.phone.some(k => val.includes(k))) { columnMap.phone = index; matchCount++; }
                                else if (keywords.building.some(k => val.includes(k))) { columnMap.building = index; matchCount++; }
                                else if (keywords.room.some(k => val.includes(k))) { columnMap.room = index; matchCount++; }
                                else if (keywords.time.some(k => val.includes(k))) { columnMap.time = index; matchCount++; }
                                else if (keywords.period.some(k => val.includes(k))) { columnMap.period = index; matchCount++; }
                                else if (keywords.note.some(k => val.includes(k))) { columnMap.note = index; matchCount++; }
                                else if (keywords.cp.some(k => val.includes(k))) { columnMap.cp = index; matchCount++; }
                                else if (keywords.accessControl.some(k => val.includes(k))) { columnMap.accessControl = index; matchCount++; }
                                else if (keywords.success.some(k => val.includes(k))) { columnMap.success = index; matchCount++; }
                                else if (keywords.points.some(k => val.includes(k))) { columnMap.points = index; matchCount++; }
                              });

                              if (matchCount >= 2) {
                                headerRowIndex = i;
                                setImportHeaders(row.map(String));
                                break;
                              }
                            }

                            // If no header found, fallback to default indices (0=Name, 1=Phone, etc.)
                            if (headerRowIndex === -1) {
                              columnMap.name = 0;
                              columnMap.phone = 1;
                              columnMap.building = 2;
                              columnMap.room = 3;
                              columnMap.time = 4;
                              columnMap.period = 5;
                              columnMap.note = 6;
                              headerRowIndex = 0; // Assume first row is header (or data starts immediately if no header)
                              setImportHeaders(null); // No explicit headers found
                            } else {
                              // Capture actual headers
                              const headers = data[headerRowIndex].map(String);
                              setImportHeaders(headers);
                            }



                            // 2. Process data rows
                            const rows: ImportRow[] = data.slice(headerRowIndex + 1)
                              .filter(row => row && row.length > 0) // Filter out empty rows
                              .map((row, index) => {
                                const getValue = (key: string) => {
                                  const colIndex = columnMap[key];
                                  return colIndex !== undefined ? String(row[colIndex] || '').trim() : '';
                                };

                                const name = getValue('name');
                                const phone = getValue('phone');

                                // Skip if both name and phone are empty (completely empty row)
                                if (!name && !phone) return null;

                                // Smart parse time field
                                const rawTime = getValue('time');
                                const parsed = parseComplexTime(rawTime);

                                // If we found a date in the time string, use it. Otherwise try to use the raw value if it looks like a date
                                const finalDate = parsed.date || (getTaskDate(rawTime) !== rawTime.split(' ')[0] ? getTaskDate(rawTime) : '');

                                // If we found a period, use it. Otherwise check separate period column
                                const finalPeriod = parsed.period || getValue('period');

                                // If we found a specific time range, use it. Otherwise use raw time if it's not just a date
                                // If rawTime was fully parsed into date/period, we might want to show the specific time part as 'time'
                                let finalTime = parsed.time;
                                if (!finalTime && !parsed.date && !parsed.period) {
                                  finalTime = rawTime; // Fallback to raw string if nothing parsed
                                }

                                return {
                                  id: `file-${index}`,
                                  name,
                                  phone,
                                  building: getValue('building'),
                                  room: getValue('room'),
                                  time: finalTime, // Display specific time range (e.g. 15:00-17:30)
                                  period: finalPeriod,
                                  note: getValue('note'),
                                  date: finalDate,
                                  timePeriod: finalPeriod,
                                  priority: 'Normal',
                                  cp: getValue('cp'),
                                  accessControl: getValue('accessControl'),
                                  success: getValue('success'),
                                  points: getValue('points'),
                                  rawArray: row // Store raw data for preview
                                };
                              })
                              .filter(Boolean) as ImportRow[]; // Remove nulls

                            // Show preview without validation
                            setImportPreview(rows);
                          };
                          reader.readAsBinaryString(file);
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                        <p className="text-lg font-medium text-slate-700">点击选择文件</p>
                        <p className="text-sm text-slate-500 mt-1">支持 .xlsx, .xls 格式</p>
                        <p className="text-xs text-slate-400 mt-2">系统会自动识别表头（如：姓名、电话、地址等）</p>
                      </label>
                    </div>
                  </div>
                )}

                {/* Manual Input Tab */}
                {importTab === 'manual' && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-bold text-green-900 mb-2">✏️ 手动填写</h3>
                      <p className="text-sm text-green-700">直接在表格中填写数据，支持添加/删除行</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border p-2 text-left font-bold text-slate-900">姓名*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">电话*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">楼栋*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">房间号*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">预约日期*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">时间*</th>
                            <th className="border p-2 text-left font-bold text-slate-900">是否加急</th>
                            <th className="border p-2 text-left font-bold text-slate-900">备注</th>
                            <th className="border p-2 w-20 font-bold text-slate-900">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualRows.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="border p-1">
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => updateManualRow(row.id, 'name', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.name ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                  placeholder="张三"
                                />
                              </td>
                              <td className="border p-1">
                                <input
                                  type="text"
                                  value={row.phone}
                                  onChange={(e) => updateManualRow(row.id, 'phone', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.phone ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                  placeholder="13800138000"
                                />
                              </td>
                              <td className="border p-1">
                                <input
                                  type="text"
                                  value={row.building}
                                  onChange={(e) => updateManualRow(row.id, 'building', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.building ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                  placeholder="1栋"
                                />
                              </td>
                              <td className="border p-1">
                                <input
                                  type="text"
                                  value={row.room}
                                  onChange={(e) => updateManualRow(row.id, 'room', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.room ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                  placeholder="101"
                                />
                              </td>
                              <td className="border p-1">
                                <input
                                  type="date"
                                  value={row.date || ''}
                                  onChange={(e) => updateManualRow(row.id, 'date', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.date ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                />
                              </td>
                              <td className="border p-1">
                                <select
                                  value={row.period && row.time ? `${row.period}|${row.time}` : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (!raw) {
                                      updateManualRow(row.id, 'time', '');
                                      updateManualRow(row.id, 'period', '');
                                      return;
                                    }
                                    const [period, timeRange] = raw.split('|');
                                    updateManualRow(row.id, 'period', period || '');
                                    updateManualRow(row.id, 'time', timeRange || raw);
                                  }}
                                  className={`w-full p-1 border rounded text-sm ${row.time ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                >
                                  <option value="">选择时间...</option>
                                  <option value="上午|9:30-11:30">上午 9:30-11:30</option>
                                  <option value="下午|15:30-18:00">下午 3:30-6:00</option>
                                  <option value="晚上|18:00-20:30">晚上 6:00-8:30</option>
                                </select>
                              </td>
                              <td className="border p-1 text-center">
                                <label className="inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.priority === 'Urgent'}
                                    onChange={(e) => updateManualRow(row.id, 'priority', e.target.checked ? 'Urgent' : 'Normal')}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                  />
                                  <span className={`ml-1 text-xs ${row.priority === 'Urgent' ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                    {row.priority === 'Urgent' ? '加急' : '普通'}
                                  </span>
                                </label>
                              </td>
                              <td className="border p-1">
                                <input
                                  type="text"
                                  value={row.note}
                                  onChange={(e) => updateManualRow(row.id, 'note', e.target.value)}
                                  className={`w-full p-1 border rounded text-sm ${row.note ? 'bg-blue-50 border-blue-300 font-bold text-blue-900' : ''}`}
                                  placeholder="备注"
                                />
                              </td>
                              <td className="border p-1 text-center">
                                <button
                                  onClick={() => removeManualRow(row.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={addManualRow} variant="outline" className="flex-1">
                        + 添加一行
                      </Button>
                      <Button onClick={handleManualImport} className="flex-1 bg-blue-600 hover:bg-blue-700">
                        生成预览
                      </Button>
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                {importPreview.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <span className="text-2xl">📊</span>
                      <span>数据预览</span>
                      <span className="text-blue-600">({importPreview.length} 条数据)</span>
                    </h3>

                    <div className="max-h-96 overflow-y-auto border-2 border-blue-200 rounded-lg shadow-lg">
                      <table className="w-full border-collapse">
                        <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-10">
                          <tr>
                            <th className="p-3 text-left whitespace-nowrap">状态</th>
                            <th className="p-3 text-left whitespace-nowrap">姓名</th>
                            <th className="p-3 text-left whitespace-nowrap">电话</th>
                            <th className="p-3 text-left whitespace-nowrap">楼栋</th>
                            <th className="p-3 text-left whitespace-nowrap">房号</th>
                            <th className="p-3 text-left whitespace-nowrap">日期</th>
                            <th className="p-3 text-left whitespace-nowrap">时间</th>
                            <th className="p-3 text-left whitespace-nowrap">加急</th>
                            <th className="p-3 text-left whitespace-nowrap">备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row) => {
                            const isValid = row.name && row.phone;
                            return (
                              <tr key={row.id} className={`transition-all ${isValid ? 'bg-white hover:bg-slate-50' : 'bg-red-50 hover:bg-red-100'}`}>
                                <td className="border border-slate-300 p-3">
                                  {isValid ? (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      <span className="text-xs text-green-700 font-bold">待导入</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2" title="缺少姓名或电话，将不会被导入">
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                      <span className="text-xs text-red-700 font-bold">无效</span>
                                    </div>
                                  )}
                                </td>
                                <td className="border border-slate-300 p-3 font-bold text-slate-900">{row.name}</td>
                                <td className="border border-slate-300 p-3 font-bold text-blue-900">{row.phone}</td>
                                <td className="border border-slate-300 p-3 text-slate-700">{row.building}</td>
                                <td className="border border-slate-300 p-3 text-slate-700">{row.room}</td>
                                <td className="border border-slate-300 p-3 font-medium text-blue-600">{row.date}</td>
                                <td className="border border-slate-300 p-3 font-mono text-slate-600">
                                  {row.period ? `${row.period} ${row.time}` : row.time}
                                </td>
                                <td className="border border-slate-300 p-3 text-center">
                                  {row.priority === 'Urgent' ? (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">加急</Badge>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="border border-slate-300 p-3 text-xs text-slate-500 italic max-w-[150px] truncate" title={row.note}>{row.note}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={() => setImportPreview([])}
                        variant="outline"
                        className="flex-1"
                      >
                        清空预览
                      </Button>
                      <Button
                        onClick={submitImport}
                        disabled={importing || importPreview.length === 0}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-3"
                      >
                        {importing ? '导入中...' : `✨ 确认导入 ${importPreview.length} 条数据`}
                      </Button>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <label className="text-sm font-medium text-slate-700">导入后状态:</label>
                      <select
                        value={importTargetStatus}
                        onChange={(e) => setImportTargetStatus(e.target.value as any)}
                        className="p-2 border rounded-md text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Auto">✨ 自动判断 (推荐)</option>
                        <option value="Pending">⏳ 待派单 (Pending)</option>
                        <option value="Assigned">👉 已派单 (Assigned)</option>
                        <option value="Completed">✅ 已完成 (Completed)</option>
                      </select>
                      <div className="text-xs text-slate-500 ml-2">
                        {importTargetStatus === 'Auto' && '根据是否成功/有无CP自动设置'}
                        {importTargetStatus === 'Pending' && '强制设为待派单'}
                        {importTargetStatus === 'Assigned' && '强制设为已派单'}
                        {importTargetStatus === 'Completed' && '强制设为已完成'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div >
          </div >
        )
      }

      {/* Mobile Access Modal */}
      {mobileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">📱 手机扫码访问</h3>
                <button
                  onClick={() => setMobileModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner inline-block mb-4">
                {localIp ? (
                  <QRCodeCanvas
                    value={`http://${localIp}:3000`}
                    size={200}
                    level={"H"}
                    includeMargin={true}
                  />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="font-mono text-lg font-bold text-blue-600 bg-blue-50 py-2 px-4 rounded-lg select-all">
                  http://{localIp || '...'}:3000
                </p>
                <p className="text-sm text-slate-500">
                  请确保手机和电脑连接同一Wi-Fi
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            调度指挥中心
          </h1>
          <p className="text-slate-500 mt-1">高效管理派单与反馈</p>
        </div>

        {/* Project Selector */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {PROJECTS.map(project => (
            <button
              key={project}
              onClick={() => setSelectedProject(project)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedProject === project
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {project}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleOpenMobileAccess}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm hover:shadow-md transition-all"
          >
            <QrCode className="w-4 h-4" /> 手机访问
          </Button>
          <Link href="/admin/analytics">
            <Button variant="outline" className="gap-2">
              <BarChart2 className="w-4 h-4" /> 数据报表
            </Button>
          </Link>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link href="/cp" target="_blank">
              <button
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 text-slate-500 hover:text-slate-700 hover:bg-white hover:shadow-sm"
                title="CP接单入口"
              >
                <Smartphone className="w-4 h-4" /> 接单
              </button>
            </Link>
            <div className="w-px bg-slate-300 my-1 mx-1"></div>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'board' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <LayoutGrid className="w-4 h-4" /> 看板
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <LayoutList className="w-4 h-4" /> 列表
            </button>
            <button
              onClick={() => setViewMode('personnel')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'personnel' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <User className="w-4 h-4" /> 人员
            </button>
          </div>
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> 批量导入
          </Button>
          <Button
            variant="outline"
            onClick={clearAllTasks}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <AlertCircle className="w-4 h-4 mr-2" /> 清空数据
          </Button>
          <Button onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 刷新数据
          </Button>
        </div>
      </header >

      {/* Date Selector & Statistics */}
      <div className="mb-6 space-y-4">
        {/* Date Navigation */}
        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="上一天"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-bold transition-colors"
            >
              今天
            </button>
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="下一天"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              {new Date(selectedDate).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="ml-2 p-1 border rounded text-sm text-slate-400 opacity-50 hover:opacity-100 transition-opacity"
            />
          </div>

          <div className="w-[120px]"></div> {/* Spacer for balance */}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">📊 当日统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{todayStats.points}</div>
                <div className="text-xs text-slate-500">今日积分</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{todayStats.tasks}</div>
                <div className="text-xs text-slate-500">今日任务(个)</div>
              </div>
            </div>
          </Card>

          {/* Total Stats */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-slate-500 mb-3">📈 累计统计</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalStats.points}</div>
                <div className="text-xs text-slate-500">累计积分</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalStats.tasks}</div>
                <div className="text-xs text-slate-500">累计任务(个)</div>
              </div>
            </div>
          </Card>
        </div>
      </div >

      <div className="grid grid-cols-12 gap-8">
        {/* Main Board */}
        {viewMode === 'board' && (
          <div className="col-span-9 grid grid-cols-3 gap-6">
            {/* Pending Column */}
            <div className="bg-slate-100 p-4 rounded-xl h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="font-bold text-lg text-slate-800">待派单</h2>
                </div>
                <Badge className="bg-blue-600 text-white border-0 px-2.5 py-1 text-sm">{pendingTasks.length}</Badge>
              </div>

              {/* Time Filter Tabs */}
              <div className="flex gap-1 mb-4 bg-slate-200 p-1 rounded-lg">
                {['All', '上午', '下午', '晚上'].map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeFilter(time as any)}
                    className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${timeFilter === time ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    {time === 'All' ? '全部' : time}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredPendingTasks.map(task => {
                  const carrier = detectCarrier(task.phoneNumber);
                  return (
                    <Card key={task.id} className={`p-4 hover:shadow-md transition-shadow border-l-4 ${task.priority === 'Urgent' ? 'border-l-red-500 bg-red-50' : 'border-l-blue-500'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.customerName}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded px-1 whitespace-nowrap">{task.projectName || '合富明珠'}</span>
                        </div>
                        {task.priority === 'Urgent' && <Badge variant="destructive">加急</Badge>}
                      </div>
                      <div className="text-sm text-slate-500 space-y-1">
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {task.phoneNumber}
                          <span className="text-xs text-slate-400 ml-1">({carrier})</span>
                        </div>
                        <div className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {task.address}</div>
                        <div className="text-xs bg-slate-200 inline-block px-2 py-1 rounded mt-2">{task.appointmentTime}</div>
                      </div>
                      {task.adminNote && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-1.5 shadow-sm">
                          <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                          <span className="leading-relaxed">{task.adminNote}</span>
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t flex justify-end">
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openDispatchModal(task)}
                        >
                          派单
                        </Button>
                      </div>
                    </Card>
                  );
                })}
                {filteredPendingTasks.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    无{timeFilter === 'All' ? '' : timeFilter}工单
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Column */}
            <div className="bg-slate-100 p-4 rounded-xl h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin-slow" />
                  </div>
                  <h2 className="font-bold text-lg text-slate-800">进行中</h2>
                </div>
                <Badge variant="warning" className="px-2.5 py-1 text-sm">{assignedTasks.length}</Badge>
              </div>
              <div className="space-y-6">
                {/* Group by CP */}
                {(() => {
                  const groupedByCp = assignedTasks.reduce((acc, task) => {
                    const cpName = task.cpName || '未分配';
                    if (!acc[cpName]) acc[cpName] = [];
                    acc[cpName].push(task);
                    return acc;
                  }, {} as Record<string, typeof assignedTasks>);

                  return Object.entries(groupedByCp).map(([cpName, tasks]) => (
                    <div key={cpName} className="space-y-3">
                      {/* CP Header */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${getCpColor(cpName).replace('bg-', 'bg-')}`}></div>
                          <span className="font-bold text-slate-700">{cpName}</span>
                          <span className="text-xs text-slate-400 font-normal">({tasks.length}单)</span>
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="space-y-3">
                        {tasks.map(task => {
                          const isRescheduled = task.status === 'Reschedule' || !!task.originalAppointmentTime;
                          const isNoAnswer = task.visitResult === 'no_answer';
                          const carrier = detectCarrier(task.phoneNumber);
                          return (
                            <Card key={task.id} className={`p-4 border-l-4 ${isRescheduled ? 'border-l-blue-500 bg-blue-50' : isNoAnswer ? 'border-l-amber-500 bg-amber-50' : 'border-l-yellow-500'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{task.customerName}</div>
                                  <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded px-1 whitespace-nowrap font-normal">{task.projectName || '合富明珠'}</span>
                                </div>
                                <div className="flex gap-1">
                                  {isRescheduled && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300">
                                      🔄 已改约
                                    </Badge>
                                  )}
                                  {isNoAnswer && (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300">
                                      📞 无人接听
                                    </Badge>
                                  )}
                                  {task.priority === 'Urgent' && (
                                    <Badge variant="destructive">🚨 加急</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-slate-500 space-y-1 mb-2">
                                <div className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {task.phoneNumber}
                                  <span className="text-xs text-slate-400 ml-1">({carrier})</span>
                                </div>
                                <div>{task.address}</div>
                              </div>
                              {isRescheduled && (
                                <div className="flex items-center gap-1 text-xs font-bold text-blue-700 mb-2 bg-blue-100 p-2 rounded border border-blue-200">
                                  <span>🕒</span>
                                  <span>改约至: {task.appointmentTime}</span>
                                </div>
                              )}
                              {!isRescheduled && (
                                <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block">
                                  预约: {task.appointmentTime}
                                </div>
                              )}
                              <div className="mt-3">
                                {noteEditTaskId === task.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      className="w-full p-2 text-xs border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                      value={noteEditValue}
                                      onChange={e => setNoteEditValue(e.target.value)}
                                      placeholder="编辑备注..."
                                      rows={3}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-7 px-2 text-xs"
                                        onClick={cancelEditNote}
                                        disabled={noteSavingTaskId === task.id}
                                      >
                                        取消
                                      </Button>
                                      <Button
                                        type="button"
                                        className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={saveEditNote}
                                        disabled={noteSavingTaskId === task.id}
                                      >
                                        {noteSavingTaskId === task.id ? '保存中...' : '保存'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    {task.adminNote ? (
                                      <div className="flex-1 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-1.5 shadow-sm">
                                        <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                                        <span className="leading-relaxed">{task.adminNote}</span>
                                      </div>
                                    ) : null}
                                    <button
                                      className="text-[11px] text-slate-400 hover:text-slate-600 whitespace-nowrap mt-1 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors"
                                      onClick={() => startEditNote(task)}
                                    >
                                      {task.adminNote ? '编辑' : '添加'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Completed Column */}
            <div className="bg-slate-100 p-4 rounded-xl h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="font-bold text-lg text-slate-800">已完成</h2>
                </div>
                <Badge variant="success" className="px-2.5 py-1 text-sm">{completedTasks.length}</Badge>
              </div>
              <div className="space-y-6">
                {/* Group by CP */}
                {(() => {
                  // Group tasks by cpName
                  const groupedByCp = completedTasks.reduce((acc, task) => {
                    const cpName = task.cpName || '未分配';
                    if (!acc[cpName]) acc[cpName] = [];
                    acc[cpName].push(task);
                    return acc;
                  }, {} as Record<string, typeof completedTasks>);

                  // Get CP color
                  // const getCpColor = (cpName: string) => {
                  //   const cp = cps.find(c => c.name === cpName);
                  //   return cp?.color || 'bg-slate-500';
                  // };

                  return Object.entries(groupedByCp).map(([cpName, tasks]) => (
                    <div key={cpName} className="space-y-3">
                      {/* CP Header - Clean & Minimal */}
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${getCpColor(cpName).replace('bg-', 'bg-')}`}></div>
                          <span className="font-bold text-slate-700">{cpName}</span>
                          <span className="text-xs text-slate-400 font-normal">({tasks.length}单)</span>
                        </div>
                      </div>

                      {/* Tasks under this CP */}
                      <div className="space-y-3">
                        {tasks.map(task => {
                          const carrier = detectCarrier(task.phoneNumber);
                          return (
                            <Card key={task.id} className="p-4 shadow-sm hover:shadow border-slate-100 transition-all group bg-white">
                              {/* Header: Name, Time, Result */}
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{task.customerName}</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 rounded px-1 whitespace-nowrap font-normal">{task.projectName || '合富明珠'}</span>
                                    {task.completedAt && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {task.completedAt.split('T')[1]?.substring(0, 5)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                                    <div className="flex items-center">
                                      <Phone className="w-3 h-3 mr-1" />
                                      {task.phoneNumber}
                                      <span className="text-xs text-slate-400 ml-1">({carrier})</span>
                                    </div>
                                    <div>{task.address}</div>
                                  </div>
                                </div>
                                <Badge className={`border-0 font-medium shadow-none hover:bg-opacity-100 ${task.visitResult === 'success' ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                                  task.visitResult === 'no_answer' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' :
                                    task.visitResult === 'reschedule' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
                                      'bg-red-50 text-red-700 hover:bg-red-100'
                                  }`}>
                                  {getResultLabel(task.visitResult || 'success')}
                                </Badge>
                              </div>

                              {/* Key Metrics & Tags - Clean Row */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {/* Metrics */}
                                {!!task.points && task.points > 0 && (
                                  <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                    <span>⭐</span>
                                    <span>+{task.points}</span>
                                  </div>
                                )}

                                {task.adminNote && (
                                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50/50 px-2 py-1 rounded-md border border-amber-100/50">
                                    <MessageCircle className="w-3 h-3 text-amber-500" />
                                    <span className="line-clamp-1">{task.adminNote}</span>
                                  </div>
                                )}
                                {/* Status Tags */}
                                {Boolean(task.hasOpportunity) && (
                                  <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100 flex items-center gap-1">
                                    💡 有意向
                                  </span>
                                )}
                                {task.visitResult === 'no_answer' && task.status !== 'Reschedule' && (
                                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    无人应答
                                  </span>
                                )}
                                {Boolean(task.isAccessControlEntry) && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                    门禁
                                  </span>
                                )}
                                {Boolean(task.isWeChatAdded) && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                    微信
                                  </span>
                                )}
                                {Boolean(task.isKeyPersonHome) && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                    关键人
                                  </span>
                                )}
                                {Boolean(task.isElderlyHome) && (
                                  <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                    老人
                                  </span>
                                )}
                                {Boolean(task.isHighValue) && (
                                  <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100 font-medium">
                                    高价值
                                  </span>
                                )}
                              </div>

                              {/* Opportunity Details */}
                              {Boolean(task.hasOpportunity) && task.opportunityNotes && (
                                <div className="mb-3 text-xs bg-rose-50/50 border border-rose-100 rounded-md p-2.5">
                                  <div className="flex gap-2">
                                    <span className="text-rose-400 mt-0.5">↳</span>
                                    <span className="text-slate-700 leading-relaxed">{task.opportunityNotes}</span>
                                  </div>
                                </div>
                              )}

                              {/* Feedback Text */}
                              {task.feedback && (
                                <div className="text-xs text-slate-500 pl-2 border-l-2 border-slate-200 italic">
                                  {task.feedback}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="col-span-9 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[calc(100vh-200px)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-blue-600" />
                任务列表 ({new Date(selectedDate).toLocaleDateString('zh-CN')})
              </h2>
              <Badge variant="outline" className="text-slate-500">
                共 {tasks.filter(t => getTaskDate(t.appointmentTime) === selectedDate).length} 个任务
              </Badge>
            </div>

            <div className="space-y-8">
              {(() => {
                // Filter tasks by selected date
                const dateTasks = tasks.filter(t => getTaskDate(t.appointmentTime) === selectedDate);

                // Derived state for statistics
                const totalPoints = tasks
                  .filter(t => getTaskDate(t.appointmentTime) === selectedDate)
                  .reduce((sum, t) => sum + (t.points || 0), 0);

                if (dateTasks.length === 0) {
                  return (
                    <div className="text-center py-20 text-slate-400">
                      <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-slate-300" />
                      </div>
                      <p>该日期暂无任务数据</p>
                    </div>
                  );
                }

                // Group by CP
                const groupedByCp = dateTasks.reduce((acc, task) => {
                  const cpName = task.cpName || '未分配';
                  if (!acc[cpName]) acc[cpName] = [];
                  acc[cpName].push(task);
                  return acc;
                }, {} as Record<string, Task[]>);

                // Sort CPs (Unassigned last)
                const sortedCps = Object.keys(groupedByCp).sort((a, b) => {
                  if (a === '未分配') return 1;
                  if (b === '未分配') return -1;
                  return a.localeCompare(b);
                });

                return (
                  <>
                    {sortedCps.map(cpName => {
                      const cpTasks = groupedByCp[cpName];
                      const cpColor = getCpColor(cpName);

                      return (
                        <div key={cpName} className="border rounded-xl overflow-hidden shadow-sm">
                          {/* CP Header */}
                          <div className={`px-4 py-3 flex items-center justify-between ${cpColor} bg-opacity-10 border-b`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${cpColor.replace('bg-', 'bg-')}`}></div>
                              <span className="font-bold text-lg text-slate-800">{cpName}</span>
                              <Badge variant="secondary" className="bg-white/50 text-slate-600">
                                {cpTasks.length} 单
                              </Badge>
                            </div>
                          </div>

                          {/* Task List */}
                          <div className="divide-y divide-slate-100">
                            {cpTasks.map(task => {
                              const carrier = detectCarrier(task.phoneNumber);
                              return (
                                <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors group flex items-start justify-between gap-4">
                                  {/* Task Info */}
                                  <div className="flex-1 grid grid-cols-12 gap-4">
                                    <div className="col-span-3">
                                      <div className="font-bold text-slate-800 text-lg">{task.customerName}</div>
                                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                        <Phone className="w-3 h-3" />
                                        {task.phoneNumber}
                                        <span className="text-xs text-slate-400">({carrier})</span>
                                      </div>
                                    </div>

                                    <div className="col-span-4">
                                      <div className="flex items-center gap-1 text-slate-700 mb-1">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span className="font-medium">{task.address}</span>
                                      </div>
                                    </div>

                                    <div className="col-span-3">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-slate-100 font-mono text-slate-600 border-slate-200">
                                          {task.appointmentTime}
                                        </Badge>
                                        {task.priority === 'Urgent' && <Badge variant="destructive">加急</Badge>}
                                      </div>
                                      {task.adminNote && (
                                        <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 flex items-start gap-1.5 shadow-sm">
                                          <MessageCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                                          <span className="leading-relaxed">{task.adminNote}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="col-span-2 flex flex-col items-end gap-1">
                                    <Badge className={`${task.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                      task.status === 'Failure' ? 'bg-red-100 text-red-700' :
                                        task.status === 'In_Progress' ? 'bg-blue-100 text-blue-700' :
                                          task.status === 'Assigned' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'
                                      } border-0`}>
                                      {task.status === 'Completed' ? '已完成' :
                                        task.status === 'Failure' ? '用户拒绝' :
                                          task.status === 'In_Progress' ? '进行中' :
                                            task.status === 'Assigned' ? '已派单' : '待派单'}
                                    </Badge>
                                    {task.visitResult && (
                                      <span className="text-xs text-slate-500">
                                        {getResultLabel(task.visitResult)}
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                      onClick={() => {
                                        setEditingTask(task);
                                        setIsEditModalOpen(true);
                                      }}
                                      title="编辑任务"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      onClick={() => handleDeleteTask(task.id)}
                                      title="删除任务"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Personnel View */}
        {viewMode === 'personnel' && (
          <div className="col-span-9 bg-white rounded-xl shadow-sm border border-slate-100 p-6 min-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                人员任务视图
              </h2>
              <Badge variant="outline" className="text-slate-500">
                显示所有待处理任务
              </Badge>
            </div>

            <div className="space-y-6">
              {filteredCps.map(cp => {
                // Get all active tasks for this CP (across all dates)
                const cpTasks = tasks.filter(t =>
                  (t.status === 'Assigned' || t.status === 'In_Progress') &&
                  t.cpName === cp.name &&
                  (t.projectName || '合富明珠') === selectedProject
                );

                if (cpTasks.length === 0) return null;

                // Group by date
                const tasksByDate = cpTasks.reduce((acc, task) => {
                  const date = getTaskDate(task.appointmentTime); // YYYY-MM-DD
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(task);
                  return acc;
                }, {} as Record<string, Task[]>);

                // Sort dates
                const sortedDates = Object.keys(tasksByDate).sort();

                return (
                  <div key={cp.id} className="border rounded-xl overflow-hidden shadow-sm">
                    {/* CP Header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${cp.color} bg-opacity-10 border-b`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cp.color.replace('bg-', 'bg-')}`}></div>
                        <span className="font-bold text-lg text-slate-800">{cp.name}</span>
                        <Badge variant="secondary" className="bg-white/50 text-slate-600">
                          {cpTasks.length} 单待处理
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 space-y-4">
                      {sortedDates.map(date => (
                        <div key={date} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 border-b border-slate-200 flex justify-between">
                            <span>{date} ({new Date(date).toLocaleDateString('zh-CN', { weekday: 'short' })})</span>
                            <span className="text-slate-500">{tasksByDate[date].length} 单</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {tasksByDate[date].sort((a, b) => {
                              // Simple time sort if possible, or keep original order
                              return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
                            }).map(task => (
                              <div key={task.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-4">
                                <div>
                                  <div className="font-medium text-slate-800">{task.customerName}</div>
                                  <div className="text-xs text-slate-500">{task.address}</div>
                                  {task.adminNote && (
                                    <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 max-w-fit">
                                      <MessageCircle className="w-2.5 h-2.5" />
                                      {task.adminNote}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700">{task.appointmentTime}</div>
                                  <Badge className="scale-90 origin-right transition-colors" variant={task.status === 'In_Progress' ? 'default' : 'secondary'}>
                                    {task.status === 'In_Progress' ? '进行中' : '已派单'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredCps.every(cp =>
                tasks.filter(t => (t.status === 'Assigned' || t.status === 'In_Progress') && t.cpName === cp.name).length === 0
              ) && (
                  <div className="text-center py-12 text-slate-400">
                    当前所有搭档组均无待处理任务
                  </div>
                )}
            </div>
          </div>
        )}

        {/* CP Status Sidebar */}
        <div className="col-span-3 h-[calc(100vh-200px)]">
          <Card className="p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">人员状态 (搭档组)</h2>
              <button
                onClick={() => setIsCpManagerOpen(true)}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-md hover:bg-blue-50"
                title="管理搭档组"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setCpFilter('all')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${cpFilter === 'all'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                全部
              </button>
              <button
                onClick={() => setCpFilter('active')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${cpFilter === 'active'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                有任务
              </button>
              <button
                onClick={() => setCpFilter('idle')}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${cpFilter === 'idle'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                空闲
              </button>
            </div>
            <div className="space-y-4">
              {filteredCps.map(cp => {
                const activeCount = tasks.filter(t =>
                  (t.status === 'Assigned' || t.status === 'In_Progress') &&
                  t.cpName === cp.name &&
                  getTaskDate(t.appointmentTime) === selectedDate &&
                  (t.projectName || '合富明珠') === selectedProject
                ).length;

                if (cpFilter === 'active' && activeCount === 0) return null;
                if (cpFilter === 'idle' && activeCount > 0) return null;

                return (
                  <div
                    key={cp.id}
                    className={`flex items-center justify-between p-3 rounded-lg text-white shadow-sm cursor-pointer hover:shadow-md transition-all ${cp.color}`}
                    onClick={() => setSelectedCpForView(cp)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${activeCount > 0 ? 'bg-yellow-400' : 'bg-green-400'}`} />
                      <span className="font-bold text-sm">{cp.name}</span>
                    </div>
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                      {activeCount > 0 ? `${activeCount}单进行中` : '空闲'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
      {/* CP Details Modal */}
      {
        selectedCpForView && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white">
              <div className={`p-4 ${selectedCpForView.color} text-white flex justify-between items-center`}>
                <h2 className="text-xl font-bold">{selectedCpForView.name} - 任务列表</h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="h-8 px-3 text-xs flex items-center gap-1"
                    onClick={exportTaskListAsImage}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                    {isExporting ? '导出中...' : '导出图片'}
                  </Button>
                  <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => { setSelectedCpForView(null); setReassigningTaskId(null); }}>关闭</Button>
                </div>
              </div>

              <div ref={taskListRef} className="p-6 overflow-y-auto flex-1 space-y-4">
                {tasks.filter(t =>
                  (t.status === 'Assigned' || t.status === 'In_Progress') &&
                  t.cpName === selectedCpForView.name &&
                  getTaskDate(t.appointmentTime) === selectedDate &&
                  (t.projectName || '合富明珠') === selectedProject
                ).sort((a, b) => {
                  if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
                  if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
                  return 0;
                }).length === 0 ? (
                  <div className="text-center text-slate-500 py-8">该搭档组当前没有进行中的任务</div>
                ) : (
                  tasks.filter(t =>
                    (t.status === 'Assigned' || t.status === 'In_Progress') &&
                    t.cpName === selectedCpForView.name &&
                    getTaskDate(t.appointmentTime) === selectedDate &&
                    (t.projectName || '合富明珠') === selectedProject
                  ).sort((a, b) => {
                    if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
                    if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
                    return 0;
                  }).map(task => (
                    <div key={task.id}>
                      {reassigningTaskId === task.id ? (
                        <Card className="p-4 border-2 border-blue-500 bg-blue-50 animate-in fade-in zoom-in duration-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-blue-800">请选择新的搭档组</h3>
                            <Button variant="outline" onClick={() => setReassigningTaskId(null)} className="h-7 px-2 text-xs">取消</Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                            {cps.filter(c => c.id !== selectedCpForView.id).map(cp => (
                              <button
                                key={cp.id}
                                onClick={() => handleReassign(task.id, cp.id)}
                                className={`p-2 rounded border text-left hover:bg-blue-100 hover:border-blue-300 transition-colors ${cp.color} bg-opacity-10`}
                              >
                                <div className="font-bold text-sm">{cp.name}</div>
                                <div className="text-xs text-slate-500">
                                  {tasks.filter(t => (t.status === 'Assigned' || t.status === 'In_Progress') && t.cpName === cp.name).length}单进行中
                                </div>
                              </button>
                            ))}
                          </div>
                        </Card>
                      ) : (
                        <Card className={`p-4 border-l-4 ${task.priority === 'Urgent' ? 'border-l-red-500' : 'border-l-blue-500'} group relative`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-bold text-lg">{task.customerName}</div>
                              {task.phoneNumber && (
                                <div className="text-slate-600 text-sm mt-1 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {task.phoneNumber}
                                </div>
                              )}
                              <div className="text-slate-500 text-sm mt-1">{task.address}</div>

                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-slate-500 text-sm">预约:</span>
                                {task.appointmentTime && (() => {
                                  const timeStr = task.appointmentTime;
                                  let periodBadge = null;

                                  if (timeStr.includes('上午')) {
                                    periodBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
                                        ☀️ 上午
                                      </span>
                                    );
                                  } else if (timeStr.includes('下午')) {
                                    periodBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold">
                                        🌤️ 下午
                                      </span>
                                    );
                                  } else if (timeStr.includes('晚上')) {
                                    periodBadge = (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold">
                                        🌙 晚上
                                      </span>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center gap-2">
                                      {periodBadge}
                                      <span className="text-slate-600 text-sm">{timeStr}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {task.priority === 'Urgent' && <Badge variant="destructive">加急</Badge>}
                              <Button
                                variant="outline"
                                className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => setReassigningTaskId(task.id)}
                              >
                                转派
                              </Button>
                            </div>
                          </div>
                          {task.adminNote && (
                            <div className="mt-2 bg-yellow-50 p-2 rounded text-sm text-yellow-800">
                              <span className="font-bold">留言:</span> {task.adminNote}
                            </div>
                          )}
                        </Card>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )
      }
      {/* CP Management Modal */}
      {
        isCpManagerOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> 管理搭档组
                </h3>
                <button onClick={() => setIsCpManagerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Add New CP Form */}
                <div className="mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-sm text-slate-700 mb-3">添加新搭档组</h4>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get('name') as string;
                      const color = formData.get('color') as string;

                      if (!name) return;

                      try {
                        const res = await fetch('/api/cps', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name, color })
                        });

                        if (res.ok) {
                          fetchCps();
                          (e.target as HTMLFormElement).reset();
                          alert('添加成功');
                        } else {
                          alert('添加失败');
                        }
                      } catch (error) {
                        console.error('Failed to add CP:', error);
                        alert('添加失败');
                      }
                    }}
                    className="flex gap-3 items-end"
                  >
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">名称 (如: 张三, 李四)</label>
                      <input name="name" required className="w-full p-2 border rounded-md text-sm text-slate-900" placeholder="输入搭档组名称" />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-medium text-slate-500 mb-1">颜色标记</label>
                      <select name="color" className="w-full p-2 border rounded-md text-sm text-slate-900">
                        <option value="bg-blue-500">蓝色</option>
                        <option value="bg-green-500">绿色</option>
                        <option value="bg-purple-500">紫色</option>
                        <option value="bg-orange-500">橙色</option>
                        <option value="bg-pink-500">粉色</option>
                        <option value="bg-teal-500">青色</option>
                        <option value="bg-indigo-500">靛青</option>
                        <option value="bg-rose-500">玫瑰红</option>
                        <option value="bg-sky-500">天蓝</option>
                      </select>
                    </div>
                    <Button type="submit" className="bg-blue-600 text-white">添加</Button>
                  </form>
                </div>

                {/* CP List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-700 mb-2">现有搭档组 ({cps.length})</h4>
                  {cps.map(cp => (
                    <div key={cp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${cp.color || 'bg-slate-400'}`} />
                        <span className="font-medium text-slate-700">{cp.name}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openTeamMembersModal(cp)}
                          className="text-blue-600 hover:text-blue-700 text-sm px-2 py-1 rounded hover:bg-blue-50"
                        >
                          成员
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`确定要删除 "${cp.name}" 吗？`)) return;
                            try {
                              const res = await fetch(`/api/cps?id=${cp.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                fetchCps();
                              } else {
                                alert('删除失败');
                              }
                            } catch (error) {
                              console.error('Failed to delete CP:', error);
                              alert('删除失败');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Team Members Modal */}
      {isTeamMembersOpen && teamEditCp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
              <h3 className="font-bold text-lg text-slate-800">编辑成员 - {teamEditCp.name}</h3>
              <button onClick={() => setIsTeamMembersOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between border-b bg-white">
              <span className="text-sm text-slate-500">选择实际成员</span>
              <button
                className="text-xs text-blue-600 hover:text-blue-700"
                onClick={() => {
                  const names = parseStaffNames(teamEditCp.name);
                  const nameToId = new Map(staff.map(s => [s.name, s.id]));
                  const ids = names.map(n => nameToId.get(n)).filter(Boolean) as string[];
                  setTeamMemberIds(ids);
                }}
              >
                按团队名解析
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-2">
                {staff.map(s => {
                  const selected = teamMemberIds.includes(s.id);
                  return (
                    <label key={s.id} className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-sm ${selected ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const next = new Set(teamMemberIds);
                          if (e.target.checked) next.add(s.id);
                          else next.delete(s.id);
                          setTeamMemberIds(Array.from(next));
                        }}
                      />
                      {s.name}
                    </label>
                  );
                })}
                {staff.length === 0 && (
                  <div className="text-xs text-slate-400">暂无人员数据</div>
                )}
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setIsTeamMembersOpen(false)}>
                取消
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={saveTeamMembers}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
