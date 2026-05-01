import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { ids, all_filtered } = body ?? {};

  const supabase = getSupabaseAdmin();

  // Mode 1: hapus berdasarkan list ID
  if (Array.isArray(ids) && ids.length > 0) {
    const { error, count } = await supabase
      .from("schools")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: count ?? 0 });
  }

  // Mode 2: hapus semua yang match filter (untuk bulk delete via filter)
  if (all_filtered && typeof all_filtered === "object") {
    let q = supabase.from("schools").delete({ count: "exact" });
    const f = all_filtered as Record<string, string>;
    if (f.provinsi) q = q.eq("provinsi", f.provinsi);
    if (f.kabupaten) q = q.eq("kabupaten", f.kabupaten);
    if (f.kecamatan) q = q.eq("kecamatan", f.kecamatan);
    if (f.q) q = q.or(`nama.ilike.%${f.q}%,npsn.ilike.%${f.q}%`);
    if (f.hasEmail === "1") q = q.not("email", "is", null);
    if (f.status === "negeri") q = q.ilike("status", "%negeri%");
    if (f.status === "swasta") q = q.ilike("status", "%swasta%");

    // Safety: minimal harus ada satu filter, tidak boleh delete-all tanpa filter
    if (!f.provinsi && !f.kabupaten && !f.kecamatan && !f.q && f.hasEmail !== "1" && !f.status) {
      return NextResponse.json(
        { error: "Minimal pilih satu filter untuk bulk delete" },
        { status: 400 },
      );
    }

    const { error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: count ?? 0 });
  }

  return NextResponse.json({ error: "ids[] atau all_filtered wajib" }, { status: 400 });
}
