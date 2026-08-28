"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email(),
  next: z.string().optional(),
  password: z.string().min(1),
});

function safeLoginDestination(value: string | undefined) {
  if (!value?.startsWith("/agent/connect?")) return "/dashboard";
  try {
    const url = new URL(value, "http://local.invalid");
    return url.pathname === "/agent/connect" ? `${url.pathname}${url.search}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export async function login(formData: FormData) {
  const input = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
    password: formData.get("password"),
  });

  if (!input.success) {
    redirect("/login?error=请输入有效的邮箱和密码");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);

  if (error) {
    redirect("/login?error=邮箱或密码错误");
  }

  redirect(safeLoginDestination(input.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
