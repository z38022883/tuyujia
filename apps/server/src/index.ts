// 图语家后端服务入口
// TODO: 从老仓库 app/api/* 抽离路由到 Fastify：
//   - /api/auth/*        → src/routes/auth.ts
//   - /api/sync/*        → src/routes/sync.ts
//   - /api/ai/*          → src/routes/ai.ts
//   - /api/pictograms/*  → src/routes/pictograms.ts
//   - /api/client/*      → src/routes/client.ts
// 业务逻辑直接复用老仓库 src/server/* 的代码。
import type { Server } from 'http';

const PORT = Number(process.env.PORT ?? 3002);

async function bootstrap(): Promise<Server> {
  // 占位：等待 Fastify 路由迁移
  console.log(`[server] TODO: mount Fastify on :${PORT}`);
  return {} as Server;
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
