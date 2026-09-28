"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CreditCard, RefreshCw, Search } from "lucide-react";
import { adminApi, type AdminPayment } from "@/lib/admin-client";

const money = (value: number | string, currency = "VND") => new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(Number(value));
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(requestedPage), limit: "15" });
    if (search.trim()) query.set("search", search.trim());
    if (status !== "ALL") query.set("status", status);
    try { const result = await adminApi.payments(query.toString()); setPayments(result.payments); setTotal(result.total); setTotalPages(Math.max(1,result.totalPages)); setPage(result.page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải giao dịch"); }
    finally { setLoading(false); }
  }, [page, search, status]);
  useEffect(()=>{ void load(1); },[status]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = (event:FormEvent) => { event.preventDefault(); void load(1); };

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div className="flex justify-between gap-4"><div><h1 className="text-2xl font-extrabold">Giao dịch & doanh thu</h1><p className="text-sm text-gray-500 mt-1">Đối soát {total} đơn hàng lưu trong PostgreSQL.</p></div><button onClick={()=>void load()} className="border bg-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 self-start"><RefreshCw size={14}/>Làm mới</button></div>
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
    <form onSubmit={submit} className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Email hoặc mã đơn" className="w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm"/></div><select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-xl px-3 text-sm"><option value="ALL">Mọi trạng thái</option>{["PENDING","COMPLETED","FAILED","CANCELLED","EXPIRED","REFUNDED","PARTIALLY_REFUNDED"].map(item=><option key={item}>{item}</option>)}</select><button className="bg-[#FFD027] px-5 py-2.5 rounded-xl text-sm font-bold">Lọc</button></form>
    <div className="bg-white border rounded-2xl overflow-x-auto shadow-sm"><table className="w-full min-w-[900px] text-left"><thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="p-4">Đơn hàng</th><th className="p-4">Người dùng</th><th className="p-4">Gói</th><th className="p-4">Số tiền</th><th className="p-4">Thời gian</th><th className="p-4">Trạng thái</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500">Đang tải...</td></tr> : payments.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500"><CreditCard className="mx-auto mb-2"/>Chưa có giao dịch phù hợp.</td></tr> : payments.map(payment=><tr key={payment.id} className="text-sm"><td className="p-4"><p className="font-bold">#{payment.orderCode}</p><p className="text-xs text-gray-500">{payment.paymentMethod}</p></td><td className="p-4"><p className="font-semibold">{payment.user?.profile?.fullName || "Chưa đặt tên"}</p><p className="text-xs text-gray-500">{payment.user?.email}</p></td><td className="p-4 font-bold">{payment.tier}<span className="block text-xs font-normal text-gray-500">{payment.durationMonths} tháng</span></td><td className="p-4 font-bold">{money(payment.amount,payment.currency)}</td><td className="p-4 text-xs"><p>Tạo: {date(payment.createdAt)}</p><p className="text-gray-500">Trả: {date(payment.paidAt)}</p></td><td className="p-4"><Status value={payment.status}/></td></tr>)}</tbody></table></div>
    <div className="flex justify-center items-center gap-3"><button disabled={page<=1} onClick={()=>void load(page-1)} className="border rounded-lg px-3 py-2 text-xs disabled:opacity-40">Trang trước</button><span className="text-xs">{page} / {totalPages}</span><button disabled={page>=totalPages} onClick={()=>void load(page+1)} className="border rounded-lg px-3 py-2 text-xs disabled:opacity-40">Trang sau</button></div>
    <p className="text-xs text-gray-500">Trạng thái thanh toán chỉ được cập nhật bởi webhook PayOS đã xác thực; trang quản trị không giả lập xác nhận thủ công.</p>
  </div>;
}

function Status({value}:{value:string}) { const color = value === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : value === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"; return <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${color}`}>{value}</span>; }
