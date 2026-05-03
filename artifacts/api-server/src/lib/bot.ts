import axios from "axios";
import { logger } from "./logger";

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN ?? "";
const PAGE_ID = process.env.PAGE_ID ?? "";
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY ?? "";
const NEWS_API_BASE = "https://newsdata.io/api/1/latest";
const GRAPH_API_BASE = "https://graph.facebook.com";

interface BotState {
  newsEnabled: boolean;
  lastPostedLink: string | null;
  lastPostedAt: string | null;
  totalPostsToday: number;
  intervalId: ReturnType<typeof setInterval> | null;
}

const state: BotState = {
  newsEnabled: false,
  lastPostedLink: null,
  lastPostedAt: null,
  totalPostsToday: 0,
  intervalId: null,
};

export function getState() {
  return {
    newsEnabled: state.newsEnabled,
    lastPostedLink: state.lastPostedLink,
    lastPostedAt: state.lastPostedAt,
    totalPostsToday: state.totalPostsToday,
  };
}

interface NewsArticle {
  title: string | null;
  description: string | null;
  link: string | null;
}

interface NewsApiResponse {
  results?: NewsArticle[];
}

async function fetchLatestNews(): Promise<NewsArticle | null> {
  try {
    const response = await axios.get<NewsApiResponse>(NEWS_API_BASE, {
      params: { apikey: NEWSDATA_API_KEY, country: "ph", language: "en", image: 1 },
    });
    const articles = response.data.results ?? [];

    const valid = articles.filter(
      (a) => a.link && a.link.startsWith("http") && a.title && a.description
    );

    if (valid.length === 0) {
      logger.info("No valid articles found in API response.");
      return null;
    }

    const fresh = valid.filter((a) => a.link !== state.lastPostedLink);

    if (fresh.length > 0) {
      logger.info("Found fresh article to post.");
      return fresh[0]!;
    }

    const random = valid[Math.floor(Math.random() * valid.length)]!;
    logger.info("No fresh article found — falling back to a random article.");
    return random;
  } catch (err) {
    logger.error({ err }, "Error fetching news");
    return null;
  }
}

async function postNewsToPage(article: NewsArticle): Promise<boolean> {
  if (!article.link || !article.title || !article.description) return false;

  try {
    const message = `📰 ${article.title}\n${article.description}`;
    await axios.post(
      `${GRAPH_API_BASE}/${PAGE_ID}/feed`,
      { message, link: article.link },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );

    state.lastPostedLink = article.link;
    state.lastPostedAt = new Date().toISOString();
    state.totalPostsToday += 1;
    logger.info({ title: article.title }, "News posted to Facebook Page");
    return true;
  } catch (err) {
    logger.error({ err }, "Error posting news to Facebook Page");
    return false;
  }
}

export async function postNow(): Promise<"posted" | "no_article" | "error"> {
  const article = await fetchLatestNews();
  if (!article) return "no_article";
  const success = await postNewsToPage(article);
  return success ? "posted" : "error";
}

export function enableNews(): void {
  state.newsEnabled = true;
  logger.info("News auto-posting enabled");

  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
  }

  state.intervalId = setInterval(() => {
    void postNow();
  }, 3_600_000);
}

export function disableNews(): void {
  if (!state.newsEnabled) return;
  state.newsEnabled = false;
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  logger.info("News auto-posting stopped");
}

export async function sendMessage(recipientId: string, text: string): Promise<void> {
  try {
    await axios.post(
      `${GRAPH_API_BASE}/me/messages`,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
    logger.info({ recipientId }, "Message sent");
  } catch (err) {
    logger.error({ err, recipientId }, "Error sending message");
  }
}

export async function sendTypingOn(recipientId: string): Promise<void> {
  try {
    await axios.post(
      `${GRAPH_API_BASE}/me/messages`,
      { recipient: { id: recipientId }, sender_action: "typing_on" },
      { params: { access_token: PAGE_ACCESS_TOKEN } }
    );
  } catch {
    // ignore typing indicator failures
  }
}
