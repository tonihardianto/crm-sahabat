import { Router } from "express";
import { requireAdmin, requireAuth } from "../middlewares/auth.middleware";
import {
    listUsersHandler,
    createUserHandler,
    updateUserHandler,
    deleteUserHandler,
    listAgentsHandler,
} from "../controllers/user.controller";

const router = Router();

// Any authenticated user can fetch the agents list (needed for handover/assign dialogs)
router.get("/agents", requireAuth, listAgentsHandler);

// All other user routes require ADMIN role
router.use(requireAdmin);

router.get("/", listUsersHandler);
router.post("/", createUserHandler);
router.patch("/:id", updateUserHandler);
router.delete("/:id", deleteUserHandler);

export default router;
