"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { readCookiePreferences, saveCookiePreferences } from "@/lib/cookie-consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!readCookiePreferences());
  }, []);

  const decide = (allowOptional: boolean) => {
    saveCookiePreferences({
      essential: true,
      preference: allowOptional,
      analytics: allowOptional,
      personalization: allowOptional,
      marketing: allowOptional,
    });
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <section aria-label="Cookie preferences" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-4xl rounded-2xl border border-orange-200 bg-white p-5 shadow-2xl md:flex md:items-center md:gap-6">
      <div className="flex min-w-0 flex-1 gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Cookie size={22} /></div>
        <div><h2 className="font-black text-slate-900">BeeBuddy sử dụng cookie</h2><p className="mt-1 text-sm leading-6 text-slate-600">Cookie thiết yếu giúp duy trì đăng nhập. Cookie tùy chọn giúp ghi nhớ lựa chọn và cải thiện trải nghiệm. Xem <Link href="/cookies" className="font-bold text-orange-700 underline">chính sách cookie</Link>.</p></div>
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-2 md:mt-0">
        <button type="button" onClick={() => decide(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">Chỉ thiết yếu</button>
        <button type="button" onClick={() => decide(true)} className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Chấp nhận tất cả</button>
        <button type="button" onClick={() => setVisible(false)} aria-label="Đóng tạm thời" className="p-2 text-slate-400"><X size={18} /></button>
      </div>
    </section>
  );
}
