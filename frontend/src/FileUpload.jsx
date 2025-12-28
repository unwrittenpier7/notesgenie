import React, { useEffect, useState } from "react";
import "./FileUpload.css";
import QuizModal from "./QuizModal";

export default function FileUpload({ selectedNoteId, onBack }) {
  const [step, setStep] = useState("generate"); // generate | result

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");

  const [transcribeAudio, setTranscribeAudio] = useState(false);

  const [quiz, setQuiz] = useState([]);
  const [showQuiz, setShowQuiz] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generateDiagram, setGenerateDiagram] = useState(false);
  const [generateQuiz, setGenerateQuiz] = useState(false);
  const [studyStyle, setStudyStyle] = useState("basic");

  const [diagramUrl, setDiagramUrl] = useState("");
  const [noteId, setNoteId] = useState(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const token = localStorage.getItem("token");

  // --------------------
  // LOAD EXISTING NOTE
  // --------------------
  useEffect(() => {
    if (!selectedNoteId) return;

    fetch(
      `https://notesgenie-backend.onrender.com/notes/${selectedNoteId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.notes || "");
        setDiagramUrl(data.diagramUrl || "");
        setQuiz([]);
        setNoteId(data._id);
        setStatus("📂 Viewing saved notes");
        setStep("result");
      });
  }, [selectedNoteId]);

  // --------------------
  // FILE SUBMIT
  // --------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("generateDiagram", generateDiagram);
    formData.append("studyStyle", studyStyle);
    formData.append("generateQuiz", generateQuiz);
    formData.append("transcribeAudio", transcribeAudio);

    setStatus("⏳ Uploading and processing...");
    setLoading(true);
    setNotes("");
    setQuiz([]);
    setDiagramUrl("");
    setNoteId(null);

    try {
      const response = await fetch(
        "https://notesgenie-backend.onrender.com/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      setNotes(data.notes || "");
      setQuiz(Array.isArray(data.quiz) ? data.quiz : []);
      setDiagramUrl(data.diagramUrl || "");
      setNoteId(data.noteId || null);

      setStatus("✅ Notes generated successfully!");
      setStep("result");
    } catch (error) {
      console.error("❌ Upload error:", error);
      setStatus("❌ Failed to generate notes.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------
  // ASK NOTES
  // --------------------
  
  const handleAsk = async () => {
    if (!question.trim()) return;

    setAnswer("⏳ Thinking...");
    try {
      const res = await fetch(
        "https://notesgenie-backend.onrender.com/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question, notes }),
        }
      );

      const data = await res.json();
      setAnswer(data.answer || "No answer generated.");
    } catch {
      setAnswer("❌ Failed to respond.");
    }
  };


  // --------------------
// COPY & DOWNLOAD
// --------------------
const handleCopyNotes = async () => {

  if (!notes) return;
  await navigator.clipboard.writeText(notes);
  alert("Notes copied!");
};

const handleDownload = () => {
  if (!notes) return;

  const blob = new Blob([notes], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "notes.txt";
  a.click();

  URL.revokeObjectURL(url);
};


  // --------------------
  // RENDER
  // --------------------
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start p-6 bg-gray-50 text-gray-900">
      <button className="dashboard-btn" onClick={onBack}>
        Dashboard
      </button>

      {step === "generate" && (
        <>
          <h1 className="text-4xl font-bold mb-6 text-center">
            NotesGenie 🧠
          </h1>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center gap-4 w-full max-w-md bg-white p-6 rounded-xl shadow-md"
          >
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="border border-gray-300 p-2 rounded w-full"
            />

            <div className="flex flex-col w-full">
              <label>Study Style 🎓</label>
              <select
                value={studyStyle}
                onChange={(e) => setStudyStyle(e.target.value)}
              >
                <option value="basic">📝 Basic</option>
                <option value="detailed">📚 Detailed</option>
                <option value="cheatsheet">⚡ Cheat Sheet</option>
              </select>
            </div>

            <div className="feature-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={generateDiagram}
                  onChange={() =>
                    setGenerateDiagram(!generateDiagram)
                  }
                />
                Diagram 🖼️
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={transcribeAudio}
                  onChange={() =>
                    setTranscribeAudio(!transcribeAudio)
                  }
                />
                Transcribe 🎙️
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={generateQuiz}
                  onChange={() => setGenerateQuiz(!generateQuiz)}
                />
                Quiz 📝
              </label>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded"
            >
              Generate Notes
            </button>
          </form>

          <p className="mt-4">{status}</p>
          {loading && <div className="mt-3">⏳ Processing...</div>}
        </>
      )}

      {step === "result" && (
        <div className="w-full max-w-4xl space-y-6">
          <div className="bg-white p-4 rounded-lg">
            <h3>Generated Notes</h3>
            <pre>{notes}</pre>

            <div className="notes-actions">
           <button className="action-btn" onClick={handleCopyNotes}>
  📋 Copy
</button>

              <button
                className="action-btn"
                onClick={handleDownload}
              >
                ⬇️ Download
              </button>

              {quiz.length > 0 && (
                <button
                  className="action-btn primary"
                  onClick={() => setShowQuiz(true)}
                >
                  📝 Start Quiz
                </button>
              )}
            </div>
          </div>

          {diagramUrl && (
            <div className="bg-white p-4 rounded-lg">
              <h3>Generated Diagram</h3>
              <img
                src={diagramUrl}
                alt="Diagram"
                className="rounded shadow-lg max-w-full"
              />
            </div>
          )}

          <div className="ask-section">
            <h3>Ask Your Notes</h3>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something..."
              className="ask-input"
            />

            <button onClick={handleAsk} className="ask-btn">
              Ask
            </button>

            {answer && <p className="ask-answer">{answer}</p>}
          </div>
        </div>
      )}

      {showQuiz && noteId && (
        <QuizModal
          quiz={quiz}
          noteId={noteId}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
}
