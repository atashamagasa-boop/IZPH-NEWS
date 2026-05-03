import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import statusRouter from "./status";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(statusRouter);

export default router;
