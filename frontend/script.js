const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("file");
const statusBox = document.getElementById("status");
const notesBox = document.getElementById("notesBox");
const notesOutput = document.getElementById("notesOutput");
const spinner = document.getElementById("spinner");
const themeToggle = document.getElementById("themeToggle");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Upload handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!fileInput.files.length) {
    alert("Please select a file first!");
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  statusBox.textContent = "⏳ Uploading and processing file...";
  spinner.classList.remove("hidden");
  notesBox.classList.add("hidden");

  try {
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");

    const data = await response.json();

    notesOutput.textContent = data.notes || "No notes generated.";
    notesBox.classList.remove("hidden");
    statusBox.textContent = "✅ Notes generated successfully!";
  } catch (error) {
    console.error(error);
    statusBox.textContent = "❌ Failed to generate notes.";
  } finally {
    spinner.classList.add("hidden");
  }
});

// Dark mode toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});

// Copy notes
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(notesOutput.textContent)
    .then(() => alert("Notes copied to clipboard!"))
    .catch(err => console.error("Copy failed:", err));
});

// Download notes
downloadBtn.addEventListener("click", () => {
  const blob = new Blob([notesOutput.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notes.txt";
  a.click();
  URL.revokeObjectURL(url);
});
