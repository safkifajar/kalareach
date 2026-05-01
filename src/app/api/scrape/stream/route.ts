import { NextRequest } from "next/server";
import { scrapeWilayah, type ScrapedSchool } from "@/lib/scraper/kemdikbud";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 menit untuk wilayah besar
export const dynamic = "force-dynamic";

type SSEEvent =
  | { type: "start"; total: number; message: string }
  | { type: "progress"; current: number; total: number; school: { npsn: string | null; nama: string; email: string | null; status: string | null } }
  | { type: "saved"; count: number }
  | { type: "done"; scraped: number; withEmail: number; skipped: number }
  | { type: "error"; message: string };

function sseEncode(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

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
  } = body ?? {};

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (e: SSEEvent) => controller.enqueue(enc.encode(sseEncode(e)));

      try {
        const supabase = getSupabaseAdmin();

        // Load NPSN yang sudah ada untuk skip
        let skipNpsn: Set<string> | undefined;
        if (skipExisting) {
          const { data: existing } = await supabase.from("schools").select("npsn");
          skipNpsn = new Set((existing ?? []).map((r) => r.npsn).filter(Boolean) as string[]);
        }

        send({
          type: "start",
          total: 0,
          message: "Menyiapkan daftar sekolah...",
        });

        const collected: ScrapedSchool[] = [];
        let firstProgress = true;

        const results = await scrapeWilayah(
          {
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
          },
          (school, current, total) => {
            if (firstProgress) {
              send({ type: "start", total, message: `Mulai scrape ${total} sekolah...` });
              firstProgress = false;
            }
            collected.push(school);
            send({
              type: "progress",
              current,
              total,
              school: {
                npsn: school.npsn,
                nama: school.nama,
                email: school.email,
                status: school.status,
              },
            });
          },
        );

        // Save ke DB
        if (results.length > 0) {
          const rows = results
            .filter((r) => r.npsn)
            .map((r) => ({ ...r, scraped_at: new Date().toISOString() }));
          const { error } = await supabase
            .from("schools")
            .upsert(rows, { onConflict: "npsn" });
          if (error) {
            send({ type: "error", message: `Gagal simpan: ${error.message}` });
            controller.close();
            return;
          }
          send({ type: "saved", count: rows.length });
        }

        send({
          type: "done",
          scraped: results.length,
          withEmail: results.filter((r) => r.email).length,
          skipped: skipNpsn?.size ?? 0,
        });
      } catch (e) {
        send({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
