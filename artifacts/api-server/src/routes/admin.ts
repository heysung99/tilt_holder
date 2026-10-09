import { Router, type IRouter } from "express";
import { checkAdminPassword } from "../lib/admin.js";

const router: IRouter = Router();

router.post("/admin/verify", (req, res) => {
  if (checkAdminPassword(req, res, req.body?.password)) {
    res.status(204).end();
  }
});

export default router;
