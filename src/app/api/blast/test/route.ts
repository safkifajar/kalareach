import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { renderTemplate, sendEmailBrevo, type BrevoAttachment } from "@/lib/email/brevo";

export const runtime = "nodejs";
export const maxDuration = 30;

const SAMPLE = {
  nama_sekolah: "SMP YA BAKII 2 KESUGIHAN (TEST)",
  npsn: "20300123",
  kabupaten: "Kab. Cilacap",
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { template_id, to_email } = body ?? {};

  if (!template_id || !to_email) {
    return NextResponse.json(
      { error: "template_id dan to_email wajib" },
      { status: 400 },
    );
  }
  if (!/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(to_email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: tmpl, error: tErr } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", template_id)
    .single();
  if (tErr || !tmpl) {
    return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
  }

  let attachments: BrevoAttachment[] | undefined;
  if (tmpl.attachment_path) {
    const { data: signed } = await supabase.storage
      .from("attachments")
      .createSignedUrl(tmpl.attachment_path, 60 * 60 * 24);
    if (signed?.signedUrl) {
      attachments = [
        {
          name: tmpl.attachment_name ?? "Proposal.pdf",
          url: signed.signedUrl,
        },
      ];
    }
  }

  try {
    const result = await sendEmailBrevo({
      to: { email: to_email, name: "Test Recipient" },
      subject: "[TEST] " + renderTemplate(tmpl.subject, SAMPLE),
      htmlContent: renderTemplate(tmpl.body_html, SAMPLE),
      textContent: tmpl.body_text ? renderTemplate(tmpl.body_text, SAMPLE) : undefined,
      attachments,
    });
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      to: to_email,
      hasAttachment: !!attachments,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
