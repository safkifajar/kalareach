import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { nama, subject, body_html, body_text } = body ?? {};
  if (!nama || !subject || !body_html) {
    return NextResponse.json({ error: "nama, subject, body_html wajib" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .update({
      nama,
      subject,
      body_html,
      body_text,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = getSupabaseAdmin();

  const { data: tmpl } = await supabase
    .from("email_templates")
    .select("attachment_path")
    .eq("id", id)
    .single();
  if (tmpl?.attachment_path) {
    await supabase.storage.from("attachments").remove([tmpl.attachment_path]);
  }

  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
