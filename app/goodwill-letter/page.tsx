"use client";

import { useState } from "react";

export default function GoodwillLetterPage() {
  const [name, setName] = useState("");
  const [creditor, setCreditor] = useState("");
  const [account, setAccount] = useState("");
  const [lateDate, setLateDate] = useState("");
  const [reason, setReason] = useState("");
  const [improvement, setImprovement] = useState("");
  const [letter, setLetter] = useState("");

  function generateLetter() {
    const today = new Date().toLocaleDateString();

    const output = `
${today}

${creditor}

Re: Account ${account}

Dear ${creditor} Team,

My name is ${name}. I am writing regarding my account ${account}. I recently reviewed my credit report and noticed a late payment reported around ${lateDate}.

I want to first say that I take responsibility for the missed payment. At the time, ${reason}. This situation was temporary, and since then I have taken steps to stabilize things financially.

${improvement}

Since that time, I have worked hard to stay current on my financial obligations and maintain positive payment history.

Because of this improvement, I am respectfully asking if you would consider making a goodwill adjustment by removing the late payment from my credit report. I value my relationship with ${creditor} and greatly appreciate your consideration.

Thank you for your time and for reviewing my request.

Sincerely,

${name}
`;

    setLetter(output);
  }

  function copyLetter() {
    navigator.clipboard.writeText(letter);
  }
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-8 shadow-2xl">

          <h1 className="text-4xl font-black">
            Goodwill Letter Generator
          </h1>

          <p className="mt-3 text-zinc-300">
            AskBen helps you generate a respectful goodwill request to remove a late payment.
          </p>

          <div className="mt-8 grid gap-4">

            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <input
              placeholder="Creditor (ex: Capital One)"
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <input
              placeholder="Account name or number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <input
              placeholder="Late payment date"
              value={lateDate}
              onChange={(e) => setLateDate(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <textarea
              placeholder="What caused the late payment?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <textarea
              placeholder="What has improved since then?"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              className="rounded-xl bg-white/10 px-4 py-3"
            />

            <button
              onClick={generateLetter}
              className="rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black"
            >
              Generate Letter
            </button>

          </div>

          {letter && (
            <div className="mt-8">

              <h2 className="text-2xl font-bold">
                Your Letter
              </h2>

              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-6 text-black">
                {letter}
              </pre>

              <button
                onClick={copyLetter}
                className="mt-4 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-black"
              >
                Copy Letter
              </button>

            </div>
          )}

        </div>
      </div>
    </main>
  );
}
