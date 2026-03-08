import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendMessage, markMessagesRead, sendMediaMessage, editMessage } from "../controllers/message.controller";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 16 * 1024 * 1024 }, // 16MB max (WA limit)
});

const router = Router();

// POST /api/tickets/:id/messages
router.post("/:id/messages", sendMessage);

// PATCH /api/tickets/:id/messages/read
router.patch("/:id/messages/read", markMessagesRead);

// PATCH /api/tickets/:id/messages/:msgId  — edit pesan
router.patch("/:id/messages/:msgId", editMessage);

// POST /api/tickets/:id/messages/media
router.post("/:id/messages/media", upload.single("file"), sendMediaMessage);

export default router;
