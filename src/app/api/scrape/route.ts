import { NextRequest, NextResponse } from "next/server";
import { scrapeWilayah } from "@/lib/scraper/kemdikbud";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    kodeWilayah,
    jenjang = "dikdas",
    status = "all",
    maxKabupaten = 5,
    maxKecamatan = 3,
    maxSekolah = 50,
    namaProvinsi,
    namaKabupaten,
    namaKecamatan,
    skipExisting = true,
    save = true,
  } = body ?? {};

  if (!kodeWilayah || typeof kodeWilayah !== "string") {
    return NextResponse.json(
      { error: "kodeWilayah wajib (contoh: 010000 untuk DKI Jakarta)" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Load NPSN yang sudah ada di DB untuk skip
    let skipNpsn: Set<string> | undefined;
    if (skipExisting) {
      const { data: existing } = await supabase.from("schools").select("npsn");
      skipNpsn = new Set((existing ?? []).map((r) => r.npsn).filter(Boolean) as string[]);
    }

    const results = await scrapeWilayah({
      kodeWilayah,
      jenjang,
      status,
      maxKabupaten,
      maxKecamatan,
      maxSekolah,
      namaProvinsi,
      namaKabupaten,
      namaKecamatan,
      skipNpsn,
    });

    if (save && results.length > 0) {
      const rows = results
        .filter((r) => r.npsn)
        .map((r) => ({ ...r, scraped_at: new Date().toISOString() }));

      const { error } = await supabase
        .from("schools")
        .upsert(rows, { onConflict: "npsn" });

      if (error) {
        return NextResponse.json(
          { error: `Gagal simpan: ${error.message}`, scraped: results.length },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      scraped: results.length,
      withEmail: results.filter((r) => r.email).length,
      skipped: skipNpsn?.size ?? 0,
      sample: results.slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
