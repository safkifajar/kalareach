import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nama, subject, body_html, body_text } = body ?? {};
  if (!nama || !subject || !body_html) {
    return NextResponse.json({ error: "nama, subject, body_html wajib" }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("email_templates")
    .insert({ nama, subject, body_html, body_text })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
