const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    fileName: String,
    notes: String,
    diagramUrl: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
