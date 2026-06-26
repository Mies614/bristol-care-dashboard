import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { AppBackground } from "@/components/AppBackground";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthRoleProvider } from "@/components/AuthRoleProvider";
import { getAuthenticatedRequestContext } from "@/lib/security/authenticatedRequestContext";
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

async function resolveAuthRole(): Promise<"owner" | "partner" | null> {
  try {
    const result = await getAuthenticatedRequestContext();
    if (result.ok && result.context.role) {
      return result.context.role;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await resolveAuthRole();

  return (
    <html lang="zh-CN">
      <body>
        <PwaRegister />
        <ThemeProvider>
          <AuthRoleProvider role={role}>
            <AppBackground>{children}</AppBackground>
          </AuthRoleProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!rounded-[var(--app-radius)] !border !border-[var(--app-card-border)] !bg-[var(--app-card-bg)] !text-[var(--app-text)] !shadow-float"
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
