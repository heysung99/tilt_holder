import express from "express";
import cors from "cors";
import pinoHttpPkg from "pino-http";
import { logger } from "./lib/logger.js";

import usersRouter from "./routes/users.js";
import gamesRouter from "./routes/games.js";
import fundRouter from "./routes/fund.js";
import expensesRouter from "./routes/expenses.js";
import sessionRouter from "./routes/session.js";

const app = express();

const pinoMiddleware = (pinoHttpPkg as any).default || pinoHttpPkg;

app.use(
  (pinoMiddleware as any)({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", usersRouter);
app.use("/api", gamesRouter);
app.use("/api", fundRouter);
app.use("/api", expensesRouter);
app.use("/api", sessionRouter);

// 타입을 명시하는 대신 매개변수를 any로 처리하여 타입 충돌 원천 차단
app.get("/", (req: any, res: any) => {
  res.json({ status: "ok" });
});

app.get("/api", (req: any, res: any) => {
  res.json({ status: "ok" });
});

export default app;
