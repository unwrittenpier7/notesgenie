import React, { useEffect, useState } from "react";
import "./QuizModal.css";

export default function QuizModal({ quiz, noteId, onClose }) {
  if (!Array.isArray(quiz) || !noteId) return null;

  const TOTAL_TIME = 60; // seconds
  const token = localStorage.getItem("token");

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [saving, setSaving] = useState(false);

  // ⏱️ TIMER (auto submit)
  useEffect(() => {
    if (submitted) return;

    if (timeLeft === 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleChange = (qIndex, option) => {
    if (submitted) return;
    setAnswers({ ...answers, [qIndex]: option });
  };

  // 📤 SUBMIT QUIZ → SAVE TO DB
  const handleSubmit = async () => {
    if (submitted) return;

    let sc = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.answer) sc++;
    });

    setScore(sc);
    setSubmitted(true);
    setSaving(true);

    try {
      await fetch("http://localhost:5000/quiz/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          score: sc,
          total: quiz.length,
          answers,
          noteId
        })
      });
    } catch (err) {
      console.error("❌ Failed to save quiz attempt", err);
    } finally {
      setSaving(false);
    }
  };

  // 🔄 RETAKE (new attempt)
  const handleRetake = () => {
    setAnswers({});
    setScore(0);
    setSubmitted(false);
    setTimeLeft(TOTAL_TIME);
  };

  return (
    <div className="quiz-backdrop">
      <div className="quiz-modal">
        <div className="quiz-header">
          <h2>📝 Practice Quiz</h2>
          <div className="quiz-timer">⏱️ {timeLeft}s</div>
        </div>

        {quiz.map((q, idx) => {
          const userAns = answers[idx];

          return (
            <div key={idx} className="quiz-question">
              <p>
                <strong>{idx + 1}. {q.question}</strong>
              </p>

              {q.options.map((opt, i) => {
                let className = "quiz-option";

                if (submitted) {
                  if (opt === q.answer) className += " correct";
                  else if (opt === userAns) className += " wrong";
                }

                return (
                  <label key={i} className={className}>
                    <input
                      type="radio"
                      name={`q${idx}`}
                      checked={userAns === opt}
                      disabled={submitted}
                      onChange={() => handleChange(idx, opt)}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          );
        })}

        {!submitted ? (
          <button className="quiz-btn" onClick={handleSubmit}>
            Submit
          </button>
        ) : (
          <>
            <div className="quiz-score">
              🎯 Score: {score} / {quiz.length}
            </div>

            {saving && <p>💾 Saving attempt...</p>}

            <button className="quiz-btn" onClick={handleRetake}>
              🔄 Retake Quiz
            </button>
          </>
        )}

        <button className="quiz-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
