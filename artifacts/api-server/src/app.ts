import express from "express";
import type { Request, Response as ExpressResponse } from "express";
import cors from "cors";
import pinoHttpPkg from "pino-http";
import { logger } from "./lib/logger.js";

const app = express();

// pino-http 호출부 타입 검사 완전 우회
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

app.get("/", (req: Request, res: ExpressResponse): void => {
  res.json({ status: "ok" });
});

export default app;
