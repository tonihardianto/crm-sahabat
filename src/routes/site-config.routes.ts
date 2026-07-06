import { Router } from "express";
import { getSiteConfig, updateSiteConfig } from "../controllers/site-config.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getSiteConfig);
router.put("/", requireAdmin, updateSiteConfig);

export default router;
