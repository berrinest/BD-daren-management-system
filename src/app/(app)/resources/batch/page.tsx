import Link from "next/link";

import { BatchResourceForm } from "@/components/resources/batch-resource-form";

export default function BatchResourcesPage() {
  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl">
    <Link className="text-sm font-medium text-[#31594b]" href="/resources">← 返回资源池</Link>
    <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[#668074]">BATCH CAPTURE</p>
    <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">批量录入资源</h1>
    <p className="mt-2 text-sm text-slate-500">粘贴从 Excel 或在线表格整理的达人数据，预览确认后一次导入资源池。</p>
    <BatchResourceForm />
  </section></main>;
}
