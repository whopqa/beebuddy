import type { Metadata } from "next";
import "./globals.css";
import "./figma-components.css";
import "./feature-support.css";
import "./figma-home.css";
import "./figma-home-intro.css";
import "./figma-login.css";
import "./figma-settings-panel.css";
import "./figma-get-started.css";
import "./figma-community-members.css";
import CookieConsentBanner from "@/components/beebuddy/CookieConsentBanner";

export const metadata: Metadata = {
  title: "Beebuddy — Connect with your people",
  description: "Find your people, share your stories, and make every journey more meaningful.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased selection:bg-orange-200 selection:text-black">
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
