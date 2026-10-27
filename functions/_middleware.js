// 首访自动建表（幂等）。共享 dev 库，全部表前缀 wba_。
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS wba_users(
     id TEXT PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     pw_hash TEXT NOT NULL,
     created INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS wba_sessions(
     token TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     exp INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS wba_data(
     user_id TEXT PRIMARY KEY,
     payload TEXT NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS wba_idx_users_email ON wba_users(email)`,
  `CREATE INDEX IF NOT EXISTS wba_idx_sessions_user ON wba_sessions(user_id)`,
];

let ready = false;
export async function onRequest(context){
  const { env, request, next } = context;
  if(!ready){
    try {
      for(const sql of SCHEMA){ await env.DB.prepare(sql).run(); }
      ready = true;
    } catch(e){
      // 绑定未就绪或表已存在：静默，交由路由处理；下次冷启动再试
    }
  }
  return next();
}
