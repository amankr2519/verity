"use client";

import { useState, useRef } from "react";

type Claim = {
  claim: string;
  category: string;
  status?: "Verified" | "Inaccurate" | "False" | "Unverifiable";
  reasoning?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "extracting" | "verifying" | "success" | "error"
  >("idle");
  const [results, setResults] = useState<Claim[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
      setStatus("idle");
      setResults([]);
    } else {
      setError("Please select a valid PDF file.");
    }
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
        throw new Error(uploadData.error || "Failed to read PDF");

      setStatus("extracting");
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.text }),
      });
      
      const extractData = await extractRes.json();
      if (!extractRes.ok)
        throw new Error(extractData.error || "Failed to extract claims");

      // --- THE FIX: Ensure we always have a valid array ---
      const claimsList = Array.isArray(extractData.claims)
        ? extractData.claims
        : [];
      if (claimsList.length === 0)
        throw new Error("No verifiable claims found in this document.");

      setStatus("verifying");
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims: claimsList }),
      });
      // ----------------------------------------------------
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok)
        throw new Error(verifyData.error || "Failed to verify claims");

      setResults(verifyData.results);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
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
    const headers = ["Claim", "Category", "Status", "Reasoning"];
    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const rows = results.map((r) => [
      escapeCsv(r.claim),
      escapeCsv(r.category),
      escapeCsv(r.status || "Unverifiable"),
      escapeCsv(r.reasoning || "No reasoning available."),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fact-check-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
            ✅ Verified
          </span>
        );
      case "False":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            ❌ False
          </span>
        );
      case "Inaccurate":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            ⚠️ Inaccurate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            ❓ Unverifiable
          </span>
        );
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
            🔍 AI Fact-Checker
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload a PDF to extract statistics, dates, and technical facts. We
            verify them against live web data in real-time.
          </p>
        </div>

        {/* Upload Zone */}
        {(status === "idle" || status === "error") && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className="cursor-pointer block">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-gray-800">
                  {file ? file.name : "Drop your PDF here or click to browse"}
                </span>
                <span className="text-sm text-gray-500 mt-1">
                  Supports PDF files up to 10MB
                </span>
              </div>
            </label>

            {/* Show Start Button when file is selected */}
            {file && (
              <button
                onClick={handleProcess}
                className="mt-6 px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                🔍 Start Fact-Checking
              </button>
            )}
          </div>
        )}

        {/* Loading States */}
        {status !== "idle" && status !== "error" && status !== "success" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center mt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-5"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {status === "uploading" && "📄 Parsing PDF structure..."}
              {status === "extracting" && "🧠 AI extracting key claims..."}
              {status === "verifying" &&
                "🌍 Cross-referencing with live web..."}
            </h3>
            <p className="text-gray-500">
              {status === "verifying"
                ? "This usually takes 10–30 seconds. Please keep this tab open."
                : "Processing your document..."}
            </p>
          </div>
        )}

        {/* Results Dashboard */}
        {status === "success" && results.length > 0 && (
          <div className="mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                📊 Fact-Check Results
              </h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={downloadCSV}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download CSV
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                  Check New PDF
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                        Claim
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">
                        AI Reasoning
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium align-top whitespace-pre-line break-words">
                          {item.claim}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize align-top">
                          {item.category.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 align-top">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 align-top whitespace-pre-line break-words max-w-md">
                          {item.reasoning || "No reasoning provided."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
