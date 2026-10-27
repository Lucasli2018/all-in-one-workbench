// 预建 wba_* 表到共享 dev 库（通过 Cloudflare D1 REST API）。
// 用法：node scripts/init-d1.mjs
// 需要环境变量 CLOUDFLARE_API_TOKEN（Machine 级）与 account id。
import { execFileSync } from "node:child_process";

const ACCOUNT_ID = "332b848d9f5d9ec2808bdb855763eb8e";
const DATABASE_ID = "3c83aee3-4645-450b-b50b-6488750deeb4";
const DB_NAME = "dev";

function getToken(){
  try {
    return execFileSync("powershell.exe", [
      "-NoProfile", "-Command",
      "[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN','Machine')"
    ]).toString().trim();
  } catch(e){ return process.env.CLOUDFLARE_API_TOKEN || ""; }
}

const TOKEN = getToken();
if(!TOKEN){ console.error("缺少 CLOUDFLARE_API_TOKEN"); process.exit(1); }

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS wba_users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL, created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS wba_sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL, exp INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS wba_data(user_id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS wba_idx_users_email ON wba_users(email)`,
  `CREATE INDEX IF NOT EXISTS wba_idx_sessions_user ON wba_sessions(user_id)`,
];

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;
const headers = {
  "Authorization": `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function run(sql){
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ sql }),
  });
  const j = await res.json();
  if(!j.success){ throw new Error(JSON.stringify(j.errors || j)); }
  console.log("OK:", sql.slice(0, 60));
}

(async () => {
  // 先确认库存在（可选）
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database`, { headers });
    const j = await r.json();
    const found = (j.result || []).find(d => d.uuid === DATABASE_ID || d.name === DB_NAME);
    console.log("目标库:", found ? found.name : "(按 id 操作)");
  } catch(e){ console.warn("列库检查跳过:", e.message); }

  for(const sql of SCHEMA){ await run(sql); }
  console.log("wba_* 表已就绪（幂等）");
})().catch(e => { console.error("建表失败:", e.message); process.exit(1); });
