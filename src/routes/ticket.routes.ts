import { Router } from "express";
import {
    listTickets,
    getTicket,
    updateTicket,
    claimTicket,
    initiateTicket,
} from "../controllers/ticket.controller";

const router = Router();

router.get("/", listTickets);
router.post("/initiate", initiateTicket);   // must be before /:id
router.get("/:id", getTicket);
router.patch("/:id", updateTicket);
router.post("/:id/claim", claimTicket);

export default router;

