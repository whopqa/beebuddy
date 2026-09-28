"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { adminApi, type AdminMetrics } from "@/lib/admin-client";

const money = (value: number | string) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value));
const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError("");
    try { setData(await adminApi.metrics()); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải dashboard"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  if (loading && !data) return <AdminState text="Đang tải số liệu từ PostgreSQL..." />;
  if (!data) return <AdminState text={error || "Chưa có dữ liệu"} retry={load} />;
  const { overview } = data;
  const cards = [
    { label: "Người dùng", value: overview.totalUsers, icon: Users, color: "bg-blue-50 text-blue-700" },
    { label: "Thuê bao trả phí", value: overview.subscribers.total, icon: CreditCard, color: "bg-violet-50 text-violet-700" },
    { label: "Doanh thu hoàn tất", value: money(overview.revenue.totalAmountVND), icon: TrendingUp, color: "bg-emerald-50 text-emerald-700" },
    { label: "Cần kiểm duyệt", value: overview.moderation.pendingReports + overview.moderation.flaggedComments, icon: ShieldAlert, color: "bg-amber-50 text-amber-700" },
  ];

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Tổng quan hệ thống</h1><p className="text-sm text-gray-500 mt-1">Số liệu trực tiếp từ PostgreSQL.</p></div><button onClick={() => void load()} className="px-3 py-2 rounded-xl border bg-white text-xs font-bold flex items-center gap-2"><RefreshCw size={14}/>Làm mới</button></div>
    {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(({label,value,icon:Icon,color}) => <div key={label} className="bg-white border rounded-2xl p-5 shadow-sm"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon size={20}/></div><p className="text-sm text-gray-500 mt-4">{label}</p><p className="text-2xl font-extrabold mt-1">{value}</p></div>)}</div>
    <div className="grid lg:grid-cols-3 gap-4">
      <section className="lg:col-span-2 bg-white border rounded-2xl overflow-hidden"><div className="p-5 border-b flex justify-between"><h2 className="font-bold">Giao dịch gần đây</h2><Link href="/admin/payments" className="text-xs font-bold text-amber-700">Xem tất cả</Link></div>{data.recentPayments.length === 0 ? <p className="p-8 text-sm text-gray-500">Chưa có giao dịch.</p> : <div className="divide-y">{data.recentPayments.map(payment => <div key={payment.id} className="p-4 flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{payment.user?.profile?.fullName || payment.user?.email || "Người dùng"}</p><p className="text-xs text-gray-500">#{payment.orderCode} · {date(payment.createdAt)}</p></div><div className="text-right"><p className="text-sm font-bold">{money(payment.amount)}</p><p className="text-[11px] font-bold text-gray-500">{payment.status}</p></div></div>)}</div>}</section>
      <section className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="font-bold">Trạng thái</h2><Row label="VIP" value={overview.subscribers.vip}/><Row label="PRO" value={overview.subscribers.pro}/><Row label="Đơn hoàn tất" value={overview.revenue.successfulCount}/><Row label="Tổng đơn" value={overview.revenue.totalOrders}/><Row label="Admin" value={overview.totalAdmins}/></section>
    </div>
  </div>;
}

function Row({label,value}:{label:string;value:number}) { return <div className="flex justify-between text-sm"><span className="text-gray-500">{label}</span><strong>{value}</strong></div>; }
function AdminState({text,retry}:{text:string;retry?:()=>void}) { return <div className="min-h-[45vh] flex flex-col gap-3 items-center justify-center text-sm text-gray-600"><p>{text}</p>{retry && <button onClick={retry} className="px-4 py-2 bg-[#FFD027] rounded-xl font-bold">Thử lại</button>}</div>; }
