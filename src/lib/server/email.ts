import "server-only";

// Thin wrapper around the Resend API. If RESEND_API_KEY isn't configured, sends are
// skipped (logged only) rather than failing, so the rest of the app works without it.
export async function sendEmail({ to, subject, html }: { to: string[]; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || to.length === 0) {
    console.log("[email] skipped (no RESEND_API_KEY or no recipients):", subject);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM_EMAIL || "WordNest <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("[email] send failed", res.status, await res.text());
  }
}
