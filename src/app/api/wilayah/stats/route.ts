import { NextRequest, NextResponse } from "next/server";
import { fetchKabupaten, fetchKecamatan, fetchSekolahByKecamatan } from "@/lib/scraper/wilayah";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Hitung jumlah sekolah per status (negeri/swasta) untuk suatu wilayah.
 * Sekaligus cek berapa NPSN yang sudah pernah di-scrape (ada di DB).
 *
 * Query:
 *   ?kode=XXXXXX&jenjang=dikdas
 *
 * Kode bisa provinsi/kabupaten/kecamatan. Untuk provinsi/kabupaten,
 * akan fetch semua kecamatan di bawahnya (lebih lambat — beri loading state).
 */
export async function GET(req: NextRequest) {
  const kode = req.nextUrl.searchParams.get("kode");
  const jenjang = req.nextUrl.searchParams.get("jenjang") ?? "dikdas";

  if (!kode || !/^\d{6}$/.test(kode)) {
    return NextResponse.json({ error: "param kode wajib (6 digit)" }, { status: 400 });
  }

  const isProvinsi = /^\d{2}0000$/.test(kode);
  const isKabupaten = /^\d{4}00$/.test(kode) && !isProvinsi;

  try {
    // Kumpulkan kode kecamatan
    let kecamatanKodes: string[] = [];
    if (isProvinsi) {
      const kabs = await fetchKabupaten(kode, jenjang);
      // Untuk provinsi, sample 3 kabupaten saja supaya tidak lambat
      const sampleKabs = kabs.slice(0, 3);
      const kecLists = await Promise.all(
        sampleKabs.map((k) => fetchKecamatan(k.kode, jenjang).catch(() => [])),
      );
      kecamatanKodes = kecLists.flat().map((k) => k.kode).slice(0, 5);
    } else if (isKabupaten) {
      const kecs = await fetchKecamatan(kode, jenjang);
      // Cap di 30 kecamatan supaya tidak terlalu lama untuk kabupaten besar
      kecamatanKodes = kecs.slice(0, 30).map((k) => k.kode);
    } else {
      // Kecamatan langsung
      kecamatanKodes = [kode];
    }

    // Fetch list sekolah parallel (max 5 concurrent)
    const allSekolah: Awaited<ReturnType<typeof fetchSekolahByKecamatan>> = [];
    const fetchErrors: string[] = [];
    const batchSize = 5;
    for (let i = 0; i < kecamatanKodes.length; i += batchSize) {
      const batch = kecamatanKodes.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((k) =>
          fetchSekolahByKecamatan(k, jenjang).catch((err: Error) => {
            fetchErrors.push(`${k}: ${err.message}`);
            return [];
          }),
        ),
      );
      results.forEach((r) => allSekolah.push(...r));
    }

    // Kalau semua kecamatan return 0 dan ada error, surface ke client
    if (allSekolah.length === 0 && fetchErrors.length > 0) {
      return NextResponse.json(
        {
          error: `Gagal ambil data dari portal: ${fetchErrors[0]}`,
          fetchErrors,
        },
        { status: 502 },
      );
    }

    const negeri = allSekolah.filter((s) => s.status === "NEGERI").length;
    const swasta = allSekolah.filter((s) => s.status === "SWASTA").length;
    const total = allSekolah.length;

    // Cek berapa NPSN yang sudah ada di DB
    let alreadyScraped = 0;
    let withEmail = 0;
    if (allSekolah.length > 0) {
      const supabase = getSupabaseAdmin();
      const npsns = allSekolah.map((s) => s.npsn);
      const { data: existing } = await supabase
        .from("schools")
        .select("npsn, email")
        .in("npsn", npsns);
      alreadyScraped = existing?.length ?? 0;
      withEmail = existing?.filter((e) => e.email).length ?? 0;
    }

    return NextResponse.json({
      kode,
      total,
      negeri,
      swasta,
      alreadyScraped,
      withEmail,
      remaining: total - alreadyScraped,
      isSampled: isProvinsi || (isKabupaten && kecamatanKodes.length >= 30),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
