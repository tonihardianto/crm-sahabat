import { Router } from "express";
import {
    listTickets,
    getTicket,
    updateTicket,
    claimTicket,
    handoverTicket,
    assignTicket,
    initiateTicket,
    archiveTicket,
    deleteTicket,
    listArchivedTickets,
    restoreTicket,
} from "../controllers/ticket.controller";
import { requireAdmin } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", listTickets);
router.get("/archived", listArchivedTickets);   // must be before /:id
router.post("/initiate", initiateTicket);        // must be before /:id
router.get("/:id", getTicket);
router.patch("/:id", updateTicket);
router.post("/:id/claim", claimTicket);
router.post("/:id/handover", handoverTicket);
router.post("/:id/assign", assignTicket);
router.patch("/:id/archive", archiveTicket);
router.patch("/:id/restore", restoreTicket);
router.delete("/:id", requireAdmin, deleteTicket);

export default router;

