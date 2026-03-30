'use client';

import { useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { Search, ArrowLeft, MapPin, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface TaskResult {
 id: string;
 customerName: string;
 address: string;
 appointmentTime: string;
 status: string;
 cpName?: string;
 isAccessControlEntry: number;
}

export default function CheckStatusPage() {
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<TaskResult[]>([]);
 const [searched, setSearched] = useState(false);
 const [loading, setLoading] = useState(false);

 const handleSearch = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!query.trim()) return;

  setLoading(true);
  try {
   const res = await fetch(`/api/tasks/search?query=${encodeURIComponent(query)}`);
   const data = await res.json();
   setResults(data);
   setSearched(true);
  } catch (error) {
   console.error('Search failed', error);
  } finally {
   setLoading(false);
  }
 };

 const getStatusBadge = (status: string) => {
  switch (status) {
   case 'Pending': return <Badge variant="default">待派单</Badge>;
   case 'Assigned': return <Badge variant="warning">已派单</Badge>;
   case 'In_Progress': return <Badge variant="warning">服务中</Badge>;
   case 'Completed': return <Badge variant="success">已完成</Badge>;
   case 'Failure': return <Badge variant="destructive">用户拒绝</Badge>;
   default: return <Badge>未知</Badge>;
  }
 };

 return (
  <div className="min-h-screen bg-slate-50 p-4">
   <div className="max-w-md mx-auto space-y-6">
    <div className="flex items-center gap-4 mb-8">
     <Link href="/">
      <Button variant="outline" className="p-2">
       <ArrowLeft className="w-4 h-4" />
      </Button>
     </Link>
     <h1 className="text-2xl font-bold text-slate-900">服务进度查询</h1>
    </div>

    <Card className="p-6">
     <form onSubmit={handleSearch} className="space-y-4">
      <div>
       <label className="block text-sm font-medium text-slate-700 mb-1">
        请输入查询信息
       </label>
       <div className="relative">
        <input
         type="text"
         className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
         placeholder="房号 / 栋数 / 姓名 / 手机号"
         value={query}
         onChange={(e) => setQuery(e.target.value)}
        />
        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
       </div>
      </div>
      <Button
       type="submit"
       className="w-full bg-blue-600 hover:bg-blue-700 text-white"
       disabled={loading}
      >
       {loading ? '查询中...' : '查询进度'}
      </Button>
     </form>
    </Card>

    {searched && (
     <div className="space-y-4">
      <h2 className="font-semibold text-slate-500 ml-1">查询结果 ({results.length})</h2>

      {results.length === 0 ? (
       <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed">
        未找到相关工单，请检查输入信息是否正确
       </div>
      ) : (
       results.map(task => (
        <Card key={task.id} className="p-5 space-y-3 border-l-4 border-l-blue-500">
         <div className="flex justify-between items-start">
          <div>
           <div className="font-bold text-lg">{task.customerName}</div>
           <div className="text-slate-500 text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" /> {task.address}
           </div>
          </div>
          {getStatusBadge(task.status)}
         </div>

         <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
          <div className="flex items-center justify-between">
           <span className="text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 预约时间
           </span>
           <span className="font-medium">{task.appointmentTime}</span>
          </div>

          {(task.status === 'Assigned' || task.status === 'In_Progress' || task.status === 'Completed') && (
           <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1">
             <User className="w-3 h-3" /> 上门人员
            </span>
            <span className="font-medium text-blue-600">{task.cpName || '已指派'}</span>
           </div>
          )}

          {task.status === 'Completed' && (
           <div className="flex items-center justify-between pt-2 border-t mt-2">
            <span className="text-slate-500">门禁录入</span>
            {task.isAccessControlEntry ? (
             <span className="text-green-600 flex items-center gap-1 font-bold">
              <CheckCircle className="w-3 h-3" /> 已录入
             </span>
            ) : (
             <span className="text-slate-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> 未录入
             </span>
            )}
           </div>
          )}
         </div>
        </Card>
       ))
      )}
     </div>
    )}
   </div>
  </div>
 );
}
