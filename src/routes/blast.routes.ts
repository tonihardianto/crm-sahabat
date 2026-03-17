import { Router } from "express";
import {
    listCampaigns,
    getCampaign,
    createCampaign,
    startCampaign,
    cancelCampaign,
    deleteCampaign,
} from "../controllers/blast.controller";

const router = Router();

router.get("/", listCampaigns);
router.post("/", createCampaign);
router.get("/:id", getCampaign);
router.post("/:id/start", startCampaign);
router.post("/:id/cancel", cancelCampaign);
router.delete("/:id", deleteCampaign);

export default router;
