"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox, type ComboboxOption } from "@/components/Combobox";
import { PROVINSI } from "@/lib/wilayah/provinsi";
import { ScrapeProgressOverlay, type ScrapeProgress } from "@/components/ScrapeProgressOverlay";
import { Select } from "@/components/Select";

type Stats = {
  kode: string;
  total: number;
  negeri: number;
  swasta: number;
  alreadyScraped: number;
  withEmail: number;
  remaining: number;
  isSampled: boolean;
};

const PROVINSI_OPTIONS: ComboboxOption[] = PROVINSI.map((p) => ({
  value: p.kode,
  label: p.nama,
  sub: `Kode: ${p.kode}`,
}));

export default function ScraperPage() {
  const router = useRouter();
  const [jenjang, setJenjang] = useState("dikdas");
  const [provinsi, setProvinsi] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [kabupatenOpts, setKabupatenOpts] = useState<ComboboxOption[]>([]);
  const [kecamatanOpts, setKecamatanOpts] = useState<ComboboxOption[]>([]);
  const [loadingKab, setLoadingKab] = useState(false);
  const [loadingKec, setLoadingKec] = useState(false);
  const [status, setStatus] = useState("all");
  const [maxSekolah, setMaxSekolah] = useState(30);
  const [skipExisting, setSkipExisting] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [progress, setProgress] = useState<ScrapeProgress>({
    status: "preparing",
    current: 0,
    total: 0,
    message: "",
    recent: [],
  });
  const loading =
    overlayOpen && (progress.status === "running" || progress.status === "preparing");

  // Cascade provinsi → kabupaten
  useEffect(() => {
    if (!provinsi) {
      setKabupatenOpts([]);
      setKabupaten("");
      return;
    }
    setLoadingKab(true);
    setKabupaten("");
    setKecamatan("");
    setKecamatanOpts([]);
    setError(null);
    fetch(`/api/wilayah/kabupaten?provinsi=${provinsi}&jenjang=${jenjang}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setKabupatenOpts(
          (d.data as Array<{ kode: string; nama: string }>).map((k) => ({
            value: k.kode,
            label: k.nama,
            sub: `Kode: ${k.kode}`,
          })),
        );
      })
      .catch((e) => setError(`Gagal load kabupaten: ${e.message}`))
      .finally(() => setLoadingKab(false));
  }, [provinsi, jenjang]);

  // Cascade kabupaten → kecamatan
  useEffect(() => {
    if (!kabupaten) {
      setKecamatanOpts([]);
      setKecamatan("");
      return;
    }
    setLoadingKec(true);
    setKecamatan("");
    setError(null);
    fetch(`/api/wilayah/kecamatan?kabupaten=${kabupaten}&jenjang=${jenjang}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        const list = (d.data ?? []) as Array<{ kode: string; nama: string }>;
        setKecamatanOpts(
          list.map((k) => ({
            value: k.kode,
            label: k.nama,
            sub: `Kode: ${k.kode}`,
          })),
        );
        if (list.length === 0) {
          setError(
            "Daftar kecamatan kosong. Portal Kemdikdasmen mungkin sedang reject request, coba refresh atau tunggu beberapa menit.",
          );
        }
      })
      .catch((e) => setError(`Gagal load kecamatan: ${e.message}`))
      .finally(() => setLoadingKec(false));
  }, [kabupaten, jenjang]);

  // Auto-load stats saat wilayah berubah.
  // Pakai AbortController supaya request lama (mis. untuk kabupaten besar)
  // tidak overwrite request baru saat user pindah ke kecamatan spesifik.
  useEffect(() => {
    const kode = kecamatan || kabupaten;
    if (!kode) {
      setStats(null);
      return;
    }
    const ctrl = new AbortController();
    setLoadingStats(true);
    setStats(null);
    fetch(`/api/wilayah/stats?kode=${kode}&jenjang=${jenjang}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        // Defense in depth: kalau response dari kode lain (race condition),
        // jangan apply.
        if (d.kode !== kode) return;
        setStats(d as Stats);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setStats(null);
          setError(`Gagal load statistik: ${e.message}`);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoadingStats(false);
      });
    return () => ctrl.abort();
  }, [kecamatan, kabupaten, jenjang]);

  const selectedProvinsi = PROVINSI.find((p) => p.kode === provinsi);
  const selectedKabupaten = kabupatenOpts.find((k) => k.value === kabupaten);
  const selectedKecamatan = kecamatanOpts.find((k) => k.value === kecamatan);

  // Hitung target real berdasarkan filter status & skip
  const targetCount = stats
    ? (() => {
        let base =
          status === "n" ? stats.negeri : status === "s" ? stats.swasta : stats.total;
        if (skipExisting) {
          // approximate: tidak tahu persis berapa yang skipped per status, asumsi proporsional
          const skipRate = stats.total > 0 ? stats.alreadyScraped / stats.total : 0;
          base = Math.max(0, Math.round(base * (1 - skipRate)));
        }
        return base;
      })()
    : 0;

  async function handleScrape() {
    const kodeWilayah = kecamatan || kabupaten || provinsi;
    if (!kodeWilayah) {
      setError("Pilih provinsi/kabupaten/kecamatan dulu");
      return;
    }
    setError(null);
    setProgress({
      status: "preparing",
      current: 0,
      total: 0,
      message: "Mengirim request ke server...",
      recent: [],
    });
    setOverlayOpen(true);

    try {
      const res = await fetch("/api/scrape/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kodeWilayah,
          jenjang,
          status,
          maxSekolah,
          maxKabupaten: kabupaten ? 1 : 5,
          maxKecamatan: kecamatan ? 1 : 3,
          namaProvinsi: selectedProvinsi?.nama ?? null,
          namaKabupaten: selectedKabupaten?.label ?? null,
          namaKecamatan: selectedKecamatan?.label ?? null,
          skipExisting,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE: setiap event diakhiri "\n\n"
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
          } catch {
            // ignore malformed event
          }
        }
      }
    } catch (e) {
      setProgress((p) => ({
        ...p,
        status: "error",
        error: (e as Error).message,
      }));
    }
  }

  function handleSSEEvent(e: {
    type: string;
    [k: string]: unknown;
  }) {
    if (e.type === "start") {
      setProgress((p) => ({
        ...p,
        status: "running",
        total: (e.total as number) ?? 0,
        message: (e.message as string) ?? "",
      }));
    } else if (e.type === "progress") {
      const school = e.school as ScrapeProgress["recent"][number];
      setProgress((p) => ({
        ...p,
        status: "running",
        current: (e.current as number) ?? p.current,
        total: (e.total as number) ?? p.total,
        message: `Mengambil detail: ${school.nama}`,
        recent: [school, ...p.recent].slice(0, 10),
      }));
    } else if (e.type === "saved") {
      setProgress((p) => ({
        ...p,
        message: `${e.count} sekolah tersimpan ke database`,
      }));
    } else if (e.type === "done") {
      setProgress((p) => ({
        ...p,
        status: "done",
        message: "Selesai!",
        result: {
          scraped: (e.scraped as number) ?? 0,
          withEmail: (e.withEmail as number) ?? 0,
          skipped: (e.skipped as number) ?? 0,
        },
      }));
    } else if (e.type === "error") {
      setProgress((p) => ({
        ...p,
        status: "error",
        error: (e.message as string) ?? "Unknown error",
      }));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Scraper Kemendikdasmen</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Pilih jenjang & wilayah — data sekolah otomatis tersimpan ke database.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Jenjang</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { value: "dikdas", label: "SD / SMP", desc: "Pendidikan Dasar" },
              { value: "dikmen", label: "SMA / SMK", desc: "Pendidikan Menengah" },
              { value: "paud", label: "PAUD / TK", desc: "Anak Usia Dini" },
              { value: "dikti", label: "Perguruan Tinggi", desc: "Dikti" },
            ].map((j) => (
              <button
                key={j.value}
                type="button"
                onClick={() => setJenjang(j.value)}
                className={`text-left px-3.5 py-2.5 rounded-lg border transition-all ${
                  jenjang === j.value
                    ? "gradient-purple border-purple-700 shadow-purple"
                    : "bg-white border-slate-300 text-slate-700 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                <div className="text-sm font-semibold">{j.label}</div>
                <div className={`text-xs mt-0.5 ${jenjang === j.value ? "text-purple-100" : "text-slate-500"}`}>
                  {j.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Provinsi
            </label>
            <Combobox
              options={PROVINSI_OPTIONS}
              value={provinsi}
              onChange={setProvinsi}
              placeholder="Pilih provinsi..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Kabupaten / Kota{" "}
              <span className="text-xs font-normal text-slate-500">(opsional)</span>
            </label>
            <Combobox
              options={kabupatenOpts}
              value={kabupaten}
              onChange={setKabupaten}
              placeholder={
                !provinsi
                  ? "Pilih provinsi dulu"
                  : loadingKab
                  ? "Memuat..."
                  : "Semua kabupaten"
              }
              disabled={!provinsi || loadingKab}
              loading={loadingKab}
              emptyText="Tidak ada kabupaten ditemukan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Kecamatan{" "}
              <span className="text-xs font-normal text-slate-500">(opsional)</span>
            </label>
            <Combobox
              options={kecamatanOpts}
              value={kecamatan}
              onChange={setKecamatan}
              placeholder={
                !kabupaten
                  ? "Pilih kabupaten dulu"
                  : loadingKec
                  ? "Memuat..."
                  : "Semua kecamatan"
              }
              disabled={!kabupaten || loadingKec}
              loading={loadingKec}
              emptyText="Tidak ada kecamatan ditemukan"
            />
          </div>
        </div>

        {/* STATS PANEL */}
        {(loadingStats || stats) && (
          <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 animate-fade-in">
            {loadingStats ? (
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Menghitung sekolah di wilayah ini...
              </div>
            ) : stats ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Statistik Wilayah
                  </h3>
                  {stats.isSampled && (
                    <span className="text-xs text-purple-600 italic">
                      *sample dari beberapa kabupaten
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Sekolah"
                    value={stats.total}
                    color="purple"
                    active={status === "all"}
                  />
                  <StatCard
                    label="Negeri"
                    value={stats.negeri}
                    color="blue"
                    active={status === "n"}
                  />
                  <StatCard
                    label="Swasta"
                    value={stats.swasta}
                    color="amber"
                    active={status === "s"}
                  />
                  <StatCard
                    label="Sudah di-scrape"
                    value={stats.alreadyScraped}
                    color="green"
                    sub={`${stats.withEmail} ada email`}
                  />
                </div>
                {skipExisting && stats.alreadyScraped > 0 && (
                  <div className="mt-3 text-xs text-purple-700">
                    💡 Dengan opsi <strong>Lewati yang sudah ada</strong>, scraping akan ambil ~
                    <strong>{stats.remaining}</strong> sekolah baru saja.
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Status Sekolah
            </label>
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Semua" },
                { value: "n", label: "Negeri" },
                { value: "s", label: "Swasta" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Max Sekolah
            </label>
            <input
              type="number"
              min={5}
              max={500}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
              value={maxSekolah === 0 ? "" : maxSekolah}
              onChange={(e) => {
                const v = e.target.value.replace(/^0+(?=\d)/, "");
                setMaxSekolah(v === "" ? 0 : Number(v));
              }}
              onBlur={() => {
                if (maxSekolah < 5) setMaxSekolah(5);
                if (maxSekolah > 500) setMaxSekolah(500);
              }}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Max 500 (timeout protection).
            </p>
          </div>
        </div>

        <label
          className={`flex items-center gap-2.5 text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer transition-colors w-full ${
            skipExisting
              ? "bg-purple-50 border border-purple-200 text-purple-700"
              : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}
        >
          <input
            type="checkbox"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="accent-purple-600"
          />
          <div className="flex-1">
            <div>Lewati sekolah yang sudah pernah di-scrape</div>
            <div className="text-xs font-normal opacity-75 mt-0.5">
              Hemat waktu & request — tidak fetch ulang sekolah yang sudah ada di database
            </div>
          </div>
        </label>

        {(selectedProvinsi || selectedKabupaten || selectedKecamatan) && (
          <div className="rounded-lg gradient-purple-soft border border-purple-200 p-3.5 text-sm">
            <div className="font-medium text-purple-900 mb-1">Target scrape:</div>
            <div className="flex items-center gap-2 text-purple-800 flex-wrap">
              {selectedProvinsi && (
                <span className="bg-white/70 px-2 py-0.5 rounded text-xs">
                  {selectedProvinsi.nama}
                </span>
              )}
              {selectedKabupaten && (
                <>
                  <span className="text-purple-400">›</span>
                  <span className="bg-white/70 px-2 py-0.5 rounded text-xs">
                    {selectedKabupaten.label}
                  </span>
                </>
              )}
              {selectedKecamatan && (
                <>
                  <span className="text-purple-400">›</span>
                  <span className="bg-white/70 px-2 py-0.5 rounded text-xs">
                    {selectedKecamatan.label}
                  </span>
                </>
              )}
              <span className="text-purple-600 text-xs font-mono ml-auto">
                {kecamatan || kabupaten || provinsi}
              </span>
            </div>
            {stats && (
              <div className="mt-2 text-xs text-purple-700">
                Akan scrape sekitar <strong>{Math.min(targetCount, maxSekolah)}</strong>{" "}
                sekolah (dari estimasi {targetCount} match filter).
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleScrape}
          disabled={loading || !provinsi}
          className="gradient-purple disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-5 py-2.5 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Scraping... (bisa ~1 menit)
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Mulai Scrape
            </>
          )}
        </button>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5 flex gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

      </div>

      <ScrapeProgressOverlay
        open={overlayOpen}
        progress={progress}
        onClose={() => {
          setOverlayOpen(false);
          if (progress.status === "done" && progress.result?.scraped) {
            // Bawa filter wilayah lengkap supaya cascading dropdown
            // di halaman Sekolah ter-set dengan benar
            const params = new URLSearchParams();
            if (selectedProvinsi) params.set("provinsi", selectedProvinsi.nama);
            if (selectedKabupaten) params.set("kabupaten", selectedKabupaten.label);
            if (selectedKecamatan) params.set("kecamatan", selectedKecamatan.label);
            const qs = params.toString();
            router.push(`/sekolah${qs ? `?${qs}` : ""}`);
          }
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  active,
  sub,
}: {
  label: string;
  value: number;
  color: "purple" | "blue" | "amber" | "green";
  active?: boolean;
  sub?: string;
}) {
  const colorMap = {
    purple: { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-400" },
    blue: { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-400" },
    amber: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-400" },
    green: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-400" },
  };
  const c = colorMap[color];
  return (
    <div
      className={`rounded-lg bg-white border border-slate-200 px-3 py-2.5 transition-all ${
        active ? `ring-2 ${c.ring}` : ""
      }`}
    >
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={`text-2xl font-bold ${c.text}`}>{value.toLocaleString("id-ID")}</span>
        <span className={`inline-block w-2 h-2 rounded-full ${c.bg}`} />
      </div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
