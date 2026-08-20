"use client";

import { useState } from "react";

type Props = { label?: string; value: string };

export function CopyButton({ label = "复制", value }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <button aria-live="polite" className={`rounded-md border px-2 py-1 text-xs font-medium transition ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-[#d6dfda] bg-white text-[#31594b] hover:bg-[#f4f6f4]"}`} onClick={copy} type="button">{copied ? "✓ 已复制" : label}</button>;
}
