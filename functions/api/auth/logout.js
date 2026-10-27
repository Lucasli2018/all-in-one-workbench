// POST /api/auth/logout -> 删除会话并清除 Cookie
import { json, clearCookie } from "../../_shared/crypto.js";

export async function onRequestPost({ request, env }){
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)wba_sid=([^;]+)/);
  if(m){
    const token = decodeURIComponent(m[1]);
    try { await env.DB.prepare("DELETE FROM wba_sessions WHERE token=?").bind(token).run(); } catch(e){}
  }
  return new Response(JSON.stringify({ ok:true }), {
    status: 200,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", "set-cookie": clearCookie() }
  });
}
