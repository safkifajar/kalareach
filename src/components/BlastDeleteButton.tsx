"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  blastId: string;
  namaBatch: string;
  status: string;
  variant?: "icon" | "full";
};

export function BlastDeleteButton({ blastId, namaBatch, status, variant = "icon" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Hanya boleh hapus draft & failed
  if (status !== "draft" && status !== "failed") return null;

  async function handleDelete(e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm(`Hapus blast "${namaBatch}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blast/${blastId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal hapus");
      startTransition(() => {
        router.refresh();
        // Kalau di halaman detail, kembali ke list
        if (window.location.pathname.startsWith(`/blast/${blastId}`)) {
          router.push("/blast");
        }
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-1.5 disabled:opacity-50"
        title={error ?? `Hapus blast (${status})`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleDelete}
        disabled={loading}
        className="bg-white hover:bg-red-50 border border-red-200 text-red-700 hover:border-red-400 disabled:opacity-50 rounded-lg px-3.5 py-1.5 text-sm font-medium inline-flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
        </svg>
        {loading ? "Menghapus..." : "Hapus Blast"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
