import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gamesRouter from "./games";
import usersRouter from "./users";
import expensesRouter from "./expenses";
import fundRouter from "./fund";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gamesRouter);
router.use(usersRouter);
router.use(expensesRouter);
router.use(fundRouter);

export default router;
