/**
 * AGENTSETUP Contact Form Worker
 * Receives POST /api/contact and sends email via Resend API
 *
 * Environment variables (set in Cloudflare dashboard → Worker → Settings → Variables):
 *   RESEND_API_KEY — Resend API key (re_...)
 *   CONTACT_EMAIL  — where to forward submissions (default: delevchuk@gmail.com)
 */

// CORS headers
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Only POST /api/contact
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/api/contact') {
      return new Response('Not Found', { status: 404 });
    }

    return handleContact(request, env);
  },
};

async function handleContact(request, env) {
  const RESEND_KEY = env.RESEND_API_KEY;
  const TO_EMAIL = env.CONTACT_EMAIL || 'delevchuk@gmail.com';

  // Check Resend key
  if (!RESEND_KEY) {
    return jsonResponse({ error: 'Server not configured for email' }, 500);
  }

  // Parse body
  let name, email, message;
  try {
    const ct = request.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
      const body = await request.json();
      name = body.name;
      email = body.email;
      message = body.message;
    } else {
      const form = await request.formData();
      name = form.get('name');
      email = form.get('email');
      message = form.get('message');
    }
  } catch {
    return jsonResponse({ error: 'Invalid form data' }, 400);
  }

  // Validate
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return jsonResponse({ error: 'Name, email, and message are required' }, 400);
  }

  // Send via Resend
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AGENTSETUP <onboarding@resend.dev>',
        to: [TO_EMAIL],
        subject: `New inquiry from ${name}`,
        html: `
          <h2 style="color:#e040fb">New Contact Form Submission</h2>
          <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif">
            <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700;width:100px">Name</td>
                <td style="padding:10px 14px">${esc(name)}</td></tr>
            <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700">Email</td>
                <td style="padding:10px 14px"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
            <tr><td style="padding:10px 14px;background:#f5f5f5;font-weight:700">Message</td>
                <td style="padding:10px 14px">${esc(message)}</td></tr>
          </table>
        `,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Resend error:', JSON.stringify(result));
      return jsonResponse({ error: 'Failed to send message' }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#039;';
    return m;
  });
}
