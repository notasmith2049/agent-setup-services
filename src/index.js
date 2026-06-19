// Cloudflare Worker — Contact Form API + Static Assets
// Endpoint: POST /api/contact
// Всё остальное — раздача статики (index.html, css, js)
//
// Переменные окружения (настроить через wrangler secret или Cloudflare Dashboard):
//   RESEND_API_KEY: API ключ от Resend (re_...)
//   CONTACT_EMAIL: куда отправлять заявки (по умолч. delevchuk@gmail.com)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // POST /api/contact — обработка формы
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      return handleContact(request, env, corsHeaders);
    }

    // Всё остальное — статика (index.html, css, js)
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env, cors) {
  try {
    const { name, email, message } = await request.json();

    // Валидация
    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Invalid email' }, 400, cors);
    }
    if (!name || name.length < 1 || name.length > 100) {
      return jsonResponse({ error: 'Name is required (1-100 chars)' }, 400, cors);
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return jsonResponse({ error: 'Message must be 10-5000 characters' }, 400, cors);
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
      return jsonResponse({ error: 'Failed to send email' }, 500, cors);
    }

    return jsonResponse({ success: true }, 200, cors);
  } catch (e) {
    return jsonResponse({ error: 'Invalid request' }, 400, cors);
  }
}

function jsonResponse(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
