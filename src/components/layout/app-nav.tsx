"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "今日工作台", icon: "⌂" },
  { href: "/talents", label: "达人库", icon: "♙" },
  { href: "/tasks", label: "任务中心", icon: "◇" },
  { href: "/data", label: "数据管理", icon: "⇅" },
  { href: "/settings", label: "设置", icon: "⚙" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="主导航" className="grid gap-1.5">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-white/12 text-white"
                : "text-[#b9cac3] hover:bg-white/8 hover:text-white"
            }`}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden className="w-5 text-center text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
