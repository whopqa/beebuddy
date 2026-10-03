import { Layers, Rocket, Shield, Users, BarChart3, Clock } from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "Launch quickly",
    description: "A modular architecture helps turn startup ideas into a working MVP in less time.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Layers,
    title: "Figma design consistency",
    description: "UI components follow the Figma design system for a consistent look and user experience.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Users,
    title: "Understand your audience",
    description: "Collect feedback and validate market needs and product-market fit with clear insights.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    description: "Track conversion, retention, and other key metrics to support timely decisions.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Security and stability",
    description: "Next.js Server Components provide flexible scaling and strong data protection.",
    color: "from-rose-500 to-pink-500",
  },
  {
    icon: Clock,
    title: "Always available",
    description: "Low-latency responses help keep the experience smooth around the clock.",
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
            Key Features
          </h2>
          <p className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            Built to solve real market needs
          </p>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            EXE201 brings together the essential tools and features needed to deliver value to its audience.
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
