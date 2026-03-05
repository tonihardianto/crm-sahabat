import { Router } from "express";
import { listContacts, createContact, updateContact, deleteContact } from "../controllers/contact.controller";

const router = Router();

router.get("/", listContacts);
router.post("/", createContact);
router.patch("/:id", updateContact);
router.delete("/:id", deleteContact);

export default router;
