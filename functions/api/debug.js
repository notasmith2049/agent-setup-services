// Cloudflare Pages Function — Debug endpoint
// GET /api/debug — проверка переменных окружения (без раскрытия секретов)

export async function onRequest(context) {
  const { env } = context;

  return new Response(JSON.stringify({
    has_resend_key: !!env.RESEND_API_KEY,
    resend_key_prefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.substring(0, 6) + '...' : null,
    contact_email: env.CONTACT_EMAIL || 'not set (using default)',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
