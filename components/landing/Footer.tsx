import Link from "next/link";
import { Sparkles, Github, Globe, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl text-white tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>EXE<span className="text-blue-500">201</span></span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#solution" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="#about" className="hover:text-white transition-colors">About</Link>
            <Link href="#contact" className="hover:text-white transition-colors">Contact</Link>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <a href="#" className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
            <a href="#" className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" aria-label="Website">
              <Globe className="w-5 h-5" />
            </a>
            <a href="mailto:contact@exe201.edu.vn" className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" aria-label="Email">
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} EXE201 Startup Project. All rights reserved.</p>
          <p>Built with Next.js 14, Tailwind CSS, and the Figma Design System.</p>
        </div>
      </div>
    </footer>
  );
}
