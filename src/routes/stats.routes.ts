import { Router } from "express";
import { getDashboardStats } from "../controllers/stats.controller";

const router = Router();

router.get("/", getDashboardStats);

export default router;
