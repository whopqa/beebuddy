"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCw, Search } from "lucide-react";
import { adminApi, type AuditLogEntry } from "@/lib/admin-client";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ page: String(nextPage), limit: "30" });
      if (action.trim()) query.set("action", action.trim());
      if (targetType) query.set("targetType", targetType);
      const result = await adminApi.auditLogs(query.toString());
      setLogs(result.logs); setPage(result.page); setTotalPages(Math.max(1, result.totalPages));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải audit log"); }
    finally { setLoading(false); }
  }, [action, targetType]);

  useEffect(() => { void load(1); }, [load]);
  const submit = (event: FormEvent) => { event.preventDefault(); void load(1); };

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div><h1 className="text-2xl font-extrabold flex items-center gap-2"><ClipboardList /> Audit Log</h1><p className="text-sm text-gray-500 mt-1">Lịch sử bất biến của các thao tác quản trị và thao tác nhạy cảm.</p></div>
    {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
    <form onSubmit={submit} className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-gray-400" /><input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Tìm theo action..." className="w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm" /></div><select value={targetType} onChange={(event) => setTargetType(event.target.value)} className="border rounded-xl px-3 text-sm"><option value="">Mọi đối tượng</option><option>POST</option><option>COMMENT</option><option>REPORT</option><option>USER</option><option>BADWORD</option></select><button className="bg-[#FFD027] px-5 py-2.5 rounded-xl text-sm font-bold">Lọc</button><button type="button" onClick={() => void load(page)} className="border px-3 rounded-xl"><RefreshCw size={16} /></button></form>
    <div className="bg-white border rounded-2xl overflow-x-auto shadow-sm"><table className="w-full min-w-[980px] text-left"><thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="p-4">Thời gian</th><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Đối tượng</th><th className="p-4">Thay đổi</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-500">Đang tải...</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-500">Chưa có audit log phù hợp.</td></tr> : logs.map((log) => <tr key={log.id} className="text-sm align-top"><td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString("vi-VN")}</td><td className="p-4"><p className="font-semibold">{log.actorUser?.profile?.fullName || log.actorType}</p><p className="text-xs text-gray-500">{log.actorUser?.email || log.actorType}</p></td><td className="p-4"><span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold">{log.action}</span></td><td className="p-4"><p className="font-semibold">{log.targetType}</p><p className="font-mono text-[11px] text-gray-500 max-w-52 truncate">{log.targetId}</p></td><td className="p-4 text-xs"><details><summary className="cursor-pointer font-semibold text-gray-600">Xem dữ liệu</summary><pre className="mt-2 max-w-md overflow-auto rounded-lg bg-gray-950 text-gray-100 p-3 text-[10px]">{JSON.stringify({ before: log.beforeData, after: log.afterData, metadata: log.metadata }, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
    <div className="flex justify-end gap-2"><button disabled={page <= 1 || loading} onClick={() => void load(page - 1)} className="border rounded-lg px-3 py-2 text-sm disabled:opacity-40">Trang trước</button><span className="px-3 py-2 text-sm">{page}/{totalPages}</span><button disabled={page >= totalPages || loading} onClick={() => void load(page + 1)} className="border rounded-lg px-3 py-2 text-sm disabled:opacity-40">Trang sau</button></div>
  </div>;
}
