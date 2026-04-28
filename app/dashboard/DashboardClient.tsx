"use client";

import { useState, useMemo } from "react";
// ... all your types (SpendEntry, Bill, etc.)

type Props = {
  initialBills: Bill[];
  initialDebts: Debt[];
  initialSpend: SpendEntry[];
  initialIncome: IncomeEntry[];
  initialPayments: Payment[];
};

export default function DashboardClient({
  initialBills,
  initialDebts,
  initialSpend,
  initialIncome,
  initialPayments,
}: Props) {
  const [bills] = useState(initialBills);
  const [debts] = useState(initialDebts);
  // ... same for spend, income, payments

  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  // Remove the entire useEffect + loadData
  // Keep all your useMemo calculations (they will now work with the initial data)

  // ... rest of your component (upcoming logic, benMood, all the JSX)

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      {/* your existing JSX, but remove the loading state since data is already here */}
    </main>
  );
}
