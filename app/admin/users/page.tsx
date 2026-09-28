"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Search, Users } from "lucide-react";
import { adminApi, type AdminUser } from "@/lib/admin-client";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async (requestedPage = page) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ page: String(requestedPage), limit: "15" });
    if (search.trim()) query.set("search", search.trim());
    if (tier !== "ALL") query.set("tier", tier);
    try { const result = await adminApi.users(query.toString()); setUsers(result.users); setTotalPages(Math.max(1, result.totalPages)); setPage(result.page); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải người dùng"); }
    finally { setLoading(false); }
  }, [page, search, tier]);

  useEffect(() => { void load(1); }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps
  const submitSearch = (event: FormEvent) => { event.preventDefault(); void load(1); };
  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(""), 3500); };

  const changeTier = async (user: AdminUser, nextTier: AdminUser["tier"]) => {
    setWorkingId(user.id); setError("");
    try { await adminApi.updateTier(user.id, nextTier); setUsers(items => items.map(item => item.id === user.id ? { ...item, tier: nextTier } : item)); flash(`Đã cập nhật ${user.fullName} sang ${nextTier}.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Cập nhật gói thất bại"); }
    finally { setWorkingId(""); }
  };
  const unban = async (user: AdminUser) => {
    setWorkingId(user.id); setError("");
    try { await adminApi.unbanUser(user.id); setUsers(items => items.map(item => item.id === user.id ? { ...item, isBanned: false, banReason: null } : item)); flash(`Đã mở khóa ${user.fullName}.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Mở khóa thất bại"); }
    finally { setWorkingId(""); }
  };
  const confirmBan = async () => {
    if (!banTarget || banReason.trim().length < 3) { setError("Lý do khóa cần ít nhất 3 ký tự."); return; }
    setWorkingId(banTarget.id); setError("");
    try { await adminApi.banUser(banTarget.id, banReason.trim()); setUsers(items => items.map(item => item.id === banTarget.id ? { ...item, isBanned: true, banReason: banReason.trim() } : item)); flash(`Đã khóa ${banTarget.fullName}.`); setBanTarget(null); setBanReason(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Khóa tài khoản thất bại"); }
    finally { setWorkingId(""); }
  };

  return <div className="space-y-6 max-w-7xl mx-auto">
    <div><h1 className="text-2xl font-extrabold">Quản trị người dùng</h1><p className="text-sm text-gray-500 mt-1">Tìm kiếm, đổi gói và khóa/mở khóa trên dữ liệu thật.</p></div>
    {message && <Notice color="green">{message}</Notice>}{error && <Notice color="red">{error}</Notice>}
    <form onSubmit={submitSearch} className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Email, tên hoặc username" className="w-full border rounded-xl py-2.5 pl-10 pr-3 text-sm"/></div><select value={tier} onChange={e=>setTier(e.target.value)} className="border rounded-xl px-3 text-sm"><option value="ALL">Mọi gói</option><option>FREE</option><option>VIP</option><option>PRO</option></select><button className="bg-[#FFD027] px-5 py-2.5 rounded-xl text-sm font-bold">Tìm kiếm</button><button type="button" onClick={()=>void load()} className="border px-3 rounded-xl" title="Làm mới"><RefreshCw size={16}/></button></form>
    <div className="bg-white border rounded-2xl overflow-x-auto shadow-sm"><table className="w-full text-left min-w-[920px]"><thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="p-4">Người dùng</th><th className="p-4">Vai trò</th><th className="p-4">Gói</th><th className="p-4">Hoạt động</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500">Đang tải...</td></tr> : users.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-sm text-gray-500"><Users className="mx-auto mb-2"/>Không tìm thấy người dùng.</td></tr> : users.map(user => <tr key={user.id} className="text-sm"><td className="p-4"><p className="font-bold">{user.fullName}</p><p className="text-xs text-gray-500">{user.email}</p><p className="text-[11px] text-gray-400">{user.location || "Chưa có vị trí"}</p></td><td className="p-4 font-semibold">{user.role}</td><td className="p-4"><select disabled={user.role === "ADMIN" || workingId === user.id} value={user.tier} onChange={e=>void changeTier(user, e.target.value as AdminUser["tier"])} className="border rounded-lg px-2 py-1.5 text-xs"><option>FREE</option><option>VIP</option><option>PRO</option></select></td><td className="p-4 text-xs text-gray-600"><p>{user.stats.connectionsCount} kết nối</p><p>{user.stats.postsCount} bài · {user.stats.commentsCount} bình luận</p></td><td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{user.isBanned ? "Đã khóa" : "Hoạt động"}</span>{user.banReason && <p className="max-w-52 text-[11px] text-red-600 mt-1">{user.banReason}</p>}</td><td className="p-4 text-right">{user.role !== "ADMIN" && <button disabled={workingId === user.id} onClick={()=>user.isBanned ? void unban(user) : setBanTarget(user)} className={`px-3 py-2 rounded-lg text-xs font-bold ${user.isBanned ? "bg-emerald-600 text-white" : "bg-red-50 text-red-700 border border-red-200"}`}>{workingId === user.id ? "Đang xử lý..." : user.isBanned ? "Mở khóa" : "Khóa"}</button>}</td></tr>)}</tbody></table></div>
    <div className="flex justify-center items-center gap-3"><button disabled={page<=1} onClick={()=>void load(page-1)} className="border rounded-lg px-3 py-2 text-xs disabled:opacity-40">Trang trước</button><span className="text-xs">{page} / {totalPages}</span><button disabled={page>=totalPages} onClick={()=>void load(page+1)} className="border rounded-lg px-3 py-2 text-xs disabled:opacity-40">Trang sau</button></div>
    {banTarget && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4"><h2 className="font-bold flex items-center gap-2 text-red-700"><AlertTriangle size={19}/>Khóa {banTarget.fullName}</h2><textarea autoFocus rows={4} value={banReason} onChange={e=>setBanReason(e.target.value)} placeholder="Nhập lý do khóa..." className="w-full border rounded-xl p-3 text-sm"/><div className="flex justify-end gap-2"><button onClick={()=>setBanTarget(null)} className="px-4 py-2 text-sm">Hủy</button><button disabled={workingId===banTarget.id} onClick={()=>void confirmBan()} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold">Xác nhận khóa</button></div></div></div>}
  </div>;
}

function Notice({children,color}:{children:React.ReactNode;color:"green"|"red"}) { return <div className={`border rounded-xl p-3 text-sm ${color === "green" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>{children}</div>; }
