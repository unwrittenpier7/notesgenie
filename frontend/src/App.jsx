import React, { useEffect, useState } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import FileUpload from "./FileUpload";

export default function App() {
  const [page, setPage] = useState("loading");
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setPage("login");
      return;
    }

    // validate token with backend
    fetch("http://localhost:5000/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          setPage("dashboard");
        } else {
          localStorage.removeItem("token");
          setPage("login");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
        setPage("login");
      });
  }, []);

  if (page === "loading") {
    return <p>Loading...</p>;
  }

  if (page === "login") {
    return <Login onLogin={() => setPage("dashboard")} />;
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        onCreateNew={() => {
          setSelectedNoteId(null);
          setPage("upload");
        }}
        onOpenNote={(id) => {
          setSelectedNoteId(id);
          setPage("upload");
        }}
      />
    );
  }

  // upload page
// upload page
return (
  <FileUpload
    selectedNoteId={selectedNoteId}
    onBack={() => setPage("dashboard")}
  />
);
}
  