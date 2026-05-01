"use client";

import { useEffect } from "react";

export type BlastProgress = {
  status: "preparing" | "running" | "done" | "error";
  current: number;
  total: number;
  sukses: number;
  gagal: number;
  namaBatch: string;
  recent: Array<{
    nama: string;
    email: string;
    status: "sent" | "failed";
    error?: string;
  }>;
  blastId?: string;
  error?: string;
};

type Props = {
  open: boolean;
  progress: BlastProgress;
  onClose: () => void;
  onViewDetail?: () => void;
};

export function BlastProgressOverlay({ open, progress, onClose, onViewDetail }: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 border-b border-slate-100 flex items-center gap-3 ${
            progress.status === "error"
              ? "bg-red-50"
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
              {progress.status === "preparing" && "Menyiapkan blast..."}
              {progress.status === "running" && "Mengirim email..."}
              {progress.status === "done" && "Blast selesai!"}
              {progress.status === "error" && "Blast gagal"}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 truncate">
              {progress.namaBatch}
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

        {/* Progress bar + counters */}
        {progress.total > 0 && (
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                {progress.current.toLocaleString("id-ID")} / {progress.total.toLocaleString("id-ID")}{" "}
                <span className="text-slate-400 text-xs">email</span>
              </span>
              <span className="text-2xl font-bold text-purple-600 tabular-nums">{percent}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
              {progress.sukses > 0 && (
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${(progress.sukses / progress.total) * 100}%` }}
                />
              )}
              {progress.gagal > 0 && (
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{ width: `${(progress.gagal / progress.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-green-700 font-medium">
                ✓ {progress.sukses} terkirim
              </span>
              {progress.gagal > 0 && (
                <span className="text-red-700 font-medium">
                  ✗ {progress.gagal} gagal
                </span>
              )}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Email yang sedang dikirim
          </div>
          {progress.recent.length === 0 ? (
            <div className="text-sm text-slate-400 italic py-2">
              Menunggu email pertama...
            </div>
          ) : (
            <div className="space-y-1.5">
              {progress.recent.map((s, i) => (
                <div
                  key={i}
                  className={`bg-white border rounded-lg px-3 py-2 text-sm flex items-center justify-between gap-3 animate-fade-in ${
                    s.status === "failed" ? "border-red-200" : "border-slate-200"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{s.nama}</div>
                    <div className="text-xs text-slate-500 truncate">{s.email}</div>
                    {s.error && (
                      <div className="text-xs text-red-600 mt-0.5 truncate" title={s.error}>
                        {s.error}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {s.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Terkirim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Gagal
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {progress.status === "done" && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-700">
                  {progress.total}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Target</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {progress.sukses}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Terkirim</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {progress.gagal}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Gagal</div>
              </div>
            </div>
            <div className="flex gap-2">
              {onViewDetail && progress.blastId && (
                <button
                  onClick={onViewDetail}
                  className="flex-1 gradient-purple rounded-lg px-4 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all"
                >
                  Lihat Detail
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {progress.status === "error" && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              {progress.error ?? "Terjadi kesalahan"}
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
