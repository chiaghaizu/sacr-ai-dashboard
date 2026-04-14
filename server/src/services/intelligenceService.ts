/**
 * Intelligence service: briefings, CVE feeds, research, trending topics, semantic search,
 * and structured news feed generation using the Google GenAI SDK.
 *
 * Adapted from the cyber-intel-dashboard project and integrated alongside the existing
 * feedService / archiveService in the SACR monorepo.
 */

import { GoogleGenAI } from "@google/genai";

/* ------------------------------------------------------------------ */
/* AI Client                                                           */
/* ------------------------------------------------------------------ */

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "A valid GEMINI_API_KEY environment variable is required."
      );
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/* ------------------------------------------------------------------ */
/* Tag taxonomy (shared across prompts)                                */
/* ------------------------------------------------------------------ */

const TAG_TAXONOMY = `
Use ONLY the following tags to categorize the items. Use the exact abbreviated terms listed below:
Identity Security: IASM, IGA, ISPM, ITDR, NHI, PAM, AM, IAM, CIAM, MFA, SSO, JIT, RBAC, ABAC, General Identity Security.
Cloud & App Security: AST, SAST, IAST, DAST, CDR, CSPM, CNAPP, VM, CTEM, CWPP, KSPM, ASPM, RASP, IaC, General Cloud & App Security.
Data & AI Security: AI-SPM, DLP, DSPM, DDR, IRM, PETs, AI TRiSM, General Data & AI Security.
SOC: AISOC, SOAR, EDR, XDR, MDR, NDR, SDDP, ETL, SIEM, UADP, CTI, BAS, DFIR, ASM, EASM, General SOC.
General Cybersecurity: SASE, SSPM, WAF, NGFW, FWaaS, Email Security, Enterprise Browser Security, ZTNA, CASB, SBOM, DRP, SD-WAN, General Cybersecurity.
`;

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

export interface BriefingResult {
  markdown: string;
  trendingTopics: string[];
  promotedToWatchlist: string[];
}

export interface IntelNewsItem {
  company: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  tags?: string[];
}

export interface CVEItem {
  id: string;
  severity: string;
  cvss: number;
  vendor: string;
  product: string;
  description: string;
  implication: string;
  dateDisclosed: string;
  tags?: string[];
}

export interface CVEFeedResult {
  cves: CVEItem[];
  trendingAcronyms: string[];
}

export interface ResearchItem {
  title: string;
  source: string;
  url: string;
  category: string;
  summary: string;
  keyTakeaway: string;
  date: string;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Helper: safe JSON parse from Gemini response                        */
/* ------------------------------------------------------------------ */

function safeParseJSON<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(
      text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    ) as T;
  } catch {
    console.error("Failed to parse JSON from Gemini response");
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Briefing generation                                                 */
/* ------------------------------------------------------------------ */

export async function generateDailyBriefing(
  clients: string[],
  watchlist: string[]
): Promise<BriefingResult> {
  const ai = getAIClient();

  const prompt = `
You are an elite cybersecurity intelligence analyst. Your job is to provide a high-signal, zero-fluff daily briefing for a C-level executive.
Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Focus your research and briefing on the following:
CLIENT COMPANIES: ${clients.join(", ") || "None specified"}
WATCHLIST COMPANIES: ${watchlist.join(", ") || "None specified"}

${TAG_TAXONOMY}

Instructions:
1. Use the googleSearch tool to search for the latest news, vulnerabilities, research, and market movements.
2. Pick at least 3-5 prominent companies from EACH list and search for their recent news.
3. Synthesize the findings into a highly readable, opinionated briefing.
4. CRITICAL: Embed actual URLs as inline markdown links.
5. CRITICAL: Only use real, working URLs found via the googleSearch tool.
6. Identify any new companies trending in cybersecurity. List them in promotedToWatchlist.
7. Format output in Markdown. Include tags from the taxonomy at the bottom of EACH update.
8. Output tags on a new line: TAGS: TAG1, TAG2, TAG3

Structure:
# Executive Summary
[2-3 bullet points]

# Company Updates
## Clients
[Updates for 3-5 client companies with ### headers]
## Watchlist
[Updates for 3-5 watchlist companies with ### headers]

# Research & Technical Insights
[Deep dives into new research]

# Market Signals
[Emerging trends, M&A activity]
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            markdown: { type: "STRING" as any },
            trendingTopics: {
              type: "ARRAY" as any,
              items: { type: "STRING" as any },
            },
            promotedToWatchlist: {
              type: "ARRAY" as any,
              items: { type: "STRING" as any },
            },
          },
          required: ["markdown", "trendingTopics", "promotedToWatchlist"],
        },
      },
    });

    return safeParseJSON<BriefingResult>(response.text, {
      markdown: "",
      trendingTopics: [],
      promotedToWatchlist: [],
    });
  } catch (error) {
    console.error("Error generating briefing:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Structured news feed                                                */
/* ------------------------------------------------------------------ */

export async function generateStructuredFeed(
  clients: string[],
  watchlist: string[]
): Promise<IntelNewsItem[]> {
  const ai = getAIClient();

  const prompt = `
You are an elite cybersecurity intelligence analyst.
Today's date is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Search the web for the latest news related to:
CLIENTS: ${clients.join(", ") || "None specified"}
WATCHLIST: ${watchlist.join(", ") || "None specified"}

CRITICAL: Use googleSearch to find updates. Return 8-12 important news items from the last 7 days.
The url field MUST contain exact, real URLs from search results.
${TAG_TAXONOMY}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              company: { type: "STRING" as any },
              title: { type: "STRING" as any },
              summary: { type: "STRING" as any },
              url: { type: "STRING" as any },
              date: { type: "STRING" as any },
              tags: { type: "ARRAY" as any, items: { type: "STRING" as any } },
            },
            required: ["company", "title", "summary", "url", "date"],
          },
        },
      },
    });

    return safeParseJSON<IntelNewsItem[]>(response.text, []);
  } catch (error) {
    console.error("Error generating structured feed:", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Trending topics                                                     */
/* ------------------------------------------------------------------ */

export async function generateTrendingTopics(): Promise<string[]> {
  const ai = getAIClient();

  const prompt = `
Search the web for the absolute latest top cybersecurity news, vulnerabilities, research, and market movements over the last 24 hours.
Identify 3-5 overarching trending topics in cybersecurity today.
Return ONLY a JSON array of strings representing these topics.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY" as any,
          items: { type: "STRING" as any },
        },
      },
    });

    return safeParseJSON<string[]>(response.text, []);
  } catch (error) {
    console.error("Error generating trending topics:", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Semantic search                                                     */
/* ------------------------------------------------------------------ */

export async function generateSemanticSearch(
  query: string,
  clients: string[],
  watchlist: string[]
): Promise<string> {
  const ai = getAIClient();

  const prompt = `
You are an elite cybersecurity intelligence analyst. The user has requested a semantic search for: "${query}"

CLIENT COMPANIES: ${clients.join(", ") || "None specified"}
WATCHLIST COMPANIES: ${watchlist.join(", ") || "None specified"}

1. Search the web for the latest and most relevant information.
2. Cross-reference with the provided companies if relevant.
3. Synthesize into a concise Markdown summary.

# Search Results: ${query}
[Comprehensive summary with key takeaways and strategic implications.]
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    return response.text || "No results found.";
  } catch (error) {
    console.error("Error generating semantic search:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* CVE feed                                                            */
/* ------------------------------------------------------------------ */

export async function generateCVEFeed(
  clients: string[],
  watchlist: string[]
): Promise<CVEFeedResult> {
  const ai = getAIClient();

  const prompt = `
Search the web for the latest critical and high-severity CVEs disclosed in the last 14 days.
Pay special attention to vulnerabilities affecting:
CLIENTS: ${clients.join(", ") || "None specified"}
WATCHLIST: ${watchlist.join(", ") || "None specified"}

${TAG_TAXONOMY}

Return 5-8 most important CVEs, plus 3-5 trending cybersecurity category acronyms.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            cves: {
              type: "ARRAY" as any,
              items: {
                type: "OBJECT" as any,
                properties: {
                  id: { type: "STRING" as any },
                  severity: { type: "STRING" as any },
                  cvss: { type: "NUMBER" as any },
                  vendor: { type: "STRING" as any },
                  product: { type: "STRING" as any },
                  description: { type: "STRING" as any },
                  implication: { type: "STRING" as any },
                  dateDisclosed: { type: "STRING" as any },
                  tags: { type: "ARRAY" as any, items: { type: "STRING" as any } },
                },
                required: [
                  "id", "severity", "cvss", "vendor", "product",
                  "description", "implication", "dateDisclosed", "tags",
                ],
              },
            },
            trendingAcronyms: {
              type: "ARRAY" as any,
              items: { type: "STRING" as any },
            },
          },
          required: ["cves", "trendingAcronyms"],
        },
      },
    });

    return safeParseJSON<CVEFeedResult>(response.text, {
      cves: [],
      trendingAcronyms: [],
    });
  } catch (error) {
    console.error("Error generating CVE feed:", error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Research feed                                                       */
/* ------------------------------------------------------------------ */

export async function generateResearchFeed(): Promise<ResearchItem[]> {
  const ai = getAIClient();

  const prompt = `
Search the web for the latest cybersecurity research papers, deep technical blog posts, and threat intelligence reports published in the last 14 days.
Focus on novel attack techniques, defensive innovations, and AI+security intersections.

CRITICAL: Use googleSearch to find these. The url field MUST contain exact, real URLs.
${TAG_TAXONOMY}

Return 5-8 most insightful pieces of research.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY" as any,
          items: {
            type: "OBJECT" as any,
            properties: {
              title: { type: "STRING" as any },
              source: { type: "STRING" as any },
              url: { type: "STRING" as any },
              category: { type: "STRING" as any },
              summary: { type: "STRING" as any },
              keyTakeaway: { type: "STRING" as any },
              date: { type: "STRING" as any },
              tags: { type: "ARRAY" as any, items: { type: "STRING" as any } },
            },
            required: [
              "title", "source", "url", "category",
              "summary", "keyTakeaway", "date", "tags",
            ],
          },
        },
      },
    });

    return safeParseJSON<ResearchItem[]>(response.text, []);
  } catch (error) {
    console.error("Error generating research feed:", error);
    return [];
  }
}
