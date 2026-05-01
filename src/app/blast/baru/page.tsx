"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BlastProgressOverlay, type BlastProgress } from "@/components/BlastProgressOverlay";

type Template = { id: string; nama: string; subject: string; attachment_name: string | null };
type School = {
  id: string;
  nama: string;
  email: string | null;
  provinsi: string | null;
  kabupaten: string | null;
  kecamatan: string | null;
  jenjang: string | null;
  status: string | null;
};
type Filters = {
  provinsi: string[];
  kabupaten: string[];
  kecamatan: string[];
  jenjang: string[];
  status: string[];
};

export default function BlastBaruPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [namaBatch, setNamaBatch] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [delayMs, setDelayMs] = useState(1500);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [progress, setProgress] = useState<BlastProgress>({
    status: "preparing",
    current: 0,
    total: 0,
    sukses: 0,
    gagal: 0,
    namaBatch: "",
    recent: [],
  });

  const [filters, setFilters] = useState<Filters>({
    provinsi: [],
    kabupaten: [],
    kecamatan: [],
    jenjang: [],
    status: [],
  });
  const [fProvinsi, setFProvinsi] = useState("");
  const [fKabupaten, setFKabupaten] = useState("");
  const [fKecamatan, setFKecamatan] = useState("");
  const [fJenjang, setFJenjang] = useState("");
  const [fStatus, setFStatus] = useState("");

  async function sendTest() {
    if (!templateId || !testEmail) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/blast/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, to_email: testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal kirim test");
      setTestResult({
        ok: true,
        message: `Email test terkirim ke ${data.to}${data.hasAttachment ? " (dengan lampiran)" : ""}. Cek inbox dalam 30 detik.`,
      });
    } catch (e) {
      setTestResult({ ok: false, message: (e as Error).message });
    } finally {
      setTestLoading(false);
    }
  }

  useEffect(() => {
    fetch("/api/blast/options")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setTemplates((d.templates ?? []) as Template[]);
        setSchools((d.schools ?? []) as School[]);
        if (d.filters) setFilters(d.filters as Filters);
      })
      .catch((e) => setError(`Gagal load data: ${e.message}`));
  }, []);

  // Apply filter ke list sekolah
  const filteredSchools = schools.filter((s) => {
    if (fProvinsi && s.provinsi !== fProvinsi) return false;
    if (fKabupaten && s.kabupaten !== fKabupaten) return false;
    if (fKecamatan && s.kecamatan !== fKecamatan) return false;
    if (fJenjang && s.jenjang !== fJenjang) return false;
    if (fStatus && s.status !== fStatus) return false;
    return true;
  });

  // Cascading filter: kabupaten options dipersempit oleh provinsi pilihan
  const kabupatenOptions = fProvinsi
    ? Array.from(
        new Set(
          schools.filter((s) => s.provinsi === fProvinsi).map((s) => s.kabupaten).filter(Boolean) as string[],
        ),
      ).sort()
    : filters.kabupaten;
  const kecamatanOptions = fKabupaten
    ? Array.from(
        new Set(
          schools.filter((s) => s.kabupaten === fKabupaten).map((s) => s.kecamatan).filter(Boolean) as string[],
        ),
      ).sort()
    : filters.kecamatan;

  function resetFilters() {
    setFProvinsi("");
    setFKabupaten("");
    setFKecamatan("");
    setFJenjang("");
    setFStatus("");
  }

  function selectAllFiltered() {
    setSelected(new Set(filteredSchools.map((s) => s.id)));
  }

  function deselectAllFiltered() {
    const next = new Set(selected);
    for (const s of filteredSchools) next.delete(s.id);
    setSelected(next);
  }

  const allFilteredSelected =
    filteredSchools.length > 0 && filteredSchools.every((s) => selected.has(s.id));
  const hasActiveFilter =
    !!(fProvinsi || fKabupaten || fKecamatan || fJenjang || fStatus);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submit() {
    if (dryRun) {
      // Mode dry-run: pakai endpoint lama (sync, cepat) untuk preview
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/blast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nama_batch: namaBatch,
            template_id: templateId,
            school_ids: Array.from(selected),
            delay_ms: delayMs,
            dry_run: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Gagal");
        setResult(data);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mode blast sungguhan: pakai SSE + overlay
    setError(null);
    setResult(null);
    setProgress({
      status: "preparing",
      current: 0,
      total: 0,
      sukses: 0,
      gagal: 0,
      namaBatch,
      recent: [],
    });
    setOverlayOpen(true);

    try {
      const res = await fetch("/api/blast/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_batch: namaBatch,
          template_id: templateId,
          school_ids: Array.from(selected),
          delay_ms: delayMs,
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

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            handleSSEEvent(JSON.parse(line.slice(6)));
          } catch {
            // ignore malformed
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

  function handleSSEEvent(e: { type: string; [k: string]: unknown }) {
    if (e.type === "start") {
      setProgress((p) => ({
        ...p,
        status: "running",
        total: (e.total as number) ?? 0,
        namaBatch: (e.nama_batch as string) ?? p.namaBatch,
      }));
    } else if (e.type === "progress") {
      const school = e.school as BlastProgress["recent"][number];
      setProgress((p) => ({
        ...p,
        status: "running",
        current: (e.current as number) ?? p.current,
        total: (e.total as number) ?? p.total,
        sukses: (e.sukses as number) ?? p.sukses,
        gagal: (e.gagal as number) ?? p.gagal,
        recent: [school, ...p.recent].slice(0, 10),
      }));
    } else if (e.type === "done") {
      setProgress((p) => ({
        ...p,
        status: "done",
        blastId: e.blast_id as string,
        sukses: (e.sukses as number) ?? p.sukses,
        gagal: (e.gagal as number) ?? p.gagal,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Blast Baru</h1>
        <p className="text-sm text-slate-500 mt-1.5">
          Pilih template & penerima, lalu kirim email batch.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 lg:p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Konfigurasi Blast</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Nama Batch
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
              placeholder="Penawaran SD Jakarta Utara — April 2026"
              value={namaBatch}
              onChange={(e) => setNamaBatch(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Label internal untuk tracking — tidak terkirim ke penerima.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Template Email
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm bg-white"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">— pilih template —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                  {t.attachment_name ? "  📎" : ""}
                </option>
              ))}
            </select>
            {templateId && templates.find((t) => t.id === templateId)?.attachment_name && (
              <p className="text-xs text-purple-700 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                Lampiran: {templates.find((t) => t.id === templateId)?.attachment_name}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Jeda Antar Email
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={500}
                max={10000}
                step={100}
                className="w-32 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
                value={delayMs === 0 ? "" : delayMs}
                onChange={(e) => {
                  const v = e.target.value.replace(/^0+(?=\d)/, "");
                  setDelayMs(v === "" ? 0 : Number(v));
                }}
                onBlur={() => {
                  if (delayMs < 500) setDelayMs(500);
                  if (delayMs > 10000) setDelayMs(10000);
                }}
              />
              <span className="text-sm text-slate-600">ms</span>
              <span className="text-xs text-slate-400">
                ≈ {Math.round(60000 / Math.max(delayMs, 500))} email/menit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Disarankan 1500ms agar tidak dianggap spam oleh provider email.
            </p>
          </div>
        </div>

        {/* Dry run alert — terpisah supaya menonjol */}
        <label
          className={`flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors border-2 ${
            dryRun
              ? "bg-amber-50 border-amber-300"
              : "bg-red-50 border-red-300"
          }`}
        >
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="accent-purple-600 mt-0.5"
          />
          <div className="flex-1">
            <div
              className={`text-sm font-semibold ${
                dryRun ? "text-amber-900" : "text-red-900"
              }`}
            >
              {dryRun ? "Mode Dry Run (Aman)" : "Mode Kirim Sungguhan"}
            </div>
            <div
              className={`text-xs mt-0.5 ${
                dryRun ? "text-amber-700" : "text-red-700"
              }`}
            >
              {dryRun
                ? "Hanya preview hasil rendering — tidak benar-benar mengirim email."
                : "Email akan dikirim ke semua sekolah yang dipilih. Pastikan template sudah benar."}
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-purple-soft flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Test Kirim ke Email Sendiri</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kirim email contoh ke alamat Anda dulu untuk cek tampilan & lampiran sebelum blast massal.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            type="email"
            placeholder="email-anda@gmail.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 min-w-[240px] border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
          />
          <button
            onClick={sendTest}
            disabled={!templateId || !testEmail || testLoading}
            className="bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-2"
          >
            {testLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mengirim...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Kirim Test
              </>
            )}
          </button>
        </div>

        {!templateId && (
          <p className="text-xs text-amber-700">
            Pilih template dulu di atas untuk bisa test.
          </p>
        )}

        {testResult && (
          <div
            className={`text-sm rounded-lg p-3 flex gap-2 ${
              testResult.ok
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {testResult.ok ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="font-semibold text-slate-900">
              Pilih Penerima{" "}
              <span className="text-purple-600">
                ({selected.size}/{filteredSchools.length}
                {hasActiveFilter && schools.length !== filteredSchools.length
                  ? ` dari ${schools.length}`
                  : ""}
                )
              </span>
            </h2>
            <div className="flex items-center gap-3">
              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Reset filter
                </button>
              )}
              <button
                onClick={allFilteredSelected ? deselectAllFiltered : selectAllFiltered}
                className="text-sm text-purple-600 font-medium hover:text-purple-700 hover:underline"
              >
                {allFilteredSelected
                  ? "Hapus pilihan ini"
                  : `Pilih semua${hasActiveFilter ? " (hasil filter)" : ""}`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <FilterField label="Provinsi">
              <select
                value={fProvinsi}
                onChange={(e) => {
                  setFProvinsi(e.target.value);
                  setFKabupaten("");
                  setFKecamatan("");
                }}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua</option>
                {filters.provinsi.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Kabupaten">
              <select
                value={fKabupaten}
                onChange={(e) => {
                  setFKabupaten(e.target.value);
                  setFKecamatan("");
                }}
                disabled={!fProvinsi && filters.kabupaten.length > 50}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!fProvinsi && filters.kabupaten.length > 50 ? "Pilih provinsi" : "Semua"}
                </option>
                {kabupatenOptions.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Kecamatan">
              <select
                value={fKecamatan}
                onChange={(e) => setFKecamatan(e.target.value)}
                disabled={!fKabupaten}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!fKabupaten ? "Pilih kabupaten" : "Semua"}
                </option>
                {kecamatanOptions.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Jenjang">
              <select
                value={fJenjang}
                onChange={(e) => setFJenjang(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua</option>
                {filters.jenjang.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Status">
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua</option>
                {filters.status.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FilterField>
          </div>
        </div>
        {!hasActiveFilter ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full gradient-purple-soft flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">Pakai filter dulu untuk lihat penerima</p>
            <p className="text-sm text-slate-500 mt-1">
              Pilih provinsi / kabupaten / jenjang / status di atas, atau ketik nama / email.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Total sekolah dengan email tersedia:{" "}
              <strong className="text-slate-600">{schools.length.toLocaleString("id-ID")}</strong>
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {filteredSchools.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${
                      selected.has(s.id) ? "bg-purple-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => toggle(s.id)}
                  >
                    <td className="p-3 w-8 pl-5">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-purple-600"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{s.nama}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.jenjang && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            {s.jenjang}
                          </span>
                        )}
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
                      </div>
                    </td>
                    <td className="p-3 text-purple-600 text-xs">{s.email}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {s.kecamatan && <div>{s.kecamatan}</div>}
                      {s.kabupaten && <div className="text-slate-400">{s.kabupaten}</div>}
                    </td>
                  </tr>
                ))}
                {filteredSchools.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-slate-500">
                      Tidak ada sekolah yang match filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}
      {result !== null ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Hasil</h3>
          <pre className="text-xs bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}

      <button
        onClick={submit}
        disabled={loading || !namaBatch || !templateId || selected.size === 0}
        className="gradient-purple disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Memproses...
          </>
        ) : dryRun ? (
          `Preview ${selected.size} email`
        ) : (
          `Kirim ke ${selected.size} sekolah`
        )}
      </button>
      <BlastProgressOverlay
        open={overlayOpen}
        progress={progress}
        onClose={() => {
          setOverlayOpen(false);
          if (progress.status === "done") {
            router.push("/blast");
          }
        }}
        onViewDetail={
          progress.blastId
            ? () => {
                setOverlayOpen(false);
                router.push(`/blast/${progress.blastId}`);
              }
            : undefined
        }
      />
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
