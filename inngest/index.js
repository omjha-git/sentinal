const { Inngest } = require("inngest");
const Sentry = require("@sentry/node");
const Chat = require("../models/chat");

const inngest = new Inngest({ id: "sentinal-ai" });

const aiChatFunction = inngest.createFunction(
  {
    id: "ai-chat",
    triggers: [{ event: "chat/message.sent" }],
  },
  async ({ event, step }) => {
    try {
      const { message, clerkId, projectId } = event.data;

      Sentry.setUser({
        id: clerkId || "test-user",
      });

      const aiText = await step.run("auto-ai-agent", async () => {
        const { Firecrawl } = await import("firecrawl");
        const { generateText } = await import("ai");
        const { google } = await import("@ai-sdk/google");

        const firecrawl = new Firecrawl({
          apiKey: process.env.FIRECRAWL_API_KEY,
        });

        const lowerMessage = message.toLowerCase();
        const urlMatch = message.match(/https?:\/\/\S+/);

        const needsSearch =
          lowerMessage.includes("latest") ||
          lowerMessage.includes("current") ||
          lowerMessage.includes("news") ||
          lowerMessage.includes("today") ||
          lowerMessage.includes("2026") ||
          lowerMessage.includes("recent");

        let context = "";
        let task = "";

        if (urlMatch) {
          const url = urlMatch[0];

          try {
            const firecrawlStart = Date.now();

            const scraped = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            Sentry.captureMessage("Firecrawl Scrape Completed", {
              level: "info",
              extra: {
                durationMs: Date.now() - firecrawlStart,
                url,
                userId: clerkId || "test-user",
              },
            });

            context = (scraped.markdown || "").slice(0, 5000);
            task = `Summarize this website clearly: ${url}`;
          } catch (err) {
            Sentry.captureException(err);
            console.log("Firecrawl scrape error:", err.message);
            task =
              "The user gave a website URL, but scraping failed. Explain politely and answer if possible.";
          }
        } else if (needsSearch) {
          try {
            const firecrawlStart = Date.now();

            const searchResults = await firecrawl.search(message, {
              limit: 3,
            });

            Sentry.captureMessage("Firecrawl Search Completed", {
              level: "info",
              extra: {
                durationMs: Date.now() - firecrawlStart,
                query: message,
                userId: clerkId || "test-user",
              },
            });

            context = JSON.stringify(searchResults, null, 2).slice(0, 5000);
            task = "Answer using the latest web search results.";
          } catch (err) {
            Sentry.captureException(err);
            console.log("Firecrawl search error:", err.message);
            task = "Web search failed. Answer normally if possible.";
          }
        } else {
          task = "Answer normally.";
        }

        try {
          const geminiStart = Date.now();

          const result = await generateText({
            model: google("gemini-2.5-flash", {
              apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            }),
            prompt: `
You are Sentinal AI, a coding and research assistant.

User message:
${message}

Task:
${task}

Context:
${context}

Rules:
- If website content is provided, summarize it.
- If web search results are provided, answer using them.
- If no context is provided, answer normally.
- For coding questions, give clear code examples.
- Keep answers helpful and easy to understand.
`,
          });

          Sentry.captureMessage("Gemini Request Completed", {
            level: "info",
            extra: {
              durationMs: Date.now() - geminiStart,
              model: "gemini-2.5-flash",
              userId: clerkId || "test-user",
              projectId: projectId || null,
              hasContext: Boolean(context),
            },
          });

          return result.text;
        } catch (err) {
          Sentry.captureException(err);
          console.log("Gemini Error:", err.message);

          return "Gemini quota is busy/exceeded right now. Please try again after some time.";
        }
      });

      await step.run("save-chat-to-mongodb", async () => {
        try {
          const mongoStart = Date.now();

          await Chat.create({
  projectId: projectId || null,
  clerkId: clerkId || "test-user",
  title: message.slice(0, 40) || "New Chat",
  messages: [
    {
      role: "user",
      content: message,
    },
    {
      role: "assistant",
      content: aiText,
    },
  ],
});

          Sentry.captureMessage("Mongo Save Completed", {
            level: "info",
            extra: {
              durationMs: Date.now() - mongoStart,
              userId: clerkId || "test-user",
              projectId: projectId || null,
            },
          });
        } catch (err) {
          Sentry.captureException(err);
          throw err;
        }
      });

      return { reply: aiText };
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }
);

module.exports = {
  inngest,
  functions: [aiChatFunction],
};