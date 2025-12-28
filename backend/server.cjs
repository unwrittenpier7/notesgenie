const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

const connectDB = require("./db.cjs");
const auth = require("./auth.cjs");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User.cjs");
const Note = require("./models/Note.cjs");
const QuizAttempt = require("./models/QuizAttempt.cjs");

dotenv.config();
const app = express();

/* =========================
   CORS (MUST BE FIRST)
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://notesgenie-frontend.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
  
);
//app.options("*", cors());
app.use(express.json());

/* =========================
   DB
========================= */
connectDB();

/* =========================
   OPENAI
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* =========================
   AUTH CHECK
========================= */
app.get("/auth/me", auth, (req, res) => {
  res.json({ ok: true, userId: req.user.id });
});

/* =========================
   MULTER (ALLOW ANY FILE)
========================= */
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

/* =========================
   HELPERS
========================= */
const toBase64 = (filePath) =>
  fs.readFileSync(filePath).toString("base64");

/* =========================
   TEXT EXTRACTION (ALL TYPES)
========================= */
async function extractText(file) {
  const filePath = file.path;
  const mime = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  try {
    // PDF
    if (mime === "application/pdf" || ext === ".pdf") {
      const data = await pdfParse(fs.readFileSync(filePath));
      return data.text;
    }

    // DOCX
    if (
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === ".docx"
    ) {
      const data = await mammoth.extractRawText({ path: filePath });
      return data.value;
    }

    // TEXT
    if (mime.startsWith("text/") || ext === ".txt") {
      return fs.readFileSync(filePath, "utf-8");
    }

    // AUDIO
    if (mime.startsWith("audio/")) {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: "gpt-4o-mini-transcribe"
      });
      return transcription.text || "";
    }

    // IMAGE (ROBUST CHECK)
    if (
      mime.startsWith("image/") ||
      [".png", ".jpg", ".jpeg", ".webp"].includes(ext)
    ) {
      const base64 = toBase64(filePath);

      const resp = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Extract all readable text from this image." },
              {
                type: "input_image",
                image_url: `data:${mime};base64,${base64}`
              }
            ]
          }
        ]
      });

      return resp.output_text || "";
    }

    return "";
  } catch (err) {
    console.error("❌ Extract error:", err);
    return "";
  }
}

/* =========================
   AUTH ROUTES
========================= */
app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (await User.findOne({ email }))
    return res.status(400).json({ error: "User exists" });

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed });

  res.json({ success: true });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});
// ======================
// QUIZ HISTORY PER NOTE
// ======================
app.get("/quiz/history/:noteId", auth, async (req, res) => {
  const { noteId } = req.params;

  // validate ObjectId
  if (!noteId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  const attempts = await QuizAttempt.find({
    userId: req.user.id,
    noteId
  }).sort({ createdAt: -1 });

  res.json(attempts);
});


/* =========================
   UPLOAD + NOTES
========================= */
app.post("/upload", auth, upload.single("file"), async (req, res) => {
  const file = req.file;
  const { generateDiagram, generateQuiz, studyStyle } = req.body;

  if (!file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const text = await extractText(file);

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ error: "No readable content found" });
    }

    const limitedText = text.slice(0, 5000);

    const notesResp = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `Create ${studyStyle || "basic"} structured notes:\n${limitedText}`
    });

    const notes = notesResp.output_text || "";

    let diagramUrl = "";
    if (generateDiagram === "true") {
      const topicResp = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `Extract ONE diagram topic:\n${notes}`
      });

      const topic = topicResp.output_text?.trim();
      if (topic) {
        const img = await openai.images.generate({
          model: "gpt-image-1",
          prompt: `Clean educational diagram of ${topic}`,
          size: "1024x1024"
        });

        diagramUrl = `data:image/png;base64,${img.data[0].b64_json}`;
      }
    }

    let quiz = [];
    if (generateQuiz === "true") {
      const quizResp = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `Return ONLY JSON array of 5 MCQs from notes:\n${notes}`
      });

      const raw = quizResp.output_text || "";
      const match = raw.match(/\[[\s\S]*\]/);
      quiz = match ? JSON.parse(match[0]) : [];
    }

    const savedNote = await Note.create({
      userId: req.user.id,
      fileName: file.originalname,
      notes,
      diagramUrl
    });

    res.json({
      notes,
      diagramUrl,
      quiz,
      noteId: savedNote._id
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: "Server failed" });
  } finally {
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }
});

/* =========================
   NOTES
========================= */
app.get("/notes/history", auth, async (req, res) => {
  const notes = await Note.find({ userId: req.user.id })
    .sort({ createdAt: -1 });
  res.json(notes);
});

app.get("/notes/:id", auth, async (req, res) => {
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/))
    return res.status(400).json({ error: "Invalid ID" });

  const note = await Note.findOne({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!note) return res.status(404).json({ error: "Not found" });
  res.json(note);
});

app.delete("/notes/:id", auth, async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  if (!note) return res.status(404).json({ error: "Not found" });

  await QuizAttempt.deleteMany({ noteId: note._id });
  res.json({ success: true });
});

/* =========================
   QUIZ
========================= */
app.post("/quiz/submit", auth, async (req, res) => {
  const { score, total, answers, noteId } = req.body;

  await QuizAttempt.create({
    userId: req.user.id,
    noteId,
    score,
    total,
    answers
  });

  res.json({ success: true });
});

app.get("/dashboard/stats", auth, async (req, res) => {
  const attempts = await QuizAttempt.find({ userId: req.user.id });

  res.json({
    totalNotes: await Note.countDocuments({ userId: req.user.id }),
    totalAttempts: attempts.length,
    bestScore: Math.max(0, ...attempts.map(a => a.score || 0))
  });
});

/* =========================
   ASK NOTES
========================= */
app.post("/ask", auth, async (req, res) => {
  const { question, notes } = req.body;

  const resp = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `Answer strictly from notes:\n${notes}\nQ:${question}`
  });

  res.json({ answer: resp.output_text || "" });
});

/* ========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`✅ Backend running on port ${PORT}`)
);
/* ========================= */
