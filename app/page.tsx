import Link from 'next/link';
import { Button, Card } from '@/components/ui';
import { ShieldCheck, Smartphone, Search } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">上门服务调度助手</h1>
          <p className="mt-2 text-slate-600">人员派单与反馈系统</p>
        </div>

        <div className="grid gap-4">
          <Link href="/admin">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-600 flex items-center gap-4 text-left">
              <div className="bg-blue-100 p-3 rounded-full">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">管理后台 (Admin)</h2>
                <p className="text-sm text-slate-500">派发工单、监控状态、查看报表</p>
              </div>
            </Card>
          </Link>

          <Link href="/cp">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-600 flex items-center gap-4 text-left">
              <div className="bg-green-100 p-3 rounded-full">
                <Smartphone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">员工端 (Staff)</h2>
                <p className="text-sm text-slate-500">上门人员接单、提交反馈专用</p>
              </div>
            </Card>
          </Link>

          <Link href="/check-status">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-600 flex items-center gap-4 text-left">
              <div className="bg-purple-100 p-3 rounded-full">
                <Search className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">进度查询 (Residents)</h2>
                <p className="text-sm text-slate-500">住户查询预约及上门状态</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
