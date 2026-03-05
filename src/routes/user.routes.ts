import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.middleware";
import {
    listUsersHandler,
    createUserHandler,
    updateUserHandler,
    deleteUserHandler,
} from "../controllers/user.controller";

const router = Router();

// All user routes require ADMIN role
router.use(requireAdmin);

router.get("/", listUsersHandler);
router.post("/", createUserHandler);
router.patch("/:id", updateUserHandler);
router.delete("/:id", deleteUserHandler);

export default router;
