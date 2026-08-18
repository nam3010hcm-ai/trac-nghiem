#!/usr/bin/env node
// Simple admin helper server to confirm Supabase Auth users using the service_role key.
// Usage:
//   SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your_service_role_key node admin-confirm-server.js

const http = require('http');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  console.error('Example: SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx node admin-confirm-server.js');
  process.exit(1);
}

console.log('Starting admin confirm server on port', PORT);

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/admin/confirm-user') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const userId = parsed.userId || parsed.user_id || parsed.id;
        if (!userId) throw new Error('Missing userId in request body');

        const endpoint = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/users/${encodeURIComponent(userId)}`;
        const payload = {
          // Try to set email_confirm flag and email_confirmed_at timestamp.
          email_confirm: true,
          email_confirmed_at: new Date().toISOString()
        };

        const fetchRes = await fetch(endpoint, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const text = await fetchRes.text();
        if (!fetchRes.ok) {
          res.writeHead(fetchRes.status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, status: fetchRes.status, body: text }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, body: text }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });

    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, () => console.log(`Admin confirm server listening on port ${PORT}`));
