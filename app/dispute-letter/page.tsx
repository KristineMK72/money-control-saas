"use client";

import { useState } from "react";

export default function DisputeLetterPage() {
  const [name, setName] = useState("");
  const [bureau, setBureau] = useState("Experian");
  const [creditor, setCreditor] = useState("");
  const [account, setAccount] = useState("");
  const [issueType, setIssueType] = useState("Incorrect late payment");
  const [details, setDetails] = useState("");
  const [requestedFix, setRequestedFix] = useState("");
  const [letter, setLetter] = useState("");

  function generateLetter() {
    const today = new Date().toLocaleDateString();

    const output = `${today}

${bureau}

Re: Credit Report Dispute for ${creditor} / Account ${account}

Dear ${bureau} Dispute Department,

My name is ${name}, and I am writing to formally dispute inaccurate information appearing on my credit report.

The account in question is listed as:
Creditor: ${creditor}
Account: ${account}

The issue I am disputing is:
${issueType}

Details of the dispute:
${details}

I am requesting that this item be investigated and corrected or removed if it cannot be verified as accurate.

Requested resolution:
${requestedFix}

Please conduct an investigation under the Fair Credit Reporting Act and send me the results once your review is complete.

Thank you for your time and attention to this matter.

Sincerely,

${name}`;

    setLetter(output);
  }

  async function copyLetter() {
    if (!letter) return;
    await navigator.clipboard.writeText(letter);
  }
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Credit Repair Tools
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Dispute Letter Generator
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Generate a clean dispute letter for incorrect credit report items.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/credit-health"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Credit Health
              </a>
              <a
                href="/goodwill-letter"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Goodwill Letter
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dashboard
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            />

            <select
              value={bureau}
              onChange={(e) => setBureau(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            >
              <option className="text-black">Experian</option>
              <option className="text-black">Equifax</option>
              <option className="text-black">TransUnion</option>
            </select>

            <input
              placeholder="Creditor name"
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            />

            <input
              placeholder="Account name or number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            />

            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            >
              <option className="text-black">Incorrect late payment</option>
              <option className="text-black">Wrong balance</option>
              <option className="text-black">Duplicate account</option>
              <option className="text-black">Account not mine</option>
              <option className="text-black">Incorrect account status</option>
              <option className="text-black">Other</option>
            </select>

            <textarea
              placeholder="Explain what is inaccurate"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-[120px] rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            />

            <textarea
              placeholder="What do you want corrected or removed?"
              value={requestedFix}
              onChange={(e) => setRequestedFix(e.target.value)}
              className="min-h-[100px] rounded-xl bg-white/10 px-4 py-3 text-white outline-none"
            />

            <button
              onClick={generateLetter}
              className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black hover:bg-emerald-300"
            >
              Generate Dispute Letter
            </button>
          </div>

          {letter ? (
            <div className="mt-8">
              <h2 className="text-2xl font-black text-white">Your Letter</h2>

              <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-6 text-sm leading-6 text-black">
                {letter}
              </pre>

              <button
                onClick={copyLetter}
                className="mt-4 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black hover:bg-emerald-300"
              >
                Copy Letter
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
