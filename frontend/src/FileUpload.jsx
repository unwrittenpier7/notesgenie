import React, { useState } from "react"; 
import "./FileUpload.css";

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [quiz, setQuiz] = useState("");
  const [quizAnswers, setQuizAnswers] = useState("");
  const [loading, setLoading] = useState(false);
  const [generateDiagram, setGenerateDiagram] = useState(false);
  const [transcribeAudio, setTranscribeAudio] = useState(false);
  const [generateQuiz, setGenerateQuiz] = useState(false);
  const [studyStyle, setStudyStyle] = useState("basic");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // Handle file upload and note generation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file!");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("generateDiagram", generateDiagram);
    formData.append("transcribeAudio", transcribeAudio);
    formData.append("studyStyle", studyStyle);
    formData.append("generateQuiz", generateQuiz);

    setStatus("⏳ Uploading and processing...");
    setLoading(true);
    setNotes("");
    setQuiz("");
    setQuizAnswers("");

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      setNotes(data.notes || "No notes generated.");
      setQuiz(data.quiz || "");
      setStatus("✅ Notes generated successfully!");
    } catch (error) {
      console.error("❌ Upload error:", error);
      setStatus("❌ Failed to generate notes.");
    } finally {
      setLoading(false);
    }
  };

  // Copy notes
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      alert("Notes copied to clipboard!");
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Download notes
  const handleDownload = () => {
    const blob = new Blob([notes], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Ask notes
  const handleAsk = async () => {
    if (!question.trim()) return;
    setAnswer("⏳ Thinking...");
    try {
      const res = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, notes }),
      });
      const data = await res.json();
      setAnswer(data.answer || "No answer generated.");
    } catch (err) {
      console.error("Chat error:", err);
      setAnswer("❌ Failed to get response.");
    }
  };

 {/* Quiz Section */}
{Array.isArray(quiz) && quiz.length > 0 && generateQuiz && (
  <div className="mt-6 bg-white text-black p-4 rounded-lg shadow-lg w-full max-w-3xl">
    <h3 className="text-2xl font-semibold mb-2 text-indigo-700">Practice Quiz 📝</h3>

    {quiz.map((q, idx) => (
      <div key={idx} className="mb-3 p-2 border rounded">
        <p className="font-medium">{idx + 1}. {q.question}</p>
        {q.options.map((opt, i) => (
          <label key={i} className="flex items-center gap-2 ml-4">
            <input type="radio" name={`q${idx}`} />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    ))}

    {!quizAnswers && (
      <button
        onClick={() => setQuizAnswers(quiz.map(q => q.answer).join("\n"))}
        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded mt-2"
      >
        Reveal Answers
      </button>
    )}

    {quizAnswers && (
      <div className="mt-3 p-3 bg-gray-50 border rounded text-sm">
        <strong>Answers:</strong>
        <pre className="whitespace-pre-wrap">{quizAnswers}</pre>
      </div>
    )}
  </div>
)}


  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-4 text-center">NotesGenie 🧠</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center gap-4 w-full max-w-md bg-white p-6 rounded-xl shadow-md"
      >
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="border border-gray-300 p-2 rounded w-full bg-white text-black"
        />

        {/* Study Style */}
        <div className="flex flex-col w-full text-left">
          <label htmlFor="studyStyle" className="font-medium mb-1">
            Study Style 🎓
          </label>
          <select
            id="studyStyle"
            value={studyStyle}
            onChange={(e) => setStudyStyle(e.target.value)}
          >
            <option value="basic">📝 Basic Summary</option>
            <option value="detailed">📚 Detailed Notes</option>
            <option value="cheatsheet">⚡ Exam Cheat Sheet</option>
          </select>
        </div>

        {/* Feature Toggles */}
        <div className="feature-toggles">
          <label>
            <input
              type="checkbox"
              checked={generateDiagram}
              onChange={() => setGenerateDiagram(!generateDiagram)}
            />
            Diagram 🖼️
          </label>

          <label>
            <input
              type="checkbox"
              checked={transcribeAudio}
              onChange={() => setTranscribeAudio(!transcribeAudio)}
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
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded shadow transition mt-3"
        >
          Generate Notes
        </button>
      </form>

      <p className="mt-4 text-lg">{status}</p>

      {loading && (
        <div className="mt-3 animate-pulse text-indigo-500 font-semibold">⏳ Processing...</div>
      )}

      {/* Notes Section */}
      {notes && (
        <div className="mt-6 bg-white text-black p-4 rounded-lg shadow-lg w-full max-w-3xl overflow-y-auto max-h-[70vh]">
          <h3 className="text-2xl font-semibold mb-2 text-indigo-700">Generated Notes:</h3>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed">{notes}</pre>
          <div className="flex justify-end gap-3 mt-3">
            <button onClick={handleCopy} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded">
              📋 Copy
            </button>
            <button onClick={handleDownload} className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded">
              ⬇️ Download
            </button>
          </div>
        </div>
      )}

      {/* Diagram Button (Craiyon) */}
      {notes && generateDiagram && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              const prompt = encodeURIComponent(`Create an educational diagram illustrating: ${notes}`);
              window.open(`https://www.craiyon.com/?prompt=${prompt}`, "_blank");
            }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Open Diagram 🖼️
          </button>
        </div>
      )}

      {/* Quiz Section */}
{/* Quiz Button */}
{Array.isArray(quiz) && quiz.length > 0 && generateQuiz && (
  <div className="mt-6 flex justify-center">
    <button
      onClick={() => {
        const quizWindow = window.open("", "_blank", "width=600,height=700,scrollbars=yes,resizable=yes");
        const html = `
          <html>
          <head>
            <title>Practice Quiz</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; }
              h2 { color: #4f46e5; }
              .question { margin-bottom: 20px; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #ddd; }
              .options label { display: block; margin: 5px 0; cursor: pointer; padding: 5px; border-radius: 4px; }
              .correct { background-color: #d1fae5; }   /* green */
              .wrong { background-color: #fee2e2; }    /* red */
              button { margin-top: 10px; padding: 5px 10px; background-color: #4f46e5; color: white; border: none; border-radius: 5px; cursor: pointer; }
            </style>
          </head>
          <body>
            <h2>Practice Quiz 📝</h2>
            ${quiz.map((q, idx) => `
              <div class="question" id="q${idx}">
                <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
                <div class="options">
                  ${q.options.map((opt, i) => `
                    <label>
                      <input type="radio" name="q${idx}" value="${opt}"> ${opt}
                    </label>
                  `).join("")}
                </div>
                <small style="display:none;" class="answer">Answer: ${q.answer}</small>
              </div>
            `).join("")}
            <button onclick="
              document.querySelectorAll('.question').forEach(q => {
                const selected = q.querySelector('input:checked');
                const answerEl = q.querySelector('.answer');
                answerEl.style.display = 'block';
                if(selected && selected.value === answerEl.textContent.replace('Answer: ','')){
                  selected.parentElement.classList.add('correct');
                } else if(selected){
                  selected.parentElement.classList.add('wrong');
                }
              });
            ">Reveal Answers</button>
          </body>
          </html>
        `;
        quizWindow.document.write(html);
        quizWindow.document.close();
      }}
      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
    >
      Open Quiz 📝
    </button>
  </div>
)}


      {/* Chat with Notes */}
      {notes && (
        <div className="mt-6 bg-white text-black p-4 rounded-lg shadow-lg w-full max-w-3xl">
          <h3 className="text-2xl font-semibold mb-2 text-indigo-700">Ask Your Notes 💬</h3>
          <input
            type="text"
            placeholder="Ask a question about your notes..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="border border-gray-300 p-2 rounded w-full mb-2"
          />
          <button
            onClick={handleAsk}
            className="ask-btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
          >
            Ask
          </button>
          {answer && (
            <div className="mt-3 p-3 bg-gray-50 border rounded text-sm">
              <strong>Answer:</strong> {answer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
