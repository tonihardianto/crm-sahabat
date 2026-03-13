import { Router } from "express";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../controllers/calendar.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

// Public — no auth required
router.get("/", getEvents);

// Admin only
router.post("/", requireAdmin, createEvent);
router.put("/:id", requireAdmin, updateEvent);
router.delete("/:id", requireAdmin, deleteEvent);

export default router;
