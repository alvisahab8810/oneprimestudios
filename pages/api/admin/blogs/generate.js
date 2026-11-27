// pages/api/admin/blogs/generate.js — AI blog writer.
// POST { topic, fillMeta } -> streams Markdown as text/plain.
// With fillMeta, the text ends with a "METAJSON_START" line followed by one line
// of JSON: { metaTitle, metaDescription, summary, tags, categories }.
// Calls the Claude Messages API over HTTPS (needs ANTHROPIC_API_KEY in .env.local).
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";

export const config = { api: { responseLimit: false } };

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `You are an expert SEO content writer for One Prime Studios, an Indian company that makes custom printed merchandise, corporate gifts, apparel and branding products for businesses and individuals.
Follow the user's instructions precisely, including word count, structure, headings, tone, keywords and formatting.
Always write in Markdown. Start the blog with a # H1 title on the very first line.
Use ## and ### headings for sections, short paragraphs, and lists where they help the reader.
Do not add any preamble, commentary or explanation. Output only the blog content.`;

const META_INSTRUCTIONS = `

---
After the complete blog content, add exactly this separator on its own line: METAJSON_START
Then output a single-line JSON object (no markdown, no line breaks inside the JSON):
{"metaTitle":"...(60 chars max)","metaDescription":"...(155 chars max)","summary":"...(180 chars max)","tags":"comma, separated, tags","categories":"comma, separated, categories"}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "blogs");
  if (!admin) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: "AI writer is not set up. Add ANTHROPIC_API_KEY to .env.local and restart the server." });
  }

  const { topic, fillMeta } = req.body || {};
  const prompt = String(topic || "").trim().slice(0, 8000);
  if (!prompt) return res.status(400).json({ message: "Topic is required." });

  const controller = new AbortController();
  req.on("close", () => controller.abort());

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2026-10-21",
        // If the model declines, the API retries the request on a fallback model
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 32000,
        stream: true,
        output_config: { effort: "medium" },
        fallbacks: "default",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: fillMeta ? prompt + META_INSTRUCTIONS : prompt }],
      }),
    });
  } catch (err) {
    console.error("AI blog request error:", err?.message);
    return res.status(502).json({ message: "Could not reach the AI service." });
  }

  if (!upstream.ok || !upstream.body) {
    let message = `AI service error (${upstream.status}).`;
    try {
      const data = await upstream.json();
      if (data?.error?.message) message = data.error.message;
    } catch {}
    return res.status(502).json({ message });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  // Read Server-Sent Events and forward only the text deltas
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let stopReason = null;

  const handleEvent = (raw) => {
    const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) return;
    let evt;
    try {
      evt = JSON.parse(dataLine.slice(5).trim());
    } catch {
      return;
    }
    if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
      res.write(evt.delta.text);
    } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
      stopReason = evt.delta.stop_reason;
    } else if (evt.type === "error") {
      res.write(`\n\n[AI error: ${evt.error?.message || "stream failed"}]`);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        handleEvent(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
      }
    }
    if (buffer.trim()) handleEvent(buffer);
    if (stopReason === "refusal") res.write("\n\n[The AI declined this topic. Try rewording it.]");
    if (stopReason === "max_tokens") res.write("\n\n[Output stopped at the length limit.]");
  } catch (err) {
    if (err?.name !== "AbortError") console.error("AI blog stream error:", err?.message);
  }
  res.end();
}
