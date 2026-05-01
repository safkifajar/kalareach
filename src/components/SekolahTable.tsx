"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { School } from "@/lib/types";

type Props = {
  schools: School[];
  filterParams: Record<string, string>;
  hasActiveFilter: boolean;
};

export function SekolahTable({ schools, filterParams, hasActiveFilter }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === schools.length) setSelected(new Set());
    else setSelected(new Set(schools.map((s) => s.id)));
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Hapus ${selected.size} sekolah terpilih? Tindakan ini tidak bisa dibatalkan.`)) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/sekolah", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal hapus");
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAllFiltered() {
    if (!hasActiveFilter) {
      setError("Aktifkan filter dulu (provinsi/kabupaten/kecamatan/pencarian) untuk bulk delete");
      return;
    }
    const filterDesc = Object.entries(filterParams)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    if (
      !confirm(
        `Hapus SEMUA sekolah yang match filter ini?\n\n${filterDesc}\n\nIni akan menghapus lebih dari ${schools.length} sekolah (mungkin juga di luar yang ditampilkan). Tidak bisa dibatalkan.`,
      )
    )
      return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/sekolah", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_filtered: filterParams }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal hapus");
      alert(`Berhasil menghapus ${data.deleted} sekolah.`);
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function deleteOne(id: string, nama: string) {
    if (!confirm(`Hapus sekolah "${nama}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/sekolah", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal hapus");
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {(selected.size > 0 || hasActiveFilter) && (
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-purple-900">
            {selected.size > 0 ? (
              <>
                <strong>{selected.size}</strong> sekolah dipilih
              </>
            ) : (
              <span className="text-purple-700">
                Filter aktif — bisa hapus semua yang match filter sekaligus
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-3.5 py-1.5 font-medium inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
                </svg>
                Hapus {selected.size} terpilih
              </button>
            )}
            {hasActiveFilter && (
              <button
                onClick={deleteAllFiltered}
                disabled={deleting}
                className="text-sm bg-white hover:bg-red-50 border border-red-200 text-red-700 hover:border-red-400 disabled:opacity-50 rounded-lg px-3.5 py-1.5 font-medium inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
                </svg>
                Hapus SEMUA hasil filter
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}

      <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3.5 w-10">
                <input
                  type="checkbox"
                  checked={schools.length > 0 && selected.size === schools.length}
                  onChange={toggleAll}
                  className="accent-purple-600"
                  aria-label="Pilih semua"
                />
              </th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">NPSN</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Nama</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Wilayah</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Jenjang & Status</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Email</th>
              <th className="text-left p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Website</th>
              <th className="text-right p-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wide w-16">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr
                key={s.id}
                className={`border-b border-slate-100 last:border-0 transition-colors ${
                  selected.has(s.id) ? "bg-purple-50" : "hover:bg-purple-50/30"
                }`}
              >
                <td className="p-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    className="accent-purple-600"
                    aria-label={`Pilih ${s.nama}`}
                  />
                </td>
                <td className="p-3.5 text-xs text-slate-600 font-mono">{s.npsn ?? "-"}</td>
                <td className="p-3.5 font-medium text-slate-900">{s.nama}</td>
                <td className="p-3.5 text-xs">
                  {s.kecamatan || s.kabupaten || s.provinsi ? (
                    <div className="space-y-0.5">
                      {s.kecamatan && <div className="text-slate-700">{s.kecamatan}</div>}
                      {s.kabupaten && <div className="text-slate-500">{s.kabupaten}</div>}
                      {s.provinsi && <div className="text-slate-400">{s.provinsi}</div>}
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-3.5">
                  <div className="flex flex-wrap gap-1">
                    {s.jenjang && (
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                        {s.jenjang}
                      </span>
                    )}
                    {s.status && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${
                          /negeri/i.test(s.status)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    )}
                    {!s.jenjang && !s.status && <span className="text-slate-400">-</span>}
                  </div>
                </td>
                <td className="p-3.5">
                  {s.email ? (
                    <span className="text-purple-600 font-medium text-xs">{s.email}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-3.5 text-xs">
                  {s.website ? (
                    <a
                      href={
                        s.website.startsWith("http") ? s.website : `https://${s.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800 hover:underline inline-flex items-center gap-1"
                      title="Website sekolah"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="truncate max-w-[160px]">{s.website}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => deleteOne(s.id, s.nama)}
                    disabled={deleting}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded p-1.5 disabled:opacity-50"
                    title="Hapus sekolah ini"
                    aria-label={`Hapus ${s.nama}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {schools.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-full gradient-purple-soft flex items-center justify-center">
                      <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-slate-700 font-medium">Belum ada data sekolah</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Mulai dari{" "}
                        <Link href="/scraper" className="text-purple-600 font-medium hover:underline">
                          Scraper
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
