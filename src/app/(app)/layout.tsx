import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BrowserCaptureBridge } from "@/components/resources/browser-capture-bridge";
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
    <div className="min-h-screen md:pl-60">
      <AppSidebar />
      <div className="min-h-screen">
        <AppHeader email={data.claims.email as string | undefined} />
        <BrowserCaptureBridge />
        {children}
      </div>
    </div>
  );
}
