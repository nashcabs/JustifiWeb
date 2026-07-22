import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";

// Helper function to format the Unity quizId (e.g., "ch1_ep1" -> "CH1 EP1")
function formatChapterName(quizId) {
  if (!quizId) return "Unknown Chapter";
  return quizId.replace(/_/g, " ").toUpperCase();
}

export default function StudentQuiz() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Pulls the synced array from Firestore
  const quizResults = Array.isArray(user?.quizScores) ? user.quizScores : [];

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Quizzes
          </a>
        </div>
      </header>

      <div className="back-row">
        <a
          className="back-btn"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("/dashboard/student");
          }}
        >
          Back
        </a>
      </div>

      <main className="students-shell">
        <section className="hero-card">
          <p className="eyebrow">QUIZ HISTORY</p>
          <h1>Your Quiz Results</h1>
          <p className="hero-subtext">
            View all completed chapter quizzes and percentage scores.
          </p>
        </section>

        <section className="list-card">
          <div className="list-header">
            <h2>Completed Quizzes</h2>
          </div>

          <div className="student-list">
            {!quizResults.length ? (
              <div className="empty-state">No quiz results found. Play the game to record scores!</div>
            ) : (
              quizResults.map((quiz, index) => {
                // Map the exact keys coming from Unity's QuizDataManager.cs
                const chapterName = formatChapterName(quiz.quizId);
                const dateTaken = quiz.lastAttemptDate || "No date available";
                
                // Convert the float (e.g., 0.85) to a whole number percentage
                const percentageScore = Math.round((quiz.bestPercent || 0) * 100);
                
                // Optional: Color code the score based on passing (50%+)
                const scoreColor = percentageScore >= 50 ? "#2e7d32" : "#d32f2f";

                return (
                  <div className="student-card" key={quiz.quizId || index}>
                    <div className="student-main">
                      <h3>{chapterName}</h3>
                      <p style={{ color: "#666", marginTop: "4px" }}>Date Taken: {dateTaken}</p>
                    </div>

                    <div className="student-action" style={{ fontWeight: "bold", fontSize: "1.2rem", color: scoreColor }}>
                      {percentageScore}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </>
  );
}