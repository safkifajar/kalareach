import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — Brevo support up to 7MB total per email

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const templateId = form.get("template_id") as string | null;

  if (!file) return NextResponse.json({ error: "File wajib" }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: "template_id wajib" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${templateId}/${Date.now()}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("attachments")
    .upload(path, buf, {
      contentType: file.type || "application/pdf",
      upsert: true,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: tErr } = await supabase
    .from("email_templates")
    .update({
      attachment_path: path,
      attachment_name: file.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId);
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path, name: file.name });
}

export async function DELETE(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("template_id");
  if (!templateId) return NextResponse.json({ error: "template_id wajib" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("attachment_path")
    .eq("id", templateId)
    .single();

  if (tmpl?.attachment_path) {
    await supabase.storage.from("attachments").remove([tmpl.attachment_path]);
  }
  await supabase
    .from("email_templates")
    .update({ attachment_path: null, attachment_name: null })
    .eq("id", templateId);

  return NextResponse.json({ ok: true });
}
