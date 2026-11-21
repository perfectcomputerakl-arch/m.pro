import {
  json,
  currentUser,
  isAdmin,
  b64u,
  passwordHash
} from '../../_lib/auth.js';

const PLANS = {
  Basic: 299,
  Professional: 599,
  Enterprise: 999
};

const validEmail = s =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function onRequest({ request, env }) {

  if (!env.DB || !env.AUTH_SECRET) {
    return json({ error: 'Backend configuration missing.' }, 503);
  }

  const admin = await currentUser(request, env);

  if (!admin) return json({ error: 'Please login.' }, 401);
  if (!isAdmin(admin, env)) return json({ error: 'Admin access denied.' }, 403);

  const path = new URL(request.url).pathname;

  const latest = `
    SELECT * FROM mdot_subscriptions
    WHERE tenant_id=?
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
  `;

  // DASHBOARD DATA
  if (request.method === 'GET' && path === '/api/admin/overview') {

    const rows = await env.DB.prepare(`
      SELECT
        t.id AS tenant_id,
        t.company_name,
        u.email,
        s.plan,
        s.status,
        s.starts_at,
        s.ends_at
      FROM tenants t
      LEFT JOIN users u
        ON u.tenant_id=t.id AND u.role='owner'
      LEFT JOIN mdot_subscriptions s
        ON s.id=(
          SELECT x.id FROM mdot_subscriptions x
          WHERE x.tenant_id=t.id
          ORDER BY x.updated_at DESC, x.created_at DESC
          LIMIT 1
        )
      ORDER BY t.created_at DESC
      LIMIT 500
    `).all();

    const counts = await env.DB.prepare(`
      SELECT
        COUNT(*) AS customers,
        SUM(CASE WHEN s.status='active'
          AND julianday(s.ends_at)>julianday('now')
          THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN s.id IS NULL
          OR s.status!='active'
          OR julianday(s.ends_at)<=julianday('now')
          THEN 1 ELSE 0 END) AS expired
      FROM tenants t
      LEFT JOIN mdot_subscriptions s
        ON s.id=(
          SELECT x.id FROM mdot_subscriptions x
          WHERE x.tenant_id=t.id
          ORDER BY x.updated_at DESC, x.created_at DESC
          LIMIT 1
        )
    `).first();

    return json({
      ok: true,
      counts,
      customers: rows.results || [],
      plans: Object.keys(PLANS)
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  // CREATE CUSTOMER
  if (path === '/api/admin/customers') {

    const companyName = String(body.companyName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const plan = String(body.plan || 'Basic');

    const days = Math.max(
      1,
      Math.min(3660, Number(body.days) || 30)
    );

    if (!companyName) return json({ error: 'Business name required.' }, 400);
    if (!validEmail(email)) return json({ error: 'Invalid email.' }, 400);

    if (password.length < 10 || password.length > 128) {
      return json({ error: 'Password must be 10-128 characters.' }, 400);
    }

    if (!PLANS[plan]) {
      return json({ error: 'Invalid subscription plan.' }, 400);
    }

    const duplicate = await env.DB.prepare(
      'SELECT id FROM users WHERE lower(email)=?'
    ).bind(email).first();

    if (duplicate) return json({ error: 'Email already exists.' }, 409);

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const subscriptionId = crypto.randomUUID();

    const salt = b64u(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await passwordHash(password, salt);

    const start = new Date();
    const end = new Date(start.getTime() + days * 86400000);
    const now = start.toISOString();

    try {
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO tenants (id,company_name) VALUES (?,?)'
        ).bind(tenantId, companyName),

        env.DB.prepare(`
          INSERT INTO users
          (id,tenant_id,email,role,password_hash,password_salt)
          VALUES (?,?,?,'owner',?,?)
        `).bind(userId, tenantId, email, hash, salt),

        env.DB.prepare(`
          INSERT INTO mdot_subscriptions
          (id,tenant_id,plan,status,starts_at,ends_at,updated_at)
          VALUES (?,?,?,'active',?,?,?)
        `).bind(
          subscriptionId,
          tenantId,
          plan,
          now,
          end.toISOString(),
          now
        )
      ]);
    } catch (e) {
      return json({ error: 'Customer creation failed.' }, 500);
    }

    return json({
      ok: true,
      tenantId,
      email,
      plan,
      endsAt: end.toISOString()
    });
  }

  // RENEW / ACTIVATE SUBSCRIPTION
  if (path === '/api/admin/subscription') {

    const tenantId = String(body.tenantId || '');
    const plan = String(body.plan || '');
    const days = Math.max(1, Math.min(3660, Number(body.days) || 30));

    if (!tenantId || !PLANS[plan]) {
      return json({ error: 'Invalid customer or plan.' }, 400);
    }

    const tenant = await env.DB.prepare(
      'SELECT id FROM tenants WHERE id=?'
    ).bind(tenantId).first();

    if (!tenant) return json({ error: 'Customer not found.' }, 404);

    const now = new Date();
    const end = new Date(now.getTime() + days * 86400000);

    await env.DB.prepare(`
      INSERT INTO mdot_subscriptions
      (id,tenant_id,plan,status,starts_at,ends_at,updated_at)
      VALUES (?,?,?,'active',?,?,?)
    `).bind(
      crypto.randomUUID(),
      tenantId,
      plan,
      now.toISOString(),
      end.toISOString(),
      now.toISOString()
    ).run();

    return json({
      ok: true,
      tenantId,
      plan,
      status: 'active',
      endsAt: end.toISOString()
    });
  }

  // SUSPEND CUSTOMER
  if (path === '/api/admin/suspend') {

    const tenantId = String(body.tenantId || '');

    if (!tenantId) {
      return json({ error: 'tenantId required.' }, 400);
    }

    const old = await env.DB.prepare(latest)
      .bind(tenantId).first();

    if (!old) {
      return json({ error: 'Subscription not found.' }, 404);
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO mdot_subscriptions
      (id,tenant_id,plan,status,starts_at,ends_at,updated_at)
      VALUES (?,?,?,'suspended',?,?,?)
    `).bind(
      crypto.randomUUID(),
      tenantId,
      old.plan,
      now,
      old.ends_at,
      now
    ).run();

    return json({ ok: true });
  }

  return json({ error: 'Not found.' }, 404);
}
