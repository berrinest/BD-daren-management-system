import Link from "next/link";

import { TalentForm } from "@/components/talents/talent-form";

import { createTalent } from "../actions";

type NewTalentPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewTalentPage({
  searchParams,
}: NewTalentPageProps) {
  const { error } = await searchParams;

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-4xl">
        <Link
          className="text-sm font-medium text-[#557064] hover:underline"
          href="/talents"
        >
          ← 返回达人库
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[#668074]">
          NEW TALENT
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">添加达人</h1>
        <p className="mt-2 text-sm text-slate-500">
          先记录必要资料，后续可以在达人详情中继续完善跟进。
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
          action={createTalent}
          cancelHref="/talents"
          submitLabel="保存达人"
        />
      </section>
    </main>
  );
}
