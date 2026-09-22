import { Layers, Rocket, Shield, Users, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "Khởi động nhanh chóng",
    description: "Kiến trúc mô-đun hóa cao giúp biến ý tưởng khởi nghiệp thành sản phẩm thực tế (MVP) chỉ trong thời gian ngắn.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Layers,
    title: "Đồng bộ chuẩn Figma",
    description: "Mọi thành phần UI được thiết kế đồng bộ với Design System trên Figma, giữ nguyên độ thẩm mỹ và trải nghiệm UX.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Users,
    title: "Tối ưu hóa tệp khách hàng",
    description: "Thu thập phản hồi, kiểm chứng nhu cầu thị trường (Product-Market Fit) chính xác và trực quan.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Phân tích dữ liệu thời gian thực",
    description: "Đo lường các chỉ số quan trọng (Conversion Rate, Retention) hỗ trợ ra quyết định kinh doanh kịp thời.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Bảo mật & Ổn định",
    description: "Nền tảng Next.js Server Components với khả năng mở rộng linh hoạt, bảo mật dữ liệu khách hàng tuyệt đối.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Clock,
    title: "Vận hành 24/7 liên tục",
    description: "Hệ thống Web Server phản hồi tức thì với độ trễ thấp, đảm bảo người dùng luôn có trải nghiệm mượt mà.",
    color: "from-sky-500 to-blue-600",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs sm:text-sm font-semibold tracking-wider text-blue-600 uppercase">
            Tính Năng Nổi Bật
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Giải quyết triệt để bài toán thị trường
          </p>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Dự án EXE201 được trang bị đầy đủ công cụ và tính năng thiết yếu nhằm đem lại giá trị cao nhất cho khách hàng mục tiêu.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="group relative p-8 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${feature.color} flex items-center justify-center text-white shadow-md mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
