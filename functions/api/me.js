// GET  /api/me -> 当前登录用户的云端数据（登录探测 + 拉取）
// PUT  /api/me -> 上传整包数据覆盖云端副本（整包 last-write-wins）
import { json } from "../_shared/crypto.js";
import { parseUser } from "../_shared/db.js";

export async function onRequestGet({ request, env }){
  const u = await parseUser(env, request);
  if(!u) return json({ error:"未登录" }, 401);
  const row = await env.DB.prepare("SELECT payload, updated_at FROM wba_data WHERE user_id=?").bind(u.id).first();
  let data = {};
  if(row && row.payload){ try { data = JSON.parse(row.payload); } catch(e){} }
  return json({ user:{ email:u.email }, data, updatedAt: row ? row.updated_at : null });
}

export async function onRequestPut({ request, env }){
  const u = await parseUser(env, request);
  if(!u) return json({ error:"未登录" }, 401);
  const body = await request.json().catch(()=>({}));
  const payload = JSON.stringify(body.data || {});
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO wba_data(user_id,payload,updated_at) VALUES(?,?,?) " +
    "ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at"
  ).bind(u.id, payload, now).run();
  return json({ ok:true, updatedAt: now });
}
