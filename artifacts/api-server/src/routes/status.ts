import { Router } from "express";
import { getState } from "../lib/bot";

const router = Router();

router.get("/status", (_req, res) => {
  const state = getState();
  res.json({
    ok: true,
    uptime: process.uptime(),
    newsEnabled: state.newsEnabled,
    lastPostedLink: state.lastPostedLink,
    lastPostedAt: state.lastPostedAt,
    totalPostsToday: state.totalPostsToday,
    timestamp: new Date().toISOString(),
  });
});

export default router;
