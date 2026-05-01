import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId) {
    return NextResponse.json({ error: "template_id wajib" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: tmpl, error } = await supabase
    .from("email_templates")
    .select("attachment_path, attachment_name")
    .eq("id", templateId)
    .single();

  if (error || !tmpl?.attachment_path) {
    return NextResponse.json({ error: "Tidak ada attachment" }, { status: 404 });
  }

  const { data: signed, error: sErr } = await supabase.storage
    .from("attachments")
    .createSignedUrl(tmpl.attachment_path, 60 * 60);

  if (sErr || !signed) {
    return NextResponse.json({ error: sErr?.message ?? "Gagal generate URL" }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    name: tmpl.attachment_name ?? "attachment.pdf",
  });
}
