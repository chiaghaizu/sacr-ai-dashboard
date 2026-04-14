import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import cron from "node-cron";
import { CRON_SECRET, DEFAULT_COMPANIES, PORT } from "./config";
import { archiveOldSnapshots } from "./services/archiveService";
import {
  deleteOldSnapshots,
  generateAndPersistNews,
  getCurrentFeed,
  getHistory,
} from "./services/feedService";
import {
  generateDailyBriefing,
  generateCVEFeed,
  generateResearchFeed,
  generateTrendingTopics,
  generateSemanticSearch,
  generateStructuredFeed,
} from "./services/intelligenceService";
import { supabase } from "./lib/supabase";

dotenv.config();

const app = express();
// Production (e.g. Cloud Run): same-origin SPA + API — reflect Origin when CLIENT_ORIGIN unset.
const corsOrigin =
  process.env.CLIENT_ORIGIN ??
  (process.env.NODE_ENV === "production"
    ? true
    : "http://localhost:5173");

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

/* ------------------------------------------------------------------ */
/* Intel state: persisted in Supabase app_state table or local file    */
/* ------------------------------------------------------------------ */

const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? path.join("/tmp", "intel-state.json")
    : path.join(process.cwd(), "intel-state.json");

interface IntelState {
  briefing: any | null;
  cves: any[] | null;
  cveTrendingAcronyms: string[] | null;
  research: any[] | null;
  lastUpdated: string | null;
  history: any[];
  structuredFeed: any[] | null;
  structuredHistory: { date: string; news: any[] }[];
  settings: {
    clients: string[];
    watchlist: string[];
  };
}

const DEFAULT_INTEL_STATE: IntelState = {
  briefing: null,
  cves: null,
  cveTrendingAcronyms: null,
  research: null,
  lastUpdated: null,
  history: [],
  structuredFeed: null,
  structuredHistory: [],
  settings: {
    clients: DEFAULT_COMPANIES,
    watchlist: [
      "QuantumShield", "AgenticSec", "NeuralGuard", "Flow Security", "7AI",
      "Upwind", "Atbash", "Sublime Security", "Chainguard", "Harmonic Security",
      "Knostic", "Apex Security", "Grip Security", "Descope", "Acuvity AI",
      "Keycard", "Aikido Security", "Venn",
    ],
  },
};

async function getIntelState(): Promise<IntelState> {
  // Try Supabase first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("app_state")
        .select("data")
        .eq("id", "intel_current")
        .single();

      if (!error && data?.data) {
        return { ...DEFAULT_INTEL_STATE, ...data.data };
      }
    } catch (e) {
      console.error("Error fetching intel state from Supabase:", e);
    }
  }

  // Fallback to local file
  if (fs.existsSync(DATA_FILE)) {
    try {
      return {
        ...DEFAULT_INTEL_STATE,
        ...JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")),
      };
    } catch (e) {
      console.error("Error parsing intel state file:", e);
    }
  }
  return { ...DEFAULT_INTEL_STATE };
}

async function saveIntelState(state: IntelState): Promise<void> {
  if (supabase) {
    try {
      await supabase
        .from("app_state")
        .upsert({
          id: "intel_current",
          data: state,
          last_updated: new Date().toISOString(),
        });
    } catch (e) {
      console.error("Error saving intel state to Supabase:", e);
    }
  }

  // Always save locally as backup
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch {
    // /tmp may not be writable in all environments during build
  }
}

/* ------------------------------------------------------------------ */
/* Background generation                                               */
/* ------------------------------------------------------------------ */

let isGeneratingIntel = false;

async function generateAllIntelFeeds(
  clients: string[],
  watchlist: string[]
): Promise<void> {
  if (isGeneratingIntel) {
    console.log("Intel generation already in progress, skipping...");
    return;
  }
  isGeneratingIntel = true;
  console.log("Starting background intel generation...");

  try {
    const [briefingResult, cveFeedResult, research, trendingTopics, structuredFeed] =
      await Promise.all([
        generateDailyBriefing(clients, watchlist),
        generateCVEFeed(clients, watchlist),
        generateResearchFeed(),
        generateTrendingTopics(),
        generateStructuredFeed(clients, watchlist),
      ]);

    if (briefingResult) {
      briefingResult.trendingTopics = trendingTopics;
    }

    const existingState = await getIntelState();
    const history = existingState.history || [];

    // Save current briefing to history
    if (existingState.briefing && existingState.lastUpdated) {
      history.unshift({
        date: existingState.lastUpdated,
        briefing: existingState.briefing,
      });
      if (history.length > 10) history.length = 10;
    }

    // Save news items to Supabase relational table if available
    if (supabase && structuredFeed && structuredFeed.length > 0) {
      const newsRows = structuredFeed.map((item) => ({
        company: item.company,
        title: item.title,
        url: item.url || null,
        summary: item.summary,
        date: item.date,
        tags: item.tags,
      }));

      const { error: insertError } = await supabase
        .from("news_items")
        .upsert(newsRows, { onConflict: "url", ignoreDuplicates: true });

      if (insertError) {
        console.error("Error inserting intel news items:", insertError);
      }
    }

    await saveIntelState({
      ...existingState,
      briefing: briefingResult,
      cves: cveFeedResult.cves,
      cveTrendingAcronyms: cveFeedResult.trendingAcronyms,
      research,
      lastUpdated: new Date().toISOString(),
      history,
      structuredFeed,
      structuredHistory: [
        {
          date: new Date().toISOString(),
          news: structuredFeed,
        },
      ],
    });

    console.log("Successfully generated and saved all intel feeds.");
  } catch (error) {
    console.error("Failed to generate intel feeds:", error);
  } finally {
    isGeneratingIntel = false;
  }
}

/* ------------------------------------------------------------------ */
/* Existing routes (kept intact)                                       */
/* ------------------------------------------------------------------ */

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/feeds", async (_req, res) => {
  try {
    // Merge existing feed data with intel state
    const [feed, intelState] = await Promise.all([
      getCurrentFeed(),
      getIntelState(),
    ]);

    res.status(200).json({
      ...feed,
      companies: DEFAULT_COMPANIES,
      // Intel-specific fields
      briefing: intelState.briefing,
      cves: intelState.cves,
      cveTrendingAcronyms: intelState.cveTrendingAcronyms,
      research: intelState.research,
      history: intelState.history,
      structuredFeed: intelState.structuredFeed,
      structuredHistory: intelState.structuredHistory,
      settings: intelState.settings,
      isGeneratingBackground: isGeneratingIntel,
    });
  } catch (error) {
    console.error("GET /api/feeds failed", error);
    res.status(500).json({ error: "Failed to load current feed." });
  }
});

app.get("/api/history", async (req, res) => {
  const days = Number(req.query.days ?? 14);
  if (![14, 30].includes(days)) {
    res.status(400).json({ error: "Query param days must be 14 or 30." });
    return;
  }

  try {
    const history = await getHistory(days);
    res.status(200).json(history);
  } catch (error) {
    console.error("GET /api/history failed", error);
    res.status(500).json({ error: "Failed to load history." });
  }
});

app.post("/api/generate", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "This endpoint is disabled in production." });
    return;
  }

  const body = req.body as { clients?: string[]; watchlist?: string[] };
  const clients = body.clients ?? DEFAULT_COMPANIES;
  const watchlist = body.watchlist ?? [];

  // Trigger intel generation in background
  if (!isGeneratingIntel) {
    generateAllIntelFeeds(clients, watchlist).catch(console.error);
  }

  // Also trigger existing feed generation if clients provided
  if (Array.isArray(clients) && clients.length > 0) {
    try {
      const result = await generateAndPersistNews(clients);
      await deleteOldSnapshots();
      const intelState = await getIntelState();
      res.status(200).json({
        success: true,
        count: result.count,
        ...intelState,
        isGeneratingBackground: true,
      });
    } catch (error) {
      console.error("POST /api/generate failed", error);
      res.status(500).json({ error: "Failed to generate feed." });
    }
  } else {
    const intelState = await getIntelState();
    res.status(200).json({ ...intelState, isGeneratingBackground: true });
  }
});

app.post("/api/refresh", async (req, res) => {
  const secret = req.header("x-cron-secret");
  if (!secret || secret !== CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized cron request." });
    return;
  }

  try {
    // Run both existing feed generation and intel generation
    const [result] = await Promise.all([
      generateAndPersistNews(DEFAULT_COMPANIES),
      generateAllIntelFeeds(
        DEFAULT_COMPANIES,
        (await getIntelState()).settings.watchlist
      ),
    ]);
    const archivedCount = await archiveOldSnapshots();
    console.log(`archiveOldSnapshots archived rows: ${archivedCount}`);
    await deleteOldSnapshots();

    res.status(200).json({ success: true, count: result.count });
  } catch (error) {
    console.error("POST /api/refresh failed", error);
    res.status(500).json({ error: "Failed to refresh feed." });
  }
});

/* ------------------------------------------------------------------ */
/* New Intel routes                                                    */
/* ------------------------------------------------------------------ */

app.post("/api/settings", async (req, res) => {
  const { clients, watchlist } = req.body;
  const state = await getIntelState();
  state.settings = { clients, watchlist };
  await saveIntelState(state);
  res.json({ success: true });
});

app.post("/api/search", async (req, res) => {
  const { query, clients, watchlist } = req.body;
  try {
    const result = await generateSemanticSearch(query, clients, watchlist);
    res.json({ result });
  } catch (error) {
    console.error("POST /api/search failed", error);
    res.status(500).json({ error: "Failed to perform semantic search" });
  }
});

/* ------------------------------------------------------------------ */
/* Cron scheduling (in-process, for Cloud Run always-on or local dev)  */
/* ------------------------------------------------------------------ */

// Full feed regeneration: 8 AM, 1 PM, 6 PM
cron.schedule("0 8,13,18 * * *", async () => {
  console.log("[cron] Running scheduled intel feed generation");
  const state = await getIntelState();
  generateAllIntelFeeds(
    state.settings.clients,
    state.settings.watchlist
  ).catch(console.error);
});

// Trending topics refresh: every hour
cron.schedule("0 * * * *", async () => {
  console.log("[cron] Running scheduled trending topics update");
  try {
    const topics = await generateTrendingTopics();
    const state = await getIntelState();
    if (state.briefing) {
      state.briefing.trendingTopics = topics;
      await saveIntelState(state);
      console.log("[cron] Trending topics updated.");
    }
  } catch (error) {
    console.error("[cron] Failed to update trending topics:", error);
  }
});

/* ------------------------------------------------------------------ */
/* Serve SPA                                                           */
/* ------------------------------------------------------------------ */

const clientDistPath = path.resolve(process.cwd(), "../client/dist");
app.use(express.static(clientDistPath));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
