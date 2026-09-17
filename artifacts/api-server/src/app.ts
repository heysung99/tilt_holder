import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js"; // 👈 node16/nodenext 규칙에 따라 .js 필수!

const app: Express = express();

// pino-http CJS/ESM 모듈 호환성 처리 (TS2349 에러 방지)
const pinoMiddleware = (pinoHttp as unknown as { default: typeof pinoHttp }).default || pinoHttp;

app.use(
  pinoMiddleware({
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
