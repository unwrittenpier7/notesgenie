import React, { useEffect, useState } from "react";
import "./Dashboard.css";

export default function Dashboard({ onCreateNew, onOpenNote }) {
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [quizHistory, setQuizHistory] = useState({});
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");

  const token = localStorage.getItem("token");

  useEffect(() => {
    // Fetch notes history
    fetch("http://localhost:5000/notes/history", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setNotes);

    // Fetch dashboard stats
    fetch("http://localhost:5000/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setStats);
  }, []);

  // 🔍 SEARCH + SORT LOGIC
  const filteredNotes = notes
    .filter(note =>
      note.fileName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "latest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  // 🗑 DELETE NOTE
  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note permanently?")) return;

    await fetch(`http://localhost:5000/notes/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    setNotes(prev => prev.filter(n => n._id !== id));

    setQuizHistory(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // 📜 Load quiz history
  const loadQuizHistory = async (noteId) => {
    if (quizHistory[noteId]) return;

    const res = await fetch(
      `http://localhost:5000/quiz/history/${noteId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    const data = await res.json();

    setQuizHistory(prev => ({
      ...prev,
      [noteId]: data
    }));
  };

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <h1>📊 Dashboard</h1>

        <div className="header-actions">
          <button onClick={onCreateNew}>➕ New Notes</button>

          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* STATS */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{stats.totalNotes}</h3>
            <p>Notes Created</p>
          </div>

          <div className="stat-card">
            <h3>{stats.totalAttempts}</h3>
            <p>Quiz Attempts</p>
          </div>

          <div className="stat-card">
            <h3>{stats.bestScore}</h3>
            <p>Best Score</p>
          </div>
        </div>
      )}

      <h2 className="section-title">📂 Your Notes</h2>

      {/* 🔍 SEARCH + FILTER BAR */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* NOTES LIST */}
      <div className="notes-list">
        {filteredNotes.length === 0 && <p>No matching notes.</p>}

        {filteredNotes.map(note => (
          <div key={note._id} className="note-card">
            <div className="note-info">
              <strong>{note.fileName}</strong>
              <p>{new Date(note.createdAt).toLocaleString()}</p>
            </div>

            <div className="note-actions">
              <button onClick={() => onOpenNote(note._id)}>
                Open
              </button>

              <button onClick={() => loadQuizHistory(note._id)}>
                Quiz History
              </button>

              <button
                className="delete-btn"
                onClick={() => deleteNote(note._id)}
              >
                Delete
              </button>
            </div>

            {/* QUIZ HISTORY */}
            {quizHistory[note._id] && (
              <div className="quiz-history">
                {quizHistory[note._id].length === 0 && (
                  <p>No quiz attempts yet.</p>
                )}

                {quizHistory[note._id].map((q, i) => (
                  <p key={i}>
                    🎯 {q.score}/{q.total} —{" "}
                    {new Date(q.createdAt).toLocaleString()}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
