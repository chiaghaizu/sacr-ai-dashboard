import { GoogleGenerativeAI } from "@google/generative-ai";
import companies from "../companies.json";

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("Missing required environment variable: GEMINI_API_KEY");
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

const clientCompanyNames = companies.map((c: { name: string }) => c.name);

export async function semanticSearch(query: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{ googleSearch: {} } as any],
  });

  const prompt = `
You are an elite cybersecurity intelligence analyst. The user has requested a semantic search for the following query:
"${query}"

CLIENT COMPANIES: ${clientCompanyNames.join(", ") || "None specified"}
WATCHLIST COMPANIES: None specified

Instructions:
1. Search the web for the latest and most relevant information regarding the user's query.
2. If the query relates to specific companies, vulnerabilities, or trends, prioritize high-signal, authoritative sources.
3. Cross-reference the findings with the provided Client and Watchlist companies if relevant.
4. Synthesize the findings into a highly readable, concise summary.
5. Format the output strictly in Markdown.

Structure the response:
# Search Results: ${query}
[Provide a comprehensive but concise summary of the findings, highlighting key takeaways, affected technologies, and strategic implications.]
  `;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  });

  return result.response.text() ?? "No results found.";
}
