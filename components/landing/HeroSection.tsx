import Link from "next/link";
import { ArrowRight, Play, CheckCircle2, TrendingUp, ShieldCheck, Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] overflow-hidden -z-10 pointer-events-none opacity-40 blur-3xl">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter"></div>
        <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-sm animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Dự án Khởi Nghiệp Đổi Mới Sáng Tạo EXE201
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Giải pháp công nghệ đột phá cho{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
              tương lai số hóa
            </span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Nền tảng tối ưu hóa quy trình, nâng cao trải nghiệm người dùng và tạo ra giá trị bền vững cho thị trường mục tiêu. Thiết kế hiện đại, sẵn sàng mở rộng.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="#contact"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all group"
            >
              <span>Đăng ký nhận thông tin sớm</span>
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all"
            >
              <Play className="w-4 h-4 mr-2 text-slate-500 fill-slate-500" />
              <span>Khám phá tính năng</span>
            </Link>
          </div>

          {/* Quick trust metrics */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Giao diện chuẩn Figma</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tốc độ phản hồi cực nhanh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Bảo mật & Tối ưu SEO</span>
            </div>
          </div>
        </div>

        {/* UI Mockup Card (Figma placeholder frame) */}
        <div className="mt-14 relative mx-auto max-w-5xl rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl shadow-slate-200/50">
          <div className="rounded-xl bg-slate-900 overflow-hidden text-white border border-slate-800">
            {/* Window bar */}
            <div className="h-10 bg-slate-800/80 px-4 flex items-center justify-between border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              <div className="text-xs text-slate-400 font-mono">exe201-platform-preview.app</div>
              <div className="w-12"></div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/70">
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Người dùng tương tác</span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-white">12,480+</div>
                  <span className="text-xs text-emerald-400 font-medium">+24.5% so với tháng trước</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Tỉ lệ hoàn tất tác vụ</span>
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-white">99.2%</div>
                  <span className="text-xs text-blue-400 font-medium">Tối ưu hóa hành trình UI/UX</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-400">Độ tin cậy hệ thống</span>
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-bold text-white">100%</div>
                  <span className="text-xs text-indigo-400 font-medium">Next.js 14 Server Engine</span>
                </div>
              </div>

              {/* Wide section inside mockup */}
              <div className="md:col-span-3 p-6 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-base font-semibold text-white">Khung thiết kế chuẩn hóa từ Figma for VS Code</div>
                  <p className="text-xs text-slate-400">Bạn có thể dễ dàng thay đổi nội dung khung này thành ảnh chụp hoặc component chi tiết trích xuất từ Figma.</p>
                </div>
                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
                  Figma Component Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
