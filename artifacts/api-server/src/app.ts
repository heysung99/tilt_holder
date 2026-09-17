import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";

// ESM / NodeNext 환경에서 express 함수 호출 보장
const app = express();

// pino-http 모듈 호환성 처리 (CJS/ESM 차이 방어)
const createPinoHttp = (pinoHttp as unknown as { default: typeof pinoHttp }).default || pinoHttp;

app.use(
  createPinoHttp({
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
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default app;
