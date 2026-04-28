// app/debt/DebtClient.tsx
"use client";

import { useState, useMemo } from "react";

type Debt = {
  id: string;
  user_id?: string;
  name: string;
  min_payment: number | null;
  balance: number | null;
  due_day: number | null;
  category: string | null;
};

// Add any other types your Debt page uses here (e.g. Payment, stats, etc.)

type Props = {
  initialDebts: Debt[];
  // Add other props your DebtClient needs (e.g. initialPayments, user, etc.)
  initialPayments?: any[];
  user?: any;
};

export default function DebtClient({
  initialDebts,
  initialPayments = [],
  user,
}: Props) {
  const [debts] = useState(initialDebts);
  const [payments] = useState(initialPayments);
  const [showModal, setShowModal] = useState(false); // example

  // ←←← Put all your calculations and useMemo here (smartDebts, stats, pressureScore, etc.)

  const smartDebts = useMemo(() => {
    // Your existing logic for smartDebts
    return debts.map(debt => ({
      ...debt,
      // add any computed fields you had
    }));
  }, [debts]);

  // Example placeholder stats - replace with your actual logic
  const stats = useMemo(() => ({
    pressureScore: 65,
    momentumScore: 42,
    totalBalance: debts.reduce((sum, d) => sum + (d.balance || 0), 0),
    totalMinPayment: debts.reduce((sum, d) => sum + (d.min_payment || 0), 0),
  }), [debts]);

  // Your other useMemo hooks go here...

  return (
    <div className="p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debt Game Plan</h1>
          <p className="text-neutral-400 mt-1">
            See every balance, every minimum, and exactly where an extra payment hits the hardest.
          </p>
        </div>
        {user && (
          <div className="text-sm text-zinc-400">
            Hello, {user.email?.split('@')[0]}
          </div>
        )}
      </div>

      {/* ←←← PASTE THE REST OF YOUR ORIGINAL UI / JSX HERE */}
      {/* For example: debt list, charts, payment simulator, etc. */}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Your Debts</h2>
          <p className="text-zinc-400">Total debts loaded: {debts.length}</p>
          {/* Replace this with your actual debt list rendering */}
          {debts.length === 0 ? (
            <p className="text-zinc-500 mt-4">No debts found yet.</p>
          ) : (
            <ul className="space-y-3 mt-4">
              {debts.map((debt) => (
                <li key={debt.id} className="flex justify-between border-b border-zinc-800 pb-3">
                  <span>{debt.name}</span>
                  <span className="font-medium">${debt.balance?.toFixed(0) || 0}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="space-y-2 text-sm">
            <div>Total Balance: <span className="font-medium">${stats.totalBalance.toFixed(0)}</span></div>
            <div>Monthly Minimums: <span className="font-medium">${stats.totalMinPayment.toFixed(0)}</span></div>
            <div>Pressure Score: <span className="font-medium">{stats.pressureScore}</span></div>
          </div>
        </div>
      </div>

      {/* Add your modals, buttons, etc. here */}
    </div>
  );
}
