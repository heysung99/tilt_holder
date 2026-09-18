import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import gamesRouter from "./games.js";
import usersRouter from "./users.js";
import expensesRouter from "./expenses.js";
import fundRouter from "./fund.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gamesRouter);
router.use(usersRouter);
router.use(expensesRouter);
router.use(fundRouter);

export default router;
