"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Download,
} from "lucide-react";

interface PaymentItem {
  orderCode: number;
  email: string;
  fullName: string;
  tier: "VIP" | "PRO";
  durationMonths: number;
  amount: number;
  paymentMethod: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  paidAt: string | null;
  createdAt: string;
}

const initialPayments: PaymentItem[] = [
  {
    orderCode: 84920192,
    email: "minh.nguyen@beebuddy.vn",
    fullName: "Minh Nguyễn",
    tier: "VIP",
    durationMonths: 1,
    amount: 49000,
    paymentMethod: "PayOS VietQR",
    status: "COMPLETED",
    paidAt: "2026-09-22 19:30:12",
    createdAt: "2026-09-22 19:28:45",
  },
  {
    orderCode: 84920191,
    email: "trang.le@beebuddy.vn",
    fullName: "Trang Lê",
    tier: "PRO",
    durationMonths: 1,
    amount: 99000,
    paymentMethod: "PayOS VietQR",
    status: "COMPLETED",
    paidAt: "2026-09-22 18:55:01",
    createdAt: "2026-09-22 18:53:20",
  },
  {
    orderCode: 84920190,
    email: "viet.anh@gmail.com",
    fullName: "Việt Anh",
    tier: "VIP",
    durationMonths: 1,
    amount: 49000,
    paymentMethod: "PayOS VietQR",
    status: "COMPLETED",
    paidAt: "2026-09-22 17:15:33",
    createdAt: "2026-09-22 17:12:00",
  },
  {
    orderCode: 84920189,
    email: "huong.giang@yahoo.com",
    fullName: "Hương Giang",
    tier: "PRO",
    durationMonths: 1,
    amount: 99000,
    paymentMethod: "PayOS VietQR",
    status: "PENDING",
    paidAt: null,
    createdAt: "2026-09-22 14:02:18",
  },
  {
    orderCode: 84920188,
    email: "tuan.kiet@outlook.com",
    fullName: "Tuấn Kiệt",
    tier: "VIP",
    durationMonths: 1,
    amount: 49000,
    paymentMethod: "PayOS VietQR",
    status: "FAILED",
    paidAt: null,
    createdAt: "2026-09-21 21:10:05",
  },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [notification, setNotification] = useState<string | null>(null);

  const filtered = payments.filter((p) => {
    const matchSearch =
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      String(p.orderCode).includes(search);

    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleManualApprove = (orderCode: number) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.orderCode === orderCode
          ? { ...p, status: "COMPLETED", paidAt: new Date().toISOString().replace("T", " ").slice(0, 19) }
          : p
      )
    );
    setNotification(`Đã xác nhận thanh toán thủ công cho đơn hàng #${orderCode}. Quyền VIP/PRO đã được cập nhật sang App.`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Quản Lý Doanh Thu & Giao Dịch PayOS
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Đối soát các đơn hàng quét mã VietQR và kiểm soát thời hạn gói cước của người dùng.
          </p>
        </div>

        <button
          onClick={() => {
            setNotification("Đang làm mới danh sách giao dịch từ cổng PayOS...");
            setTimeout(() => setNotification(null), 2000);
          }}
          className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors shadow-sm flex items-center gap-2 self-start"
        >
          <RefreshCw size={14} />
          <span>Đồng bộ PayOS</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Tổng thu PayOS</span>
          <div className="text-xl font-extrabold text-gray-900 mt-1">16.246.000 ₫</div>
          <span className="text-[11px] text-emerald-600 font-semibold">Tất cả giao dịch thành công</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Giao dịch thành công</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">218 đơn</div>
          <span className="text-[11px] text-gray-500">Tỷ lệ thành công: 92%</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500">Đơn chờ thanh toán</span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">4 đơn</div>
          <span className="text-[11px] text-gray-500">Chờ người dùng quét mã VietQR</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, email, tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFD027] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={15} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#FFD027]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="COMPLETED">Thành công (COMPLETED)</option>
            <option value="PENDING">Chờ quét mã (PENDING)</option>
            <option value="FAILED">Thất bại / Hủy (FAILED)</option>
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Mã đơn (OrderCode)</th>
                <th className="px-5 py-3.5">Khách hàng</th>
                <th className="px-5 py-3.5">Gói cước</th>
                <th className="px-5 py-3.5">Số tiền</th>
                <th className="px-5 py-3.5">Thời gian tạo</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.orderCode} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-gray-900 text-xs">
                    #{item.orderCode}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900 text-xs">{item.fullName}</div>
                    <div className="text-[11px] text-gray-500">{item.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        item.tier === "PRO"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.tier} (1 tháng)
                    </span>
                  </td>
                  <td className="px-5 py-4 font-extrabold text-gray-900 text-xs">
                    {item.amount.toLocaleString("vi-VN")} ₫
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500">
                    <div>{item.createdAt}</div>
                    {item.paidAt && (
                      <div className="text-[10px] text-emerald-600">Thanh toán: {item.paidAt}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {item.status === "COMPLETED" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Thành công
                      </span>
                    )}
                    {item.status === "PENDING" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} />
                        Chờ quét mã
                      </span>
                    )}
                    {item.status === "FAILED" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                        <AlertCircle size={12} />
                        Thất bại
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {item.status === "PENDING" && (
                      <button
                        onClick={() => handleManualApprove(item.orderCode)}
                        className="px-3 py-1.5 bg-[#FFD027] hover:bg-amber-400 text-gray-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Kích hoạt gói
                      </button>
                    )}
                    {item.status === "COMPLETED" && (
                      <span className="text-[11px] font-semibold text-gray-400">Đã kích hoạt</span>
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
