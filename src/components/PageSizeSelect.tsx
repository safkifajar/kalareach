"use client";

import { useRouter } from "next/navigation";
import { Select } from "./Select";

type Props = {
  value: number;
  options: readonly number[];
  defaultSize: number;
  baseHref: string;
  extraParams?: Record<string, string>;
};

export function PageSizeSelect({
  value,
  options,
  defaultSize,
  baseHref,
  extraParams = {},
}: Props) {
  const router = useRouter();

  function buildHref(size: number): string {
    const params = new URLSearchParams(extraParams);
    if (size !== defaultSize) params.set("size", String(size));
    // Reset ke page 1 saat ganti size
    params.delete("page");
    const qs = params.toString();
    return `${baseHref}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="w-20">
      <Select
        value={String(value)}
        onChange={(v) => router.push(buildHref(Number(v)))}
        options={options.map((s) => ({ value: String(s), label: String(s) }))}
      />
    </div>
  );
}
