const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    noteId: mongoose.Schema.Types.ObjectId,
    score: Number,
    total: Number,
    answers: Object
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
