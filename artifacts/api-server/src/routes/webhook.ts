import { Router } from "express";
import { enableNews, disableNews, postNow, sendMessage, sendTypingOn } from "../lib/bot";
import { logger } from "../lib/logger";

const VERIFY_TOKEN = process.env.VERIFY_TOKEN ?? "";

const router = Router();

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    logger.warn("Webhook verification failed");
    res.sendStatus(403);
  }
});

router.post("/webhook", (req, res) => {
  const body = req.body as {
    object?: string;
    entry?: Array<{
      messaging?: Array<{
        sender?: { id?: string };
        message?: { text?: string };
      }>;
    }>;
  };

  if (body.object !== "page") {
    res.sendStatus(404);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text = event.message?.text?.trim().toLowerCase();

      if (!senderId || !text) continue;

      logger.info({ senderId, text }, "Received message");

      void (async () => {
        await sendTypingOn(senderId);

        if (text === "bot news on") {
          enableNews();
          await sendMessage(senderId, "✅ News auto-posting enabled!\nPosting first article right now...");
          const result = await postNow();
          if (result === "posted") {
            await sendMessage(senderId, "📰 First article posted to the page! Next post in 1 hour.");
          } else if (result === "no_article") {
            await sendMessage(senderId, "⚠️ No new article found to post right now. Will retry in 1 hour.");
          } else {
            await sendMessage(senderId, "❌ Failed to post the first article. Will retry in 1 hour.");
          }
        } else if (text === "bot news off") {
          disableNews();
          await sendMessage(senderId, "🛑 News auto-posting stopped.");
        } else if (text === "post") {
          await sendMessage(senderId, "⏳ Fetching and posting latest news now...");
          const result = await postNow();
          if (result === "posted") {
            await sendMessage(senderId, "✅ Philippine news posted to the page!");
          } else if (result === "no_article") {
            await sendMessage(senderId, "⚠️ Could not fetch any article from the news API right now. Please try again.");
          } else {
            await sendMessage(senderId, "❌ Failed to post to the page. Please try again later.");
          }
        } else {
          await sendMessage(
            senderId,
            "📋 Available commands:\n\n" +
            "• \"bot news on\" — enable auto-posting (posts immediately + every hour)\n" +
            "• \"bot news off\" — stop auto-posting\n" +
            "• \"post\" — post a new article right now (manual)"
          );
        }
      })();
    }
  }

  res.sendStatus(200);
});

export default router;
