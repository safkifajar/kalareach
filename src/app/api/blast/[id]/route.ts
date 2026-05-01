import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  // Cek status dulu — hanya boleh hapus draft / failed (yang done jangan, biar history terjaga)
  const { data: blast, error: gErr } = await supabase
    .from("email_blasts")
    .select("status")
    .eq("id", id)
    .single();
  if (gErr || !blast) {
    return NextResponse.json({ error: "Blast tidak ditemukan" }, { status: 404 });
  }
  if (blast.status === "running") {
    return NextResponse.json(
      { error: "Tidak bisa hapus blast yang sedang berjalan" },
      { status: 400 },
    );
  }
  if (blast.status === "done") {
    return NextResponse.json(
      { error: "Blast yang sudah selesai (done) tidak bisa dihapus untuk menjaga history" },
      { status: 400 },
    );
  }

  // Logs ikut terhapus karena cascade (lihat schema.sql)
  const { error } = await supabase.from("email_blasts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
