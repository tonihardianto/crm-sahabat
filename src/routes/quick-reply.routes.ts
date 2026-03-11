import { Router } from "express";
import { list, create, update, remove } from "../controllers/quick-reply.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", list);
router.post("/", requireAdmin, create);
router.patch("/:id", requireAdmin, update);
router.delete("/:id", requireAdmin, remove);

export default router;
