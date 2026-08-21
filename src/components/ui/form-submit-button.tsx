"use client";

import { useFormStatus } from "react-dom";

type Props = {
  className: string;
  label: string;
  pendingLabel: string;
};

export function FormSubmitButton({ className, label, pendingLabel }: Props) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} type="submit">{pending ? pendingLabel : label}</button>;
}
