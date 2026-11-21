// Usage (on your own PC, Node 18+):  node make_admin_sql.js admin@example.com "YourStrongPassword10+" "M.PRO Admin"
// Prints SQL to create the first admin login. Paste that SQL in Cloudflare D1 Console. Password never leaves your PC.
const crypto = require("crypto");
const [email, password, company = "M.PRO Admin"] = process.argv.slice(2);
if (!email || !password || password.length < 10) { console.error("Usage: node make_admin_sql.js <email> <password 10+ chars> [company]"); process.exit(1); }
const b64u = b => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const saltBytes = crypto.randomBytes(16), salt = b64u(saltBytes);
const hash = b64u(crypto.pbkdf2Sync(password, saltBytes, 100000, 32, "sha256"));
const q = s => "\x27" + String(s).replace(/\x27/g, "\x27\x27") + "\x27";
const tid = crypto.randomUUID(), uid = crypto.randomUUID(), sid = crypto.randomUUID();
const now = new Date().toISOString(), end = new Date(Date.now() + 3650 * 86400000).toISOString();
console.log("INSERT INTO tenants (id,company_name) VALUES (" + q(tid) + "," + q(company) + ");");
console.log("INSERT INTO users (id,tenant_id,email,role,password_hash,password_salt) VALUES (" + [uid, tid, email.trim().toLowerCase(), "owner", hash, salt].map(q).join(",") + ");");
console.log("INSERT INTO mdot_subscriptions (id,tenant_id,plan,status,starts_at,ends_at,updated_at) VALUES (" + [sid, tid, "Enterprise", "active", now, end, now].map(q).join(",") + ");");
