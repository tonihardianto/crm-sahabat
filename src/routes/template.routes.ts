import { Router } from "express";
import { listTemplates, createTemplate, updateTemplate, deleteTemplate, syncTemplates } from "../controllers/template.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", listTemplates);
router.post("/sync", requireAdmin, syncTemplates);
router.post("/", createTemplate);
router.patch("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;
