"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  ShieldBan,
  CheckCircle2,
  Crown,
  Smartphone,
  Tag,
  AlertTriangle,
  X,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  username: string;
  tier: "FREE" | "VIP" | "PRO";
  role: "USER" | "ADMIN";
  location: string;
  interests: string[];
  habits: string[];
  connectionsCount: number;
  isBanned: boolean;
  banReason?: string;
  joinedAt: string;
}

const initialUsers: AdminUserItem[] = [
  {
    id: "usr_01",
    email: "minh.nguyen@beebuddy.vn",
    fullName: "Minh Nguyễn",
    username: "minh_runner",
    tier: "VIP",
    role: "USER",
    location: "TP. Hồ Chí Minh",
    interests: ["Board games", "Running", "Coding"],
    habits: ["Dậy sớm", "Chạy bộ 5km"],
    connectionsCount: 14,
    isBanned: false,
    joinedAt: "2026-08-10",
  },
  {
    id: "usr_02",
    email: "trang.le@beebuddy.vn",
    fullName: "Trang Lê",
    username: "trang_coffee",
    tier: "PRO",
    role: "USER",
    location: "Hà Nội",
    interests: ["Cà phê", "Đọc sách", "Nhiếp ảnh"],
    habits: ["Uống cafe sáng", "Viết nhật ký"],
    connectionsCount: 29,
    isBanned: false,
    joinedAt: "2026-08-12",
  },
  {
    id: "usr_03",
    email: "hoang.pham@beebuddy.vn",
    fullName: "Hoàng Phạm",
    username: "hoang_coder",
    tier: "FREE",
    role: "USER",
    location: "Đà Nẵng",
    interests: ["Coding", "Cầu lông"],
    habits: ["Luyện code", "Chơi thể thao 3 buổi/tuần"],
    connectionsCount: 5,
    isBanned: false,
    joinedAt: "2026-09-01",
  },
  {
    id: "usr_04",
    email: "scammer.test@fake.com",
    fullName: "Nguyễn Lừa Đảo",
    username: "crypto_expert",
    tier: "FREE",
    role: "USER",
    location: "Online",
    interests: ["Crypto", "Đầu tư"],
    habits: ["Spam link"],
    connectionsCount: 1,
    isBanned: true,
    banReason: "Spam link lừa đảo tài chính trên phần bình luận",
    joinedAt: "2026-09-15",
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [banModalUser, setBanModalUser] = useState<AdminUserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());

    const matchTier = tierFilter === "ALL" || u.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const handleToggleBan = (user: AdminUserItem) => {
    if (user.isBanned) {
      // Mở khóa
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBanned: false, banReason: undefined } : u))
      );
      setNotification(`Đã mở khóa tài khoản cho ${user.fullName}. User có thể đăng nhập lại vào Web và App.`);
      setTimeout(() => setNotification(null), 4000);
    } else {
      // Mở modal nhập lý do
      setBanModalUser(user);
      setBanReasonInput("");
    }
  };

  const confirmBan = () => {
    if (!banModalUser) return;
    const reason = banReasonInput.trim() || "Vi phạm tiêu chuẩn cộng đồng BeeBuddy";
    setUsers((prev) =>
      prev.map((u) => (u.id === banModalUser.id ? { ...u, isBanned: true, banReason: reason } : u))
    );
    setNotification(`Đã khóa tài khoản ${banModalUser.fullName} trên cả Web và Mobile App.`);
    setBanModalUser(null);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUpdateTier = (userId: string, newTier: "FREE" | "VIP" | "PRO") => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, tier: newTier } : u))
    );
    setNotification(`Đã cập nhật gói cước thành ${newTier}. Quyền hạn trên App đã được đồng bộ.`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Quản Trị Tài Khoản & Đồng Bộ Mobile App
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý hồ sơ, thói quen sở thích và kiểm soát quyền truy cập của người dùng trên toàn hệ thống.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD027] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-gray-400" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD027]"
          >
            <option value="ALL">Tất cả gói cước</option>
            <option value="FREE">Gói FREE</option>
            <option value="VIP">Gói VIP</option>
            <option value="PRO">Gói PRO</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Người dùng (Hồ sơ)</th>
                <th className="px-5 py-3.5">Sở thích & Thói quen</th>
                <th className="px-5 py-3.5">Gói cước (App Tier)</th>
                <th className="px-5 py-3.5">Kết nối App</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-xs">
                        {u.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {u.role === "ADMIN" && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.2 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">@{u.username} • {u.email}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{u.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {u.interests.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {u.habits.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        Thói quen: {u.habits.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={u.tier}
                      onChange={(e) => handleUpdateTier(u.id, e.target.value as any)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                        u.tier === "PRO"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : u.tier === "VIP"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      <option value="FREE">Gói FREE</option>
                      <option value="VIP">Gói VIP</option>
                      <option value="PRO">Gói PRO</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                      <Smartphone size={13} className="text-gray-400" />
                      <span>{u.connectionsCount} bạn bè</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {u.isBanned ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700">
                          Đã khóa
                        </span>
                        {u.banReason && (
                          <p className="text-[10px] text-red-500 mt-0.5 max-w-[150px] truncate" title={u.banReason}>
                            {u.banReason}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
                        Hoạt động
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => handleToggleBan(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm ${
                          u.isBanned
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                        }`}
                      >
                        {u.isBanned ? "Mở khóa" : "Khóa tài khoản"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban User Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <AlertTriangle size={20} />
                <span>Khóa tài khoản người dùng</span>
              </div>
              <button
                onClick={() => setBanModalUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Bạn đang thực hiện khóa tài khoản của <strong>{banModalUser.fullName}</strong> ({banModalUser.email}). Tài khoản này sẽ ngay lập tức bị vô hiệu hóa trên cả Web và Mobile App.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lý do khóa tài khoản:
              </label>
              <textarea
                rows={3}
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="Nhập lý do vi phạm (ví dụ: Spam, lừa đảo, phát ngôn không đúng chuẩn mực)..."
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmBan}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
