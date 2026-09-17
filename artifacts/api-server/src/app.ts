import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger"; // .js 없이 임포트

const app: Express = express();

app.use(
  pinoHttp({
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

// 라우터 파일이 아직 없다면 임시로 기본 라우트를 넣어 에러를 방지합니다.
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default app;
