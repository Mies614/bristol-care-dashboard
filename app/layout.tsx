import type { Metadata, Viewport } from "next";
import { AppBackground } from "@/components/AppBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bristol Care",
  description: "给 Bristol 留学生活的温柔小助手",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Bristol Care",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#f7b6a6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppBackground>{children}</AppBackground>
      </body>
    </html>
  );
}
