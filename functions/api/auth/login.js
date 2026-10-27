// POST /api/auth/login  { email, pw } -> 验证并登录（Set-Cookie）
import { json, verifyPassword, newToken, sessionCookie } from "../../_shared/crypto.js";
import { getUserByEmail } from "../../_shared/db.js";

export async function onRequestPost({ request, env }){
  const { email, pw } = await request.json().catch(()=>({}));
  const em = String(email||"").trim().toLowerCase();
  const u = await getUserByEmail(env.DB, em);
  if(!u) return json({ error:"邮箱或密码不正确" }, 401);
  const parts = String(u.pw_hash).split(":");
  if(parts.length < 2 || !(await verifyPassword(pw, parts[0], parts[1]))) return json({ error:"邮箱或密码不正确" }, 401);

  const token = newToken();
  await env.DB.prepare("INSERT INTO wba_sessions(token,user_id,exp) VALUES(?,?,?)")
    .bind(token, u.id, Date.now() + 1000*60*60*24*30).run();

  return new Response(JSON.stringify({ user:{ email:em } }), {
    status: 200,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "set-cookie": sessionCookie(token) }
  });
}
