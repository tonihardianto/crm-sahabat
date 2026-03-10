import { Router } from "express";
import { getSettingsHandler, updateSettingsHandler, changePasswordHandler } from "../controllers/settings.controller";

const router = Router();

router.get("/", getSettingsHandler);
router.patch("/", updateSettingsHandler);
router.post("/change-password", changePasswordHandler);

export default router;
