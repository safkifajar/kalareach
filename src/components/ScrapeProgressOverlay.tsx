"use client";

import { useEffect } from "react";

export type ScrapeProgress = {
  status: "preparing" | "running" | "done" | "error";
  current: number;
  total: number;
  message: string;
  recent: Array<{
    npsn: string | null;
    nama: string;
    email: string | null;
    status: string | null;
  }>;
  result?: { scraped: number; withEmail: number; skipped: number };
  error?: string;
};

type Props = {
  open: boolean;
  progress: ScrapeProgress;
  onClose: () => void;
};

export function ScrapeProgressOverlay({ open, progress, onClose }: Props) {
  // Cegah scroll body saat overlay aktif
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    // Block navigation saat scraping aktif
    const block = (e: BeforeUnloadEvent) => {
      if (progress.status === "running" || progress.status === "preparing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", block);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("beforeunload", block);
    };
  }, [open, progress.status]);

  if (!open) return null;

  const percent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const isFinished = progress.status === "done" || progress.status === "error";
  const isEmpty = progress.status === "done" && (progress.result?.scraped ?? 0) === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3 ${
            progress.status === "error"
              ? "bg-red-50"
              : isEmpty
              ? "bg-amber-50"
              : progress.status === "done"
              ? "bg-green-50"
              : "gradient-purple-soft"
          }`}
        >
          {progress.status === "running" || progress.status === "preparing" ? (
            <svg className="animate-spin w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isEmpty ? (
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : progress.status === "done" ? (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900">
              {progress.status === "preparing" && "Menyiapkan scraping..."}
              {progress.status === "running" && "Scraping sedang berjalan"}
              {progress.status === "done" && !isEmpty && "Scraping selesai!"}
              {progress.status === "done" && isEmpty && "Tidak ada data baru"}
              {progress.status === "error" && "Scraping gagal"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {isEmpty
                ? "Semua sekolah di wilayah ini sudah pernah di-scrape sebelumnya."
                : progress.message}
            </p>
          </div>
          {isFinished && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-lg p-1.5"
              aria-label="Tutup"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        {progress.total > 0 && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                {progress.current.toLocaleString("id-ID")} / {progress.total.toLocaleString("id-ID")}{" "}
                <span className="text-slate-400 text-xs">sekolah</span>
              </span>
              <span className="text-2xl font-bold text-purple-600 tabular-nums">{percent}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full gradient-purple transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent activity feed */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Sekolah yang sedang di-scrape
          </div>
          {progress.recent.length === 0 ? (
            <div className="text-sm text-slate-400 italic py-2">
              Menunggu data pertama...
            </div>
          ) : (
            <div className="space-y-1.5">
              {progress.recent.map((s, i) => (
                <div
                  key={`${s.npsn ?? i}-${i}`}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-3 animate-fade-in"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{s.nama}</div>
                    <div className="text-xs text-slate-500 font-mono">{s.npsn ?? "-"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {s.status && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          /negeri/i.test(s.status)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    )}
                    {s.email ? (
                      <span
                        className="text-purple-600 text-xs font-medium truncate max-w-[180px]"
                        title={s.email}
                      >
                        ✉ {s.email}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">tanpa email</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary saat selesai */}
        {progress.status === "done" && progress.result && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            {isEmpty ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-3 text-sm text-amber-900">
                <p className="font-medium mb-1">Tidak ada sekolah baru di-scrape</p>
                <p className="text-xs text-amber-800">
                  Semua sekolah di wilayah ini sudah pernah di-scrape sebelumnya. Untuk scrape ulang
                  (mis. update data), <strong>uncheck &quot;Lewati yang sudah ada&quot;</strong> di
                  konfigurasi scraper.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {progress.result.scraped}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Berhasil</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {progress.result.withEmail}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Punya Email</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-400">
                    {progress.result.skipped}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Dilewati</div>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full gradient-purple rounded-lg px-4 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
            >
              Selesai
            </button>
          </div>
        )}

        {progress.status === "error" && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              {progress.error ?? "Terjadi kesalahan tidak diketahui"}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Tutup
            </button>
          </div>
        )}

        {(progress.status === "running" || progress.status === "preparing") && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500 text-center">
              ⚠ Tunggu sampai selesai. Jangan tutup tab atau pindah halaman.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
