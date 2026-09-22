"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Users,
  CreditCard,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  Crown,
  Smartphone,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [metrics] = useState({
    totalUsers: 1284,
    vipUsers: 186,
    proUsers: 72,
    totalRevenue: 16246000, // VND
    pendingReports: 3,
  });

  const recentTransactions = [
    {
      id: "PAY-10829",
      email: "minh.nguyen@beebuddy.vn",
      name: "Minh Nguyễn",
      tier: "VIP",
      amount: "49.000 ₫",
      method: "PayOS VietQR",
      time: "10 phút trước",
      status: "COMPLETED",
    },
    {
      id: "PAY-10828",
      email: "trang.le@beebuddy.vn",
      name: "Trang Lê",
      tier: "PRO",
      amount: "99.000 ₫",
      method: "PayOS VietQR",
      time: "45 phút trước",
      status: "COMPLETED",
    },
    {
      id: "PAY-10827",
      email: "viet.anh@gmail.com",
      name: "Việt Anh",
      tier: "VIP",
      amount: "49.000 ₫",
      method: "PayOS VietQR",
      time: "2 giờ trước",
      status: "COMPLETED",
    },
    {
      id: "PAY-10826",
      email: "huong.giang@yahoo.com",
      name: "Hương Giang",
      tier: "PRO",
      amount: "99.000 ₫",
      method: "PayOS VietQR",
      time: "5 giờ trước",
      status: "PENDING",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Bảng Quản Trị Hệ Thống
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi dòng tiền thanh toán (PayOS), người dùng và đồng bộ dữ liệu với Mobile App Core.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/payments"
            className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <CreditCard size={14} />
            <span>Đối soát Giao dịch</span>
          </Link>
          <Link
            href="/admin/moderation"
            className="px-4 py-2 bg-[#FFD027] text-gray-950 text-xs font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <ShieldAlert size={14} />
            <span>Duyệt Bình Luận</span>
          </Link>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#FFD027] text-gray-900 shadow-sm mt-0.5">
            <Smartphone size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Cơ chế liên kết Web ↔ Mobile App Core
            </h3>
            <p className="text-xs text-gray-600 mt-0.5 max-w-2xl leading-relaxed">
              Mọi gói cước người dùng mua trên Web (VIP/PRO) và mọi thay đổi tài khoản đều cập nhật trực tiếp vào PostgreSQL. Khi người dùng mở App, các quyền như tạo group, cộng đồng và huy hiệu sẽ được kích hoạt tức thì.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={13} />
            Database Synced
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Doanh thu */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh thu PayOS</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {metrics.totalRevenue.toLocaleString("vi-VN")} ₫
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-2">
            <ArrowUpRight size={14} />
            <span>+18.4% so với tháng trước</span>
          </div>
        </div>

        {/* Tổng Người Dùng */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Người Dùng</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {metrics.totalUsers.toLocaleString("vi-VN")}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Đồng bộ cả Web và Mobile App
          </div>
        </div>

        {/* Gói Cước VIP & PRO */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Thành Viên VIP / PRO</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Crown size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {metrics.vipUsers + metrics.proUsers}{" "}
            <span className="text-xs font-normal text-gray-500">
              ({metrics.vipUsers} VIP, {metrics.proUsers} PRO)
            </span>
          </div>
          <div className="text-xs text-purple-600 font-semibold mt-2">
            Tỷ lệ chuyển đổi: ~20.1%
          </div>
        </div>

        {/* Cần kiểm duyệt */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Bình Luận Gắn Cờ</span>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-800 flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">
            {metrics.pendingReports}{" "}
            <span className="text-xs font-normal text-gray-500">chờ duyệt</span>
          </div>
          <div className="text-xs text-red-600 font-semibold mt-2">
            Bộ lọc Regex tự động phát hiện
          </div>
        </div>
      </div>

      {/* Giao dịch gần nhất & Quick Tables */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Giao Dịch Gần Nhất (PayOS / VietQR)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Cập nhật tức thời khi cổng thanh toán gửi Webhook về hệ thống.
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
          >
            <span>Xem tất cả</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/70 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Mã đơn</th>
                <th className="px-5 py-3">Người dùng</th>
                <th className="px-5 py-3">Gói cước</th>
                <th className="px-5 py-3">Số tiền</th>
                <th className="px-5 py-3">Phương thức</th>
                <th className="px-5 py-3">Thời gian</th>
                <th className="px-5 py-3 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4 font-mono font-semibold text-gray-900 text-xs">
                    {tx.id}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900 text-xs">{tx.name}</div>
                    <div className="text-[11px] text-gray-500">{tx.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        tx.tier === "PRO"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {tx.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-900 text-xs">{tx.amount}</td>
                  <td className="px-5 py-4 text-xs">{tx.method}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{tx.time}</td>
                  <td className="px-5 py-4 text-right">
                    {tx.status === "COMPLETED" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Thành công
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} />
                        Chờ quét QR
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
