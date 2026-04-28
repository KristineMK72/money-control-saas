// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useMemo } from "react";

// ... keep all your existing types (Bill, Debt, etc.)

type Props = {
  profile: {
    display_name: string | null;
    onboarding_complete: boolean;
    is_premium: boolean;
  };
  initialBills: Bill[];
  initialDebts: Debt[];
  initialSpend: SpendEntry[];
  initialIncome: IncomeEntry[];
  initialPayments: Payment[];
  user: any; // or define a proper User type
};

export default function DashboardClient({
  profile,
  initialBills,
  initialDebts,
  initialSpend,
  initialIncome,
  initialPayments,
  user,
}: Props) {
  const [bills] = useState(initialBills);
  const [debts] = useState(initialDebts);
  const [spend] = useState(initialSpend);
  const [income] = useState(initialIncome);
  const [payments] = useState(initialPayments);

  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  // You can now use profile.display_name in the UI
  const displayName = profile.display_name || user?.email?.split("@")[0] || "User";

  // ... keep all your helper functions (getNextDueDate, getMonthlyBillAmount, etc.)

  // ... keep all your useMemo calculations (totalMonthlyBills, netCashflow, upcoming, etc.)

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header - now shows real name */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-zinc-400">
              Ben’s overview of your month, pressure, and what’s coming next.
            </p>
          </div>
          {/* ... rest of header */}
        </header>

        {/* Rest of your existing JSX stays the same */}
        {/* Just remove the old loading logic and useEffect entirely */}
        
        {/* You can also show premium badge if you want */}
        {profile.is_premium && (
          <div className="inline-flex items-center gap-1 text-amber-400 text-xs">
            ⭐ Premium
          </div>
        )}

        {/* ... all the cards, Ben’s take, upcoming, etc. */}
      </div>

      {/* Upcoming modal remains the same */}
      {showUpcomingModal && ( ... )}
    </main>
  );
}
