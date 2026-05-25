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
          "相册当前为免登录模式，拥有链接的人可以查看和上传相册内容，请不要公开分享链接，也不要上传特别敏感的照片。",
          "天气数据来自 Open-Meteo 免费接口，不需要申请 API key。",
          "课程和 DDL 的手机提醒通过 .ics 日历文件实现。导入后由手机系统日历负责提醒，不需要额外 API。修改课程或 DDL 后，需要重新导出日历提醒。",
          "本应用不做实时定位、监控、复杂账号系统或短信服务。"
        ].map((item) => (
          <p className="rounded-[1.25rem] border border-white/70 bg-white/55 px-4 py-3 shadow-sm" key={item}>{item}</p>
        ))}
      </section>
    </AppShell>
  );
}
