import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey!,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API routes
  app.post("/api/chat", async (req, res) => {
    const { message, previousId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      // Using Interactions API for conversational flow
      const interactionParams: any = {
        model: "gemini-3.5-flash",
        input: message,
        system_instruction: "You are a helpful diary assistant. Use the provided diary context to answer queries."
      };
      
      if (previousId) {
        interactionParams.previous_interaction_id = previousId;
      }
      
      const interaction = (await ai.interactions.create(interactionParams)) as any;
      let fullOutput = "";
      for (const step of interaction.steps) {
        if (step.type === 'model_output') {
          const textContent = step.content?.find(c => c.type === 'text');
          if (textContent && textContent.text) {
            fullOutput += textContent.text;
          }
        }
      }
      res.json({ response: fullOutput, interactionId: interaction.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to communicate with AI" });
    }
  });

  app.post("/api/summarize", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Summarize the following diary content:\n\n${text}\n\nSummary (brief and concise):`,
      });
      res.json({ summary: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  app.post("/api/analyze-mood", async (req, res) => {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analyze the emotional tone of the following diary entry and provide a brief summary of the mood. Return the result in JSON format: { "mood": string, "summary": string, "score": number (0-100 representing positive sentiment) }. \n\nEntry: ${text}`,
        config: {
          responseMimeType: "application/json",
        },
      });
      res.json(JSON.parse(response.text!));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze mood" });
    }
  });

  app.post("/api/weather", async (req, res) => {
    const { lat, lon } = req.body;
    try {
      // NOTE: User must provide OPENWEATHER_API_KEY in environment variables
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        return res.json({ weather: "Unknown (API key missing)" });
      }
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
      const data = await response.json();
      res.json({ weather: `${data.weather[0].main}, ${Math.round(data.main.temp)}°C` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch weather" });
    }
  });

  app.post("/api/analyze-image", async (req, res) => {
    const { imageBase64 } = req.body;
    try {
      if (!apiKey) throw new Error("Gemini API key missing");
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/png"
            }
          },
          "Extract all text from this image (OCR). Also parse any embedded EXIF-like data if visible. Return JSON: { text: string, details: string }."
        ],
        config: { responseMimeType: "application/json" }
      });
      res.json(JSON.parse(response.text!));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  app.post("/api/ocr", async (req, res) => {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Image is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
            {
                role: "user",
                parts: [
                    { text: "Extract all text from this image." },
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: imageBase64.split(',')[1] || imageBase64
                        }
                    }
                ]
            }
        ],
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to extract text" });
    }
  });

  app.post("/api/weather-info", async (req, res) => {
    const { location } = req.body;
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Provide current weather information for: ${location}. Return JSON format: { "temp": string, "condition": string }.`,
        config: {
          responseMimeType: "application/json",
        },
      });
      res.json(JSON.parse(response.text!));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to get weather" });
    }
  });

  app.post("/api/reflect", async (req, res) => {
    const { current, past } = req.body;
    if (!current) {
      return res.status(400).json({ error: "Current entry is required" });
    }

    try {
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Reflect on the following current entry, using the provided past entries for context to find connections or patterns. Return a brief, insightful reflection. \n\nCurrent Entry: ${current} \n\nPast Entries: ${JSON.stringify(past)}`,
      });
      res.json({ reflection: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to perform reflection" });
    }
  });

  app.post("/api/backup-data", async (req, res) => {
    const { encryptedData } = req.body;
    try {
      // In production, store this encrypted data in a database or cloud storage
      // associated with the user.
      (global as any).storedBackup = encryptedData;
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save backup" });
    }
  });

  app.get("/api/backup-data", async (req, res) => {
    try {
      res.json({ encryptedData: (global as any).storedBackup });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to retrieve backup" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
