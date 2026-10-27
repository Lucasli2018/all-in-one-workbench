// D1 查询辅助：用户 / 会话解析（表前缀 wba_）
export async function getUserByEmail(DB, email){
  return DB.prepare("SELECT * FROM wba_users WHERE email=?").bind(email).first();
}
export async function getUserById(DB, id){
  return DB.prepare("SELECT * FROM wba_users WHERE id=?").bind(id).first();
}
// 从 Cookie 解析当前登录用户（wba_sid）
export async function parseUser(env, request){
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)wba_sid=([^;]+)/);
  if(!m) return null;
  const token = decodeURIComponent(m[1]);
  const s = await env.DB.prepare("SELECT * FROM wba_sessions WHERE token=? AND exp>?").bind(token, Date.now()).first();
  if(!s) return null;
  return getUserById(env.DB, s.user_id);
}
