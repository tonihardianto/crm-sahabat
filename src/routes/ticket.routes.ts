import { Router } from "express";
import {
    listTickets,
    getTicket,
    updateTicket,
    claimTicket,
    handoverTicket,
    assignTicket,
    initiateTicket,
} from "../controllers/ticket.controller";

const router = Router();

router.get("/", listTickets);
router.post("/initiate", initiateTicket);   // must be before /:id
router.get("/:id", getTicket);
router.patch("/:id", updateTicket);
router.post("/:id/claim", claimTicket);
router.post("/:id/handover", handoverTicket);
router.post("/:id/assign", assignTicket);

export default router;

