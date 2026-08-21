import { TalentExportForm } from "@/components/data/talent-export-form";
import { TalentImporter } from "@/components/data/talent-importer";

export default function DataPage() {
  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl"><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">DATA CENTER</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">达人数据导入导出中心</h1><p className="mt-2 text-sm text-slate-500">批量整理达人资料，导入前完成字段映射与数据校验，并按条件导出备份。</p><div className="mt-6 grid gap-6"><TalentImporter /><TalentExportForm /></div></section></main>;
}
