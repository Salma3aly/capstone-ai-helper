import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import sandboxRouter from "./sandbox";
import researchRouter from "./research";
import citationRouter from "./citation";
import hubRouter from "./hub";
import projectsRouter from "./projects";
import ramComponentsRouter from "./ramComponents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(sandboxRouter);
router.use(researchRouter);
router.use(citationRouter);
router.use(hubRouter);
router.use(projectsRouter);
router.use(ramComponentsRouter);

export default router;
