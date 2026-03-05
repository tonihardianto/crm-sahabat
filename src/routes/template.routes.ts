import { Router } from "express";
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from "../controllers/template.controller";

const router = Router();

router.get("/", listTemplates);
router.post("/", createTemplate);
router.patch("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;
