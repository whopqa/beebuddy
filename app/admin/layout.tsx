"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, ReactNode } from "react";
import {
  LayoutDashboard,
  CreditCard,
  Users,
  ShieldAlert,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Bell,
  ClipboardList,
} from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";

const navItems = [
  {
    name: "Tổng quan (Dashboard)",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Quản lý Giao dịch & Gói",
    href: "/admin/payments",
    icon: CreditCard,
  },
  {
    name: "Quản trị Người dùng & App",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "Kiểm duyệt & Từ cấm",
    href: "/admin/moderation",
    icon: ShieldAlert,
  },
  {
    name: "Audit Log",
    href: "/admin/audit-logs",
    icon: ClipboardList,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState<WebUser | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    let active = true;
    webAuth.me()
      .then((currentUser) => {
        if (!active) return;
        if (currentUser.role !== "ADMIN") {
          router.replace("/home");
          return;
        }
        setAdmin(currentUser);
        setCheckingRole(false);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => { active = false; };
  }, [router]);

  if (checkingRole || !admin) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center text-sm font-semibold text-gray-600">
        Đang kiểm tra quyền quản trị...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FFD027] flex items-center justify-center font-bold text-black text-sm">
            🐝
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight">BeeBuddy Admin</h1>
            <span className="text-[10px] text-amber-600 font-semibold uppercase">Management Portal</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFD027] flex items-center justify-center text-xl shadow-sm">
                🐝
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-gray-900">BeeBuddy</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ShieldCheck size={13} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    Admin Portal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Quản trị hệ thống
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#FFD027] text-gray-950 font-bold shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-gray-950" : "text-gray-400"} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Area with User Web Link & Profile */}
        <div className="p-4 border-t border-gray-100 space-y-3">
          <Link
            href="/community"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Quay lại Giao diện Web User</span>
          </Link>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center text-xs">
                AD
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">{admin.profile?.fullName || "Quản Trị Viên"}</p>
                <p className="text-[10px] text-gray-500 truncate">{admin.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                void webAuth.logout().finally(() => router.replace("/login"));
              }}
              title="Đăng xuất"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-200 px-8 py-3.5 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-gray-800 text-base">
              {navItems.find((item) => item.href === pathname)?.name || "Bảng Điều Khiển"}
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              PostgreSQL Connected
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              PayOS & App Core Synced
            </div>
            <Link
              href="/billing"
              className="text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              Xem trang Billing
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-4 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
