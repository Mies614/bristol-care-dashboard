"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/me/admin");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <p className="text-lg font-semibold text-cocoa">管理中心已经搬到我的小空间</p>
        <p className="mt-2 text-sm text-cocoa/60">
          正在前往{" "}
          <a href="/me/admin" className="text-sage underline">
            /me/admin
          </a>
          ...
        </p>
        <a href="/me/admin" className="btn-primary mt-4 inline-block">
          前往管理中心
        </a>
      </div>
    </div>
  );
}