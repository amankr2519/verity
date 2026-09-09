"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type ClaimStatus = "Verified" | "Inaccurate" | "False" | "Unverifiable";
type Claim = {
  claim: string;
  category: string;
  status?: ClaimStatus;
  reasoning?: string;
};
type ProcessStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "verifying"
  | "success"
  | "error";

const stages = [
  { key: "uploading", label: "Read document" },
  { key: "extracting", label: "Find claims" },
  { key: "verifying", label: "Check evidence" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong while checking this file.";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [results, setResults] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseFile = (selectedFile?: File) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("That PDF is larger than 10MB. Choose a smaller file.");
      return;
    }
    setFile(selectedFile);
    setError(null);
    setStatus("idle");
    setResults([]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) =>
    chooseFile(event.target.files?.[0]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok)
        throw new Error(uploadData.error || "Could not read this PDF.");

      setStatus("extracting");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.text }),
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok)
        throw new Error(extractData.error || "Could not find claims.");
      if (
        !Array.isArray(extractData.claims) ||
        extractData.claims.length === 0
      ) {
        throw new Error("No verifiable claims were found in this document.");
      }

      setStatus("verifying");
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims: extractData.claims }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok)
        throw new Error(verifyData.error || "Could not verify the claims.");
      setResults(Array.isArray(verifyData.results) ? verifyData.results : []);
      setStatus("success");
    } catch (caughtError) {
      console.error(caughtError);
      setError(getErrorMessage(caughtError));
      setStatus("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus("idle");
    setResults([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadCSV = () => {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = results.map((result) => [
      escapeCsv(result.claim),
      escapeCsv(result.category),
      escapeCsv(result.status || "Unverifiable"),
      escapeCsv(result.reasoning || "No reasoning available."),
    ]);
    const csv = [
      "Claim,Category,Status,Reasoning",
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `verity-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeStage = stages.findIndex((stage) => stage.key === status);
  const isProcessing = ["uploading", "extracting", "verifying"].includes(
    status,
  );

  return (
    <main className="site-shell">
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="Verity home">
          <span className="brand-mark">V</span>
          <span>verity</span>
        </a>
        <div className="nav-meta">
          <span className="live-dot" /> Live evidence desk{" "}
          <span className="nav-divider" /> v1.0
        </div>
      </nav>
      <div className="page-content" id="top">
        <section className="intro-grid">
          <div className="intro-copy">
            <p className="eyebrow">Document intelligence / 01</p>
            <h1>
              Make every claim
              <br />
              <em>earn its place.</em>
            </h1>
            <p className="lede">
              Drop in a research paper, report, or briefing. Verity finds the
              statements that matter, then checks each one against current web
              evidence.
            </p>
            <div className="signal-row">
              <span className="signal-line" />
              <span>PDF to proof, in one pass</span>
            </div>
          </div>
          <div className="architecture-note">
            <span className="note-number">01</span>
            <p>
              Built for the moment
              <br />
              <strong>before you hit publish.</strong>
            </p>
            <div className="note-rule" />
            <span className="note-caption">Groq reasoning + live search</span>
          </div>
        </section>
        <section className="workspace" aria-label="Fact-check workspace">
          <div className="workspace-head">
            <div>
              <p className="section-kicker">Start a review</p>
              <h2>Bring a document into focus.</h2>
            </div>
            <span className="step-count">
              01 <i /> 03
            </span>
          </div>
          {(status === "idle" || status === "error") && (
            <div
              className={`dropzone ${isDragging ? "is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
              <label htmlFor="pdf-upload" className="dropzone-label">
                <span className="upload-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                  </svg>
                </span>
                <span className="drop-title">
                  {file ? file.name : "Drop your PDF here"}
                </span>
                <span className="drop-subtitle">
                  or <u>browse your files</u> · PDF up to 10MB
                </span>
              </label>
              {file && (
                <button className="primary-button" onClick={handleProcess}>
                  Run fact-check <span>↗</span>
                </button>
              )}
            </div>
          )}
          {isProcessing && (
            <div className="processing-panel">
              <div className="processing-top">
                <span className="processing-pulse" /> Working through{" "}
                <strong>{file?.name}</strong>
              </div>
              <div className="progress-track">
                <span
                  style={{
                    width: `${Math.max(18, (activeStage + 1) * 33.33)}%`,
                  }}
                />
              </div>
              <div className="stage-list">
                {stages.map((stage, index) => (
                  <div
                    className={`stage ${index <= activeStage ? "stage-active" : ""}`}
                    key={stage.key}
                  >
                    <span>{index < activeStage ? "✓" : `0${index + 1}`}</span>
                    {stage.label}
                  </div>
                ))}
              </div>
              <p className="processing-note">
                {status === "verifying"
                  ? "Comparing claims with live search results. This can take a moment."
                  : "Reading the structure and meaning of your document."}
              </p>
            </div>
          )}
          {error && (
            <div className="error-message" role="alert">
              <span>!</span>
              {error}
            </div>
          )}
        </section>
        {status === "success" && (
          <section className="results-section">
            <div className="results-head">
              <div>
                <p className="section-kicker">Review complete</p>
                <h2>Evidence, organized.</h2>
              </div>
              <div className="result-actions">
                <button className="text-button" onClick={downloadCSV}>
                  ↓ Export CSV
                </button>
                <button className="dark-button" onClick={handleReset}>
                  Check another <span>↗</span>
                </button>
              </div>
            </div>
            <div className="result-summary">
              <span className="summary-number">{results.length}</span>
              <span>
                claims reviewed from <strong>{file?.name}</strong>
              </span>
              <span className="summary-spacer" />
              <span className="verified-key" />
              <span>Verified</span>
              <span className="uncertain-key" />
              <span>Needs context</span>
            </div>
            <div className="results-list">
              {results.map((item, index) => (
                <article className="result-row" key={`${item.claim}-${index}`}>
                  <span className="result-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="result-claim">
                    <p className="category-label">
                      {item.category.replaceAll("_", " ")}
                    </p>
                    <h3>{item.claim}</h3>
                  </div>
                  <div
                    className={`status-badge status-${(item.status || "Unverifiable").toLowerCase()}`}
                  >
                    <span />
                    {item.status || "Unverifiable"}
                  </div>
                  <p className="reasoning">
                    {item.reasoning || "No reasoning provided."}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}
        <footer className="footer">
          <span>VERITY / FACT-CHECKING WORKSPACE</span>
          <span>Private by design · Your document is processed on request</span>
        </footer>
      </div>
    </main>
  );
}
