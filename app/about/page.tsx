import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";

export default function AboutPage() {
  return (
    <AppShell>
      <PageHeader title="About" subtitle="一个为 Bristol 留学生活准备的专属小助手。" />
      <section className="soft-card space-y-3 text-sm leading-7 text-cocoa/75">
        {[
          "这是一个为 Bristol 留学生活做的专属生活首页，用来整理天气、穿衣建议、课程表、deadline、小纸条和常用链接。",
          "未开启云同步时，个人数据只保存在当前浏览器本地的 localStorage 中。",
          "开启 Supabase 云同步后，课程表、deadline、小纸条、常用链接、设置和小纸条图片会保存到你配置的 Supabase 项目。",
          "天气数据来自 Open-Meteo 免费接口，不需要申请 API key。",
          "本应用不做实时定位、监控、复杂账号系统或短信服务。"
        ].map((item) => (
          <p className="rounded-[1.25rem] border border-white/70 bg-white/55 px-4 py-3 shadow-sm" key={item}>{item}</p>
        ))}
      </section>
    </AppShell>
  );
}
