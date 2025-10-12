const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// --- OpenAI setup ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Extract text from files ---
async function extractText(filePath, mimeType, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  try {
    if (mimeType === "application/pdf" || ext === ".pdf") {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text;
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".docx"
    ) {
      const data = await mammoth.extractRawText({ path: filePath });
      return data.value;
    } else if (mimeType.startsWith("text/") || ext === ".txt") {
      return fs.readFileSync(filePath, "utf-8");
    } else if (mimeType.startsWith("audio/") || [".mp3", ".wav", ".m4a"].includes(ext)) {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "gpt-4o-mini-transcribe",
      });
      return transcription.text || "";
    } else {
      return "Unsupported file type. Please upload PDF, DOCX, TXT, or supported audio formats.";
    }
  } catch (err) {
    console.error("❌ Error reading file:", err);
    return "Error extracting text from file.";
  }
}

// --- Upload Route ---
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const generateDiagram = req.body.generateDiagram === "true";
  const generateQuiz = req.body.generateQuiz === "true";
  const studyStyle = req.body.studyStyle || "basic";

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const text = await extractText(file.path, file.mimetype, file.originalname);

    // --- Truncate to avoid token overflow ---
    const truncatedText = text.slice(0, 4000);

    // --- Generate Notes ---
    const summaryPrompt = `
Generate ${studyStyle} study notes from the following content.
Organize them with headings, bullet points, and key highlights:

${truncatedText}
`;

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful academic note generator." },
        { role: "user", content: summaryPrompt },
      ],
    });

    const notes = summaryResponse.choices[0]?.message?.content?.trim() || "No notes generated.";

    let diagramUrl = "";
    // --- Optional Diagram ---
    if (generateDiagram) {
      try {
        // Truncate diagram prompt to max 1000 chars (required by API)
        const diagramPrompt = `Create an educational diagram illustrating: ${summaryPrompt}`.slice(0, 1000);

        const imageResp = await openai.images.generate({
          model: "dall-e-2",
          prompt: diagramPrompt,
          size: "1024x1024",
        });
        diagramUrl = imageResp.data[0].url;
      } catch (err) {
        console.warn("⚠️ Diagram generation failed:", err.message);
      }
    }

   let quiz = [];
if (generateQuiz) {
  try {
    const quizResp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "user",
          content: `Create 5 MCQ questions in JSON array format from these notes. 
Each question should have 'question', 'options' (array of 4), and 'answer' fields only.
Return only valid JSON: \n\n${notes}`
        }
      ],
    });

    // Clean and parse JSON safely
    const text = quizResp.choices[0]?.message?.content || "[]";
    const match = text.match(/\[.*\]/s); // extract JSON array
    quiz = match ? JSON.parse(match[0]) : [];
  } catch (err) {
    console.warn("⚠️ Quiz generation failed:", err.message);
    quiz = [];
  }
}


    res.json({ notes, diagramUrl, quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate notes or quiz." });
  } finally {
    if (file) fs.unlinkSync(file.path);
  }
});

// --- Ask Route ---
app.post("/ask", async (req, res) => {
  const { question, notes } = req.body;
  if (!question || !notes)
    return res.status(400).json({ answer: "Missing question or notes." });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that answers questions based on provided study notes." },
        { role: "user", content: `Notes:\n${notes}\n\nQuestion: ${question}` },
      ],
    });
    const answer = response.choices[0]?.message?.content?.trim() || "No answer generated.";
    res.json({ answer });
  } catch (err) {
    console.error("❌ /ask error:", err);
    res.status(500).json({ answer: "❌ Failed to get response." });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 NotesGenie Server running at http://localhost:${PORT}`));
