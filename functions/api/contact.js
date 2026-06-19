// Cloudflare Pages Function — Contact Form API
// Endpoint: POST /api/contact
// Статика раздаётся Cloudflare Pages автоматически
//
// Переменные окружения (настроить в Cloudflare Dashboard → Pages → agent-setup-services → Settings → Environment variables):
//   RESEND_API_KEY: API ключ от Resend (re_...)
//   CONTACT_EMAIL: куда отправлять заявки (по умолч. delevchuk@gmail.com)

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET /api/debug — проверка переменных окружения
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.pathname === '/api/debug') {
      return new Response(JSON.stringify({
        has_resend_key: !!env.RESEND_API_KEY,
        resend_key_prefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.substring(0, 6) + '...' : null,
        contact_email: env.CONTACT_EMAIL || 'not set (using default)',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    return new Response('Not Found', { status: 404 });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { name, email, message } = await request.json();

    // Валидация
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (!name || name.length < 1 || name.length > 100) {
      return new Response(JSON.stringify({ error: 'Name is required (1-100 chars)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Message must be 10-5000 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const toEmail = env.CONTACT_EMAIL || 'delevchuk@gmail.com';

    // Отправка через Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Contact Form <onboarding@resend.dev>',
        to: [toEmail],
        replyTo: email,
        subject: `New message from ${name} (via agent-setup-services)`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `<h2>New contact message</h2>
<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p><strong>Message:</strong></p>
<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
