import { Router } from "express";
import { listTeams, getTeam, createTeam, updateTeam, deleteTeam } from "../controllers/team.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.use(requireAdmin);

router.get("/", listTeams);
router.get("/:id", getTeam);
router.post("/", createTeam);
router.patch("/:id", updateTeam);
router.delete("/:id", deleteTeam);

export default router;
