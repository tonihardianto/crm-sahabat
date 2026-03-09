import { Router } from "express";
import { getSettingsHandler, updateSettingsHandler } from "../controllers/settings.controller";

const router = Router();

router.get("/", getSettingsHandler);
router.patch("/", updateSettingsHandler);

export default router;
