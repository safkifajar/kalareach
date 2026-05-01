import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const supabase = getSupabaseAdmin();

  let query = supabase.from("schools").select("*").order("nama").limit(10000);
  if (sp.get("q")) {
    const q = sp.get("q")!;
    query = query.or(`nama.ilike.%${q}%,npsn.ilike.%${q}%`);
  }
  if (sp.get("hasEmail") === "1") query = query.not("email", "is", null);
  if (sp.get("provinsi")) query = query.eq("provinsi", sp.get("provinsi")!);
  if (sp.get("kabupaten")) query = query.eq("kabupaten", sp.get("kabupaten")!);
  if (sp.get("kecamatan")) query = query.eq("kecamatan", sp.get("kecamatan")!);
  if (sp.get("status") === "negeri") query = query.ilike("status", "%negeri%");
  if (sp.get("status") === "swasta") query = query.ilike("status", "%swasta%");

  const { data, error } = await query;
  if (error) return new Response(error.message, { status: 500 });

  const rows = data ?? [];
  const headers = ["npsn", "nama", "jenjang", "status", "provinsi", "kabupaten", "kecamatan", "email", "website", "alamat"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape((r as Record<string, unknown>)[h])).join(","));
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sekolah-${Date.now()}.csv"`,
    },
  });
}
