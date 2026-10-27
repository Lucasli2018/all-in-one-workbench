// 密码哈希 / 会话工具（Cloudflare Workers / Pages Functions 运行时）
// PBKDF2-SHA256，100k 迭代；会话用 HttpOnly Cookie（wba_sid）。

function toB64(u8){ let s=""; for(const b of u8) s+=String.fromCharCode(b); return btoa(s); }
function fromB64(s){ const bin=atob(s); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }

export async function hashPassword(pw, salt){
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations:100000, hash:"SHA-256" }, key, 256);
  const buf = new Uint8Array(bits);
  let hex=""; for(const b of buf) hex+=b.toString(16).padStart(2,"0");
  return { salt:toB64(salt), hash:hex };
}
export async function verifyPassword(pw, saltB64, hashHex){
  const r = await hashPassword(pw, fromB64(saltB64));
  return r.hash === hashHex;
}

export function newToken(){
  const a=new Uint8Array(24); crypto.getRandomValues(a); return toB64(a);
}
export function sessionCookie(token){
  return `wba_sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60*60*24*30}`;
}
export function clearCookie(){
  return `wba_sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }
  });
}
