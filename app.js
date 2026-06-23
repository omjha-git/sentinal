require("dotenv").config();
require("./instrument");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const cors = require("cors");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const { Firecrawl } = require("firecrawl");

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

const axios = require("axios");



const express = require("express");
const mongoose = require("mongoose");

const Sentry = require("@sentry/node");
const { serve } = require("inngest/express");

const Chat = require("./models/chat");
const Project = require("./models/project");
const { inngest, functions } = require("./inngest");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://sentinal-ochre.vercel.app",
  "https://sentinal-git-main-om-s-projects10.vercel.app",
];

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sentinal-ochre.vercel.app",
    "https://sentinal-git-main-om-s-projects10.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options(/.*/, cors());




app.use("/api/inngest", serve({ client: inngest, functions }));

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    Sentry.captureException(err);
    console.log("MongoDB Error:", err);
  });

  
app.post("/api/firecrawl/scrape", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    const doc = await firecrawl.scrape(url, {
      formats: ["markdown"],
    });

    res.json({
      success: true,
      title: doc?.metadata?.title || "Scraped Page",
      url,
      markdown: doc?.markdown || "",
    });
  } catch (error) {
    console.error("Firecrawl Error:", error);
    res.status(500).json({
      success: false,
      message: "Firecrawl scrape failed",
      error: error.message,
    });
  }
});


app.get("/", (req, res) => {
  res.send("Sentinal backend running");
});

app.post("/api/projects", async (req, res) => {
  try {
    const { title, description, clerkId } = req.body;

    if (!title || !clerkId) {
      return res.status(400).json({
        success: false,
        message: "Title and clerkId are required",
      });
    }

    const project = await Project.create({
      title,
      description,
      clerkId,
    });

    res.json({
      success: true,
      project,
    });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Project creation failed",
      error: err.message,
    });
  }
});

app.get("/api/projects/:clerkId", async (req, res) => {
  try {
    const projects = await Project.find({
      clerkId: req.params.clerkId,
    }).sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: err.message,
    });
  }
});
// Get project files
app.get("/api/projects/:projectId/files", async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      files: project.files || [],
    });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project files",
      error: err.message,
    });
  }
});

// Save project files
app.patch("/api/projects/:projectId/files", async (req, res) => {
  try {
    const { files } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.projectId,
      { files },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      files: project.files,
    });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to save project files",
      error: err.message,
    });
  }
});



// Get chats for one project
app.get("/api/project-chats/:projectId", async (req, res) => {
  try {
    const chats = await Chat.find({
      projectId: req.params.projectId,
    })
      .sort({ updatedAt: -1 })
      .select("_id title messages createdAt updatedAt");

    res.json(chats);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project chats",
      error: err.message,
    });
  }
});

// Open one chat
app.get("/api/chats/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    res.json({
      success: true,
      chat,
    });
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to open chat",
      error: err.message,
    });
  }
});

app.get("/api/chats", async (req, res) => {
  try {
    const { clerkId, projectId } = req.query;

    const filter = {};

    if (clerkId) filter.clerkId = clerkId;
    if (projectId) filter.projectId = projectId;

    const chats = await Chat.find(filter)
      .sort({ updatedAt: -1 })
      .select("_id title projectId clerkId createdAt updatedAt");

    res.json(chats);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: err.message,
    });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message, clerkId, projectId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    await inngest.send({
      name: "chat/message.sent",
      data: {
        message,
        clerkId: clerkId || "test-user",
        projectId: projectId || null,
      },
    });

    res.json({
      success: true,
      message: "AI request sent to Inngest",
    });
  } catch (err) {
    Sentry.captureException(err);
    console.log("Inngest Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to send Inngest event",
      error: err.message,
    });
  }
});


app.post("/api/ai/generate-project", async (req, res) => {
  try {
    const { prompt } = req.body;

  const aiPrompt = `
Create a complete runnable React + Vite project for this request:

${prompt}

Return ONLY valid JSON.
No markdown.
No explanation.

IMPORTANT:
The project MUST include these root files:
1. package.json
2. index.html
3. vite.config.js
4. src/main.jsx
5. src/App.jsx

package.json MUST include:
{
  "scripts": {
    "dev": "vite"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "vite": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {}
}

Use this exact file tree format:
[
  {
    "id": "package-json",
    "name": "package.json",
    "type": "file",
    "content": "JSON string here"
  },
  {
    "id": "index-html",
    "name": "index.html",
    "type": "file",
    "content": "HTML string here"
  },
  {
    "id": "vite-config",
    "name": "vite.config.js",
    "type": "file",
    "content": "vite config code here"
  },
  {
    "id": "src",
    "name": "src",
    "type": "folder",
    "open": true,
    "children": [
      {
        "id": "main-jsx",
        "name": "main.jsx",
        "type": "file",
        "content": "ReactDOM createRoot code here"
      },
      {
        "id": "app-jsx",
        "name": "App.jsx",
        "type": "file",
        "content": "App code here"
      }
    ]
  }
]

Rules:
- Every file must have unique id.
- File type must be exactly "file".
- Folder type must be exactly "folder".
- Do not omit package.json.
- Do not omit index.html.
- Do not omit src/main.jsx.
- Do not use external APIs unless user asks.
- CSS files are allowed.
- Components are allowed.
`;

    const result = await generateWithRetry(aiPrompt);

    const clean = result
      .replace(/```json/g, "")
      .replace(/```js/g, "")
      .replace(/```/g, "")
      .trim();

    const start = clean.indexOf("[");
const end = clean.lastIndexOf("]");

if (start === -1 || end === -1) {
  throw new Error("AI did not return JSON array");
}

const jsonOnly = clean.slice(start, end + 1);
const files = JSON.parse(jsonOnly);

    res.json({
      success: true,
      files,
    });
  } catch (err) {
    console.error("Generate Project Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to generate project",
      error: err.message,
    });
  }
});





function buildFileTree(files) {
  const root = [];

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;

      if (isFile) {
        current.push({
          id: file.path,
          name: part,
          type: "file",
          content: file.content || "",
        });
      } else {
        let folder = current.find(
          (item) => item.name === part && item.type === "folder"
        );

        if (!folder) {
          folder = {
            id: parts.slice(0, index + 1).join("/"),
            name: part,
            type: "folder",
            open: true,
            children: [],
          };

          current.push(folder);
        }

        current = folder.children;
      }
    });
  });

  return root;
}

app.post("/api/github/import", async (req, res) => {
  try {
    const { repoUrl } = req.body;

    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid GitHub repo URL",
      });
    }

    const owner = match[1];
    const repo = match[2].replace(".git", "");

    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
    );

    const fileItems = treeRes.data.tree
      .filter((item) => item.type === "blob")
      .filter((item) =>
        /\.(js|jsx|css|html|json)$/.test(item.path)
      );

    const filesWithContent = await Promise.all(
      fileItems.slice(0, 40).map(async (file) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file.path}`;

        try {
          const contentRes = await axios.get(rawUrl);
          return {
            path: file.path,
            type: "file",
            content: contentRes.data,
          };
        } catch {
          return {
            path: file.path,
            type: "file",
            content: "",
          };
        }
      })
    );

    const files = buildFileTree(filesWithContent);

    res.json({
      success: true,
      title: repo,
      files,
    });
  } catch (err) {
    console.error("GitHub Import Error:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to import repo",
      error: err.message,
    });
  }
});


app.post("/api/ai/modify-project", async (req, res) => {
  try {
    const { instruction, files } = req.body;

    const prompt = `
You are an AI coding agent.

Modify this existing React project based on the instruction.

Instruction:
${instruction}

Current files JSON:
${JSON.stringify(files, null, 2)}

Return ONLY valid JSON.
No markdown.
No explanation.
Keep same file tree format.
Update only necessary files.
`;

    const result = await generateWithRetry(prompt);

    const clean = result
      .replace(/```json/g, "")
      .replace(/```js/g, "")
      .replace(/```/g, "")
      .trim();

    const updatedFiles = JSON.parse(clean);

    res.json({
      success: true,
      files: updatedFiles,
    });
  } catch (err) {
    console.error("Modify Project Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to modify project",
      error: err.message,
    });
  }
});

app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { code } = req.body;

    console.log("Suggestion request:", code);

    if (!code) {
      return res.json({ suggestion: "" });
    }

    let suggestion = "";


if (code.includes("console.")) {
  suggestion = "log()";
} else if (code.includes("app.")) {
  suggestion = "use()";
} else if (code.trim().endsWith("function")) {
  suggestion = " myFunction() {\n  \n}";
}

    res.json({ suggestion });
  } catch (error) {
    console.error("AI Suggest Error:", error);
    res.status(500).json({ suggestion: "" });
  }
});
async function generateWithRetry(prompt) {
  const geminiModels = [
    "gemini-2.0-flash",
    "gemini-2.5-flash-lite",
  ];

  for (const model of geminiModels) {
    try {
      console.log(`Trying Gemini model: ${model}`);

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      console.log("GEMINI SUCCESS");
      return response.text || "";
    } catch (err) {
      console.log(`Gemini failed: ${model}`);
      console.log(err.status || err.message);
    }
  }

  try {
    console.log("Trying Groq fallback...");

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    });

    console.log("GROQ SUCCESS");

    return response.choices[0]?.message?.content || "";
  } catch (err) {
    console.log("Groq failed");
    console.log(err.status || err.message);
  }

  return `
import React from "react";

export default function Generated() {
  return (
    <div>
      <h1>AI is busy. Temporary component created.</h1>
    </div>
  );
}
`;
}
app.post("/api/ai/explain", async (req, res) => {
  const { code } = req.body;

  try {
    const prompt = `
Explain this code in simple terms.

Code:
${code}

Return plain English explanation only.
`;

    const explanation = await generateWithRetry(prompt);

    res.json({
      explanation,
    });
  } catch (error) {
    res.status(500).json({
      explanation: "Failed to explain code",
    });
  }
});

app.get("/test-gemini", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: "Reply with: API Working",
    });

    res.json({
      success: true,
      text: response.text,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});
app.post("/api/ai/edit", async (req, res) => {
  const { selectedCode = "", instruction = "" } = req.body;

  try {
    const prompt = `
You are an expert software engineer.

Task:
${instruction}

Code:
${selectedCode}

Return ONLY code.
No markdown.
No explanations.
`;

    const editedCode = await generateWithRetry(prompt);

    res.json({
      editedCode,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      editedCode: selectedCode || "",
      error: error.message,
    });
  }
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err.message || "Something went wrong",
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});