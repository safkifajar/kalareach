import { NextRequest, NextResponse } from "next/server";
import { fetchKecamatan } from "@/lib/scraper/wilayah";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const kode = req.nextUrl.searchParams.get("kabupaten");
  const jenjang = req.nextUrl.searchParams.get("jenjang") ?? "dikdas";
  if (!kode || !/^\d{6}$/.test(kode)) {
    return NextResponse.json({ error: "param kabupaten wajib (6 digit)" }, { status: 400 });
  }
  try {
    const data = await fetchKecamatan(kode, jenjang);
    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
