import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { TalentForm } from "@/components/talents/talent-form";
import { createClient } from "@/lib/supabase/server";

import { updateTalent } from "../../actions";

type EditTalentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditTalentPage({
  params,
  searchParams,
}: EditTalentPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: talent, error: talentError } = await supabase
    .from("talents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (talentError || !talent) notFound();

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-4xl">
        <Link
          className="text-sm font-medium text-[#557064] hover:underline"
          href={`/talents/${talent.id}`}
        >
          ← 返回达人详情
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[#668074]">
          EDIT TALENT
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">编辑达人</h1>
        <p className="mt-2 text-sm text-slate-500">
          更新 {talent.nickname} 的基础资料与当前阶段。
        </p>
        {error ? (
          <p
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <TalentForm
          action={updateTalent}
          cancelHref={`/talents/${talent.id}`}
          initialValue={talent}
          submitLabel="保存修改"
        />
      </section>
    </main>
  );
}
