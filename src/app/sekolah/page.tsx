import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { School } from "@/lib/types";
import { SekolahTable } from "@/components/SekolahTable";

type SearchParams = Promise<{
  q?: string;
  hasEmail?: string;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
}>;

async function loadSchools(params: {
  q?: string;
  hasEmail?: string;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.q) {
    query = query.or(`nama.ilike.%${params.q}%,npsn.ilike.%${params.q}%`);
  }
  if (params.hasEmail === "1") {
    query = query.not("email", "is", null);
  }
  if (params.provinsi) query = query.eq("provinsi", params.provinsi);
  if (params.kabupaten) query = query.eq("kabupaten", params.kabupaten);
  if (params.kecamatan) query = query.eq("kecamatan", params.kecamatan);
  if (params.status === "negeri") query = query.ilike("status", "%negeri%");
  if (params.status === "swasta") query = query.ilike("status", "%swasta%");

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as School[];
}

async function loadFilters() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("schools")
    .select("provinsi, kabupaten, kecamatan")
    .limit(5000);
  const provSet = new Set<string>();
  const kabSet = new Set<string>();
  const kecSet = new Set<string>();
  for (const r of data ?? []) {
    if (r.provinsi) provSet.add(r.provinsi);
    if (r.kabupaten) kabSet.add(r.kabupaten);
    if (r.kecamatan) kecSet.add(r.kecamatan);
  }
  return {
    provinsi: Array.from(provSet).sort(),
    kabupaten: Array.from(kabSet).sort(),
    kecamatan: Array.from(kecSet).sort(),
  };
}

export default async function SekolahPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  let schools: School[] = [];
  let filters = { provinsi: [] as string[], kabupaten: [] as string[], kecamatan: [] as string[] };
  let error: string | null = null;
  try {
    [schools, filters] = await Promise.all([loadSchools(sp), loadFilters()]);
  } catch (e) {
    error = (e as Error).message;
  }

  const filterParams: Record<string, string> = {};
  Object.entries(sp).forEach(([k, v]) => {
    if (v) filterParams[k] = v;
  });
  const exportParams = new URLSearchParams(filterParams).toString();
  const hasActiveFilter = Boolean(
    sp.q || sp.provinsi || sp.kabupaten || sp.kecamatan || sp.hasEmail === "1",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Daftar Sekolah</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {schools.length} sekolah ditampilkan (max 200).
          </p>
        </div>
        <Link
          href={`/api/sekolah/export?${exportParams}`}
          className="inline-flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-purple-400 hover:text-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </Link>
      </div>

      <form className="rounded-2xl bg-white border border-slate-200 p-4 lg:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Cari nama / NPSN
          </label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Ketik untuk mencari..."
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Provinsi
          </label>
          <select
            name="provinsi"
            defaultValue={sp.provinsi ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Semua</option>
            {filters.provinsi.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Kabupaten
          </label>
          <select
            name="kabupaten"
            defaultValue={sp.kabupaten ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Semua</option>
            {filters.kabupaten.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Kecamatan
          </label>
          <select
            name="kecamatan"
            defaultValue={sp.kecamatan ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Semua</option>
            {filters.kecamatan.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Status
          </label>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Semua</option>
            <option value="negeri">Negeri</option>
            <option value="swasta">Swasta</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-6 flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 px-4 py-2 rounded-lg bg-purple-50 border border-purple-200 cursor-pointer hover:bg-purple-100">
            <input
              type="checkbox"
              name="hasEmail"
              value="1"
              defaultChecked={sp.hasEmail === "1"}
              className="accent-purple-600"
            />
            Hanya yang ada email
          </label>
          <div className="flex gap-2">
            <Link
              href="/sekolah"
              className="text-sm text-slate-600 hover:text-purple-700 px-3 py-2"
            >
              Reset
            </Link>
            <button className="gradient-purple rounded-lg px-5 py-2 text-sm font-semibold shadow-purple hover:shadow-purple-lg transition-all">
              Filter
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}

      <SekolahTable schools={schools} filterParams={filterParams} hasActiveFilter={hasActiveFilter} />
    </div>
  );
}
