import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { School } from "@/lib/types";
import { SekolahTable } from "@/components/SekolahTable";
import {
  Pagination,
  ALLOWED_PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
} from "@/components/Pagination";
import { SekolahFilterForm } from "@/components/SekolahFilterForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{
  q?: string;
  hasEmail?: string;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
  page?: string;
  size?: string;
}>;

type FilterParams = {
  q?: string;
  hasEmail?: string;
  provinsi?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
};

async function loadSchools(params: FilterParams, page: number, pageSize: number) {
  const supabase = getSupabaseAdmin();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("schools")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

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

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { data: (data ?? []) as School[], total: count ?? 0 };
}

async function loadFilters() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("schools")
    .select("provinsi, kabupaten, kecamatan")
    .limit(10000);

  const provSet = new Set<string>();
  // Mapping: provinsi -> Set of kabupaten
  const kabByProv = new Map<string, Set<string>>();
  // Mapping: kabupaten -> Set of kecamatan
  const kecByKab = new Map<string, Set<string>>();

  for (const r of data ?? []) {
    if (r.provinsi) provSet.add(r.provinsi);
    if (r.provinsi && r.kabupaten) {
      if (!kabByProv.has(r.provinsi)) kabByProv.set(r.provinsi, new Set());
      kabByProv.get(r.provinsi)!.add(r.kabupaten);
    }
    if (r.kabupaten && r.kecamatan) {
      if (!kecByKab.has(r.kabupaten)) kecByKab.set(r.kabupaten, new Set());
      kecByKab.get(r.kabupaten)!.add(r.kecamatan);
    }
  }

  // Convert to plain object for serialization to client component
  const kabByProvObj: Record<string, string[]> = {};
  for (const [k, v] of kabByProv) kabByProvObj[k] = Array.from(v).sort();
  const kecByKabObj: Record<string, string[]> = {};
  for (const [k, v] of kecByKab) kecByKabObj[k] = Array.from(v).sort();

  return {
    provinsi: Array.from(provSet).sort(),
    kabByProv: kabByProvObj,
    kecByKab: kecByKabObj,
  };
}

export type SekolahFilters = Awaited<ReturnType<typeof loadFilters>>;

export default async function SekolahPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const requestedSize = Number(sp.size) || DEFAULT_PAGE_SIZE;
  const pageSize = (ALLOWED_PAGE_SIZES as readonly number[]).includes(requestedSize)
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  const filterParams: FilterParams = {
    q: sp.q,
    hasEmail: sp.hasEmail,
    provinsi: sp.provinsi,
    kabupaten: sp.kabupaten,
    kecamatan: sp.kecamatan,
    status: sp.status,
  };

  let schools: School[] = [];
  let totalSchools = 0;
  let filters: SekolahFilters = { provinsi: [], kabByProv: {}, kecByKab: {} };
  let error: string | null = null;
  try {
    const [schoolsResult, filtersResult] = await Promise.all([
      loadSchools(filterParams, page, pageSize),
      loadFilters(),
    ]);
    schools = schoolsResult.data;
    totalSchools = schoolsResult.total;
    filters = filtersResult;
  } catch (e) {
    error = (e as Error).message;
  }

  const totalPages = Math.max(1, Math.ceil(totalSchools / pageSize));

  // Build params untuk export & pagination
  const exportParams = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page" && k !== "size") exportParams.set(k, v);
  });

  const paginationExtraParams: Record<string, string> = {};
  Object.entries(filterParams).forEach(([k, v]) => {
    if (v) paginationExtraParams[k] = v;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Daftar Sekolah</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {totalSchools.toLocaleString("id-ID")} sekolah
            {totalPages > 1 && ` · halaman ${page} dari ${totalPages}`}
          </p>
        </div>
        <Link
          href={`/api/sekolah/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-purple-400 hover:text-purple-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </Link>
      </div>

      <SekolahFilterForm
        defaults={{
          q: sp.q,
          provinsi: sp.provinsi,
          kabupaten: sp.kabupaten,
          kecamatan: sp.kecamatan,
          status: sp.status,
          hasEmail: sp.hasEmail,
        }}
        filters={filters}
      />

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3.5">
          {error}
        </div>
      )}

      <SekolahTable
        schools={schools}
        filterParams={filterParams as Record<string, string>}
        hasActiveFilter={Object.values(filterParams).some((v) => v)}
      />
      {totalSchools > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalSchools}
            pageSize={pageSize}
            baseHref="/sekolah"
            extraParams={paginationExtraParams}
            itemLabel="sekolah"
          />
        </div>
      )}
    </div>
  );
}
