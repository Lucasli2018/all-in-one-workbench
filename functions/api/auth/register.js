// POST /api/auth/register  { email, pw } -> 创建账号并登录（Set-Cookie）
import { json, hashPassword, newToken, sessionCookie } from "../../_shared/crypto.js";
import { getUserByEmail } from "../../_shared/db.js";

export async function onRequestPost({ request, env }){
  const { email, pw } = await request.json().catch(()=>({}));
  const em = String(email||"").trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(em)) return json({ error:"请输入有效的邮箱" }, 400);
  if(!pw || String(pw).length < 6) return json({ error:"密码至少 6 位" }, 400);
  if(await getUserByEmail(env.DB, em)) return json({ error:"该邮箱已注册" }, 409);

  const { salt, hash } = await hashPassword(pw);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO wba_users(id,email,pw_hash,created) VALUES(?,?,?,?)")
    .bind(id, em, salt+":"+hash, Date.now()).run();

  const token = newToken();
  await env.DB.prepare("INSERT INTO wba_sessions(token,user_id,exp) VALUES(?,?,?)")
    .bind(token, id, Date.now() + 1000*60*60*24*30).run();

  return new Response(JSON.stringify({ user:{ email:em } }), {
    status: 200,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "set-cookie": sessionCookie(token) }
  });
}
