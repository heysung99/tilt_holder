import express from "express";
import cors from "cors";
import pinoHttpPkg from "pino-http";
import { logger } from "./lib/logger.js";

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

// 타입을 명시하는 대신 매개변수를 any로 처리하여 타입 충돌 원천 차단
app.get("/", (req: any, res: any) => {
  res.json({ status: "ok" });
});

export default app;
