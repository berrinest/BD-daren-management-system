"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import * as XLSX from "xlsx";

import { importTalents, type ImportTalentsState } from "@/app/(app)/data/actions";
import { TALENT_PLATFORM_LABELS, TALENT_PLATFORMS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS, TALENT_STAGES, TALENT_STAGE_LABELS } from "@/lib/constants";
import { normalizeImportHeader, TALENT_IMPORT_FIELDS, type TalentImportField } from "@/lib/data-transfer/talent-fields";
import { createTalentSchema, type CreateTalentInput } from "@/lib/validations";

type Mapping = Record<TalentImportField, string>;
type PreviewRow = { data?: CreateTalentInput; errors: string[]; rowNumber: number };

const initialState: ImportTalentsState = {};
const emptyMapping = Object.fromEntries(TALENT_IMPORT_FIELDS.map((field) => [field.key, ""])) as Mapping;

function matchValue<T extends readonly string[]>(value: unknown, options: T, labels?: Record<string, string>) {
  const normalized = normalizeImportHeader(value);
  return options.find((option) => normalizeImportHeader(option) === normalized || normalizeImportHeader(labels?.[option]) === normalized) ?? "";
}

function parseFollowerCount(value: unknown) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  if (!normalized) return "";
  const match = normalized.match(/^([\d]+(?:\.\d+)?)\s*(万|亿)?$/u);
  if (!match) return normalized;
  const multiplier = match[2] === "亿" ? 100000000 : match[2] === "万" ? 10000 : 1;
  return String(Math.round(Number(match[1]) * multiplier));
}

function ImportButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return <button className="rounded-lg bg-[#31594b] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]" disabled={pending || count === 0} type="submit">{pending ? "正在导入…" : `确认导入 ${count} 条`}</button>;
}

export function TalentImporter() {
  const [state, action] = useActionState(importTalents, initialState);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Mapping>(emptyMapping);
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [fileError, setFileError] = useState("");

  const preview = useMemo<PreviewRow[]>(() => rawRows.map((row, index) => {
    const get = (field: TalentImportField) => mapping[field] === "" ? "" : row[Number(mapping[field])] ?? "";
    const candidate = {
      follower_count: parseFollowerCount(get("follower_count")),
      nickname: String(get("nickname")),
      notes: String(get("notes")),
      platform_account: String(get("platform_account")),
      primary_platform: matchValue(get("primary_platform"), TALENT_PLATFORMS, TALENT_PLATFORM_LABELS),
      priority: matchValue(get("priority"), TALENT_PRIORITIES, TALENT_PRIORITY_LABELS) || "normal",
      profile_url: String(get("profile_url")),
      stage: matchValue(get("stage"), TALENT_STAGES, TALENT_STAGE_LABELS) || "not_contacted",
      tags: String(get("tags")).trim(),
      wechat: String(get("wechat")),
    };
    const parsed = createTalentSchema.safeParse(candidate);
    return parsed.success
      ? { data: parsed.data, errors: [], rowNumber: index + 2 }
      : { errors: parsed.error.issues.map((issue) => issue.message), rowNumber: index + 2 };
  }), [mapping, rawRows]);
  const validRows = preview.flatMap((row) => row.data ? [row.data] : []);
  const invalidCount = preview.length - validRows.length;

  async function readFile(file: File) {
    setFileError("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
      if (!sheet) throw new Error("文件中没有可读取的工作表");
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { blankrows: false, defval: "", header: 1, raw: false });
      if (matrix.length < 2) throw new Error("文件至少需要一行表头和一行达人数据");
      const sourceHeaders = matrix[0]?.map((value, index) => String(value).trim() || `未命名列 ${index + 1}`) ?? [];
      const rows = matrix.slice(1).filter((row) => row.some((value) => String(value).trim() !== "")).slice(0, 500);
      const detected = { ...emptyMapping };
      for (const field of TALENT_IMPORT_FIELDS) {
        const columnIndex = sourceHeaders.findIndex((header) => field.aliases.some((alias) => normalizeImportHeader(alias) === normalizeImportHeader(header)));
        detected[field.key] = columnIndex >= 0 ? String(columnIndex) : "";
      }
      setFileName(file.name);
      setHeaders(sourceHeaders);
      setMapping(detected);
      setRawRows(rows);
      if (matrix.length - 1 > 500) setFileError("文件超过 500 条，本次只读取前 500 条数据");
    } catch (error) {
      setFileName("");
      setHeaders([]);
      setRawRows([]);
      setFileError(error instanceof Error ? error.message : "文件读取失败");
    }
  }

  return <section className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm md:p-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">IMPORT</p><h2 className="mt-2 text-xl font-semibold text-[#26332e]">导入达人资料</h2><p className="mt-1 text-sm text-slate-500">上传 Excel 或 CSV，映射字段并预览确认后写入达人库。</p></div><label className="cursor-pointer rounded-lg border border-[#31594b] px-4 py-2.5 text-center text-sm font-semibold text-[#31594b] hover:bg-[#f4f6f4]">选择文件<input accept=".xlsx,.xls,.csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} type="file" /></label></div>
    {fileName ? <p className="mt-4 rounded-lg bg-[#f4f7f5] px-4 py-3 text-sm text-[#557064]">当前文件：{fileName} · 读取 {rawRows.length} 条</p> : null}
    {fileError ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">{fileError}</p> : null}
    {headers.length ? <>
      <div className="mt-6"><h3 className="text-sm font-semibold text-[#35443e]">字段映射</h3><p className="mt-1 text-xs text-slate-400">系统已自动匹配常见表头；如有错误，请选择正确的原文件列。</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{TALENT_IMPORT_FIELDS.map((field) => <label className="grid gap-1.5 text-xs font-medium text-[#557064]" key={field.key}>{field.label}{field.required ? " *" : ""}<select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-sm text-[#26332e]" onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))} value={mapping[field.key]}><option value="">{field.key === "priority" ? "默认普通" : field.key === "stage" ? "默认未联系" : "不导入"}</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>)}</div></div>
      <div className="mt-7 border-t border-[#edf0ee] pt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#35443e]">导入预览</h3><p className="mt-1 text-xs text-slate-400">有效 {validRows.length} 条 · 需修正 {invalidCount} 条 · 最多预览前 20 条</p></div></div><div className="mt-4 overflow-x-auto rounded-xl border border-[#e4e9e6]"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-[#f4f7f5] text-xs text-[#668074]"><tr><th className="px-3 py-3">行</th><th className="px-3 py-3">昵称</th><th className="px-3 py-3">平台</th><th className="px-3 py-3">赛道</th><th className="px-3 py-3">微信</th><th className="px-3 py-3">优先级</th><th className="px-3 py-3">校验</th></tr></thead><tbody>{preview.slice(0, 20).map((row) => <tr className="border-t border-[#edf0ee]" key={row.rowNumber}><td className="px-3 py-3 text-slate-400">{row.rowNumber}</td><td className="px-3 py-3">{row.data?.nickname ?? "—"}</td><td className="px-3 py-3">{row.data ? TALENT_PLATFORM_LABELS[row.data.primary_platform] : "—"}</td><td className="px-3 py-3">{row.data?.tags[0] ?? "—"}</td><td className="px-3 py-3">{row.data?.wechat ?? "—"}</td><td className="px-3 py-3">{row.data ? TALENT_PRIORITY_LABELS[row.data.priority] : "—"}</td><td className={`px-3 py-3 ${row.errors.length ? "text-red-600" : "text-emerald-700"}`}>{row.errors.length ? row.errors.join("；") : "可导入"}</td></tr>)}</tbody></table></div></div>
      <form action={action} className="mt-6 flex flex-col gap-3 border-t border-[#edf0ee] pt-5 sm:flex-row sm:items-center sm:justify-between"><input name="talents" type="hidden" value={JSON.stringify(validRows)} /><div>{state.error ? <p className="text-sm text-red-700" role="alert">{state.error}</p> : state.imported !== undefined ? <div className="text-sm text-emerald-800" role="status"><p>成功导入 {state.imported} 条，跳过重复 {state.skipped ?? 0} 条。</p>{state.duplicates?.length ? <details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">查看重复明细</summary><ul className="mt-2 list-disc pl-5">{state.duplicates.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}</div> : <p className="text-xs text-slate-400">错误行不会提交；服务端还会再次校验并检测重复达人。</p>}</div><ImportButton count={validRows.length} /></form>
    </> : <div className="mt-6 rounded-xl border border-dashed border-[#d6dfda] px-5 py-10 text-center text-sm text-slate-400">请选择包含表头的 Excel 或 CSV 文件。必需字段：达人昵称、主要平台、赛道。</div>}
  </section>;
}
