import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(auth)/login/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    redirect("/login");
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-[#e7ebe8] bg-white px-6 py-4">
        <strong>星络 · BD达人管理</strong>
        <form action={signOut}>
          <button className="text-sm text-[#31594b]" type="submit">
            退出登录
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
