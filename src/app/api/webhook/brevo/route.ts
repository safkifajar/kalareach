import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Webhook handler untuk Brevo Transactional Events
// Docs: https://developers.brevo.com/docs/transactional-webhooks
//
// Brevo akan POST event ke endpoint ini setiap kali email yang kita kirim:
//   - delivered  → terkirim ke server email penerima
//   - opened     → email dibuka (tracking pixel)
//   - click      → link di email diklik
//   - hard_bounce / soft_bounce → email gagal terkirim ke inbox
//   - spam       → ditandai spam oleh penerima
//   - unsubscribed → user klik unsubscribe link
//
// Setup di Brevo Dashboard:
//   Transactional → Settings → Webhook → Add a new webhook
//   URL: https://kalareach.vercel.app/api/webhook/brevo
//   Events: pilih semua (delivered, opened, click, hard_bounce, soft_bounce, spam, unsubscribed)
//
// Brevo TIDAK kirim secret/auth header — kita validasi via message-id yang kita simpan saat kirim.

type BrevoEvent = {
  event: string;
  email: string;
  date: string;
  "message-id"?: string;
  ts?: number;
  ts_event?: number;
  reason?: string;
  link?: string;
  // ...field lain tergantung event
};

export async function POST(req: NextRequest) {
  let payload: BrevoEvent | BrevoEvent[];
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Brevo bisa kirim single event atau array — normalize ke array
  const events = Array.isArray(payload) ? payload : [payload];
  const supabase = getSupabaseAdmin();

  for (const evt of events) {
    const messageId = evt["message-id"];
    if (!messageId) continue;

    // Brevo message-id biasanya format <xxx@smtp-relay.mailin.fr>
    // Saat send, Brevo return juga dengan bracket. Kita match exact.
    const eventTime = evt.date
      ? new Date(evt.date).toISOString()
      : new Date().toISOString();

    const eventName = evt.event?.toLowerCase();

    try {
      switch (eventName) {
        case "delivered":
        case "request": // beberapa version Brevo pakai "request"
          await supabase
            .from("email_blast_logs")
            .update({ delivered_at: eventTime })
            .eq("message_id", messageId)
            .is("delivered_at", null);
          break;

        case "opened":
        case "unique_opened":
        case "first_opening":
          await incrementCounter(supabase, messageId, {
            opened_at: eventTime,
            counter: "open_count",
          });
          break;

        case "click":
        case "clicked":
          await incrementCounter(supabase, messageId, {
            clicked_at: eventTime,
            counter: "click_count",
          });
          break;

        case "hard_bounce":
        case "soft_bounce":
        case "blocked":
          await supabase
            .from("email_blast_logs")
            .update({
              status: "failed",
              bounced_at: eventTime,
              bounce_reason: `${eventName}${evt.reason ? `: ${evt.reason}` : ""}`,
            })
            .eq("message_id", messageId);
          break;

        case "spam":
          await supabase
            .from("email_blast_logs")
            .update({
              status: "spam",
              bounce_reason: "User marked as spam",
            })
            .eq("message_id", messageId);
          break;

        case "unsubscribed":
          // bisa dipakai untuk maintain blacklist nanti
          break;

        default:
          // Event tidak dikenal, abaikan
          break;
      }
    } catch (err) {
      // Jangan throw — log saja agar Brevo tidak retry endless
      console.error(`Webhook event ${eventName} failed:`, (err as Error).message);
    }
  }

  return NextResponse.json({ ok: true });
}

async function incrementCounter(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  messageId: string,
  opts: { opened_at?: string; clicked_at?: string; counter: "open_count" | "click_count" },
) {
  // Ambil count saat ini
  const { data: existing } = await supabase
    .from("email_blast_logs")
    .select("open_count, click_count, opened_at, clicked_at")
    .eq("message_id", messageId)
    .single();
  if (!existing) return;

  const update: Record<string, unknown> = {
    [opts.counter]: (existing[opts.counter] ?? 0) + 1,
  };
  // Set timestamp pertama kalau belum ada
  if (opts.opened_at && !existing.opened_at) update.opened_at = opts.opened_at;
  if (opts.clicked_at && !existing.clicked_at) update.clicked_at = opts.clicked_at;

  await supabase
    .from("email_blast_logs")
    .update(update)
    .eq("message_id", messageId);
}

// GET untuk testing webhook reachable
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Brevo webhook endpoint aktif. Kirim POST dari Brevo dashboard.",
  });
}
