// app/debt/DebtClient.tsx
"use client";

import { useState, useMemo } from "react";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend 
} from "recharts";

type Debt = {
  id: string;
  name: string;
  min_payment: number | null;
  balance: number | null;
  due_day: number | null;
  category: string | null;
  interest_rate?: number | null;
};

type Props = {
  initialDebts: Debt[];
  initialPayments?: any[];
  user?: any;
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

export default function DebtClient({
  initialDebts,
  initialPayments = [],
  user,
}: Props) {
  const [debts] = useState(initialDebts);

  // === CORE CALCULATIONS ===
  const totalBalance = useMemo(() => 
    debts.reduce((sum, d) => sum + (d.balance || 0), 0), [debts]
  );

  const totalMinPayment = useMemo(() => 
    debts.reduce((sum, d) => sum + (d.min_payment || 0), 0), [debts]
  );

  const debtFreeMonths = useMemo(() => 
    totalMinPayment > 0 ? Math.ceil(totalBalance / totalMinPayment) : 999, 
    [totalBalance, totalMinPayment]
  );

  const pressureScore = useMemo(() => {
    if (totalBalance === 0) return 0;
    const burdenRatio = (totalMinPayment / (totalBalance * 0.01)); 
    return Math.min(100, Math.max(15, Math.round(burdenRatio * 6 + 20)));
  }, [totalBalance, totalMinPayment]);

  // Pie Chart Data - Debt Composition by Balance
  const pieData = useMemo(() => 
    debts
      .filter(d => (d.balance || 0) > 0)
      .map((debt, index) => ({
        name: debt.name,
        value: debt.balance || 0,
        fill: COLORS[index % COLORS.length],
      })),
    [debts]
  );

  // Bar Chart Data - Minimum Payments
  const barData = useMemo(() => 
    debts.map(debt => ({
      name: debt.name.length > 14 
        ? debt.name.substring(0, 14) + "..." 
        : debt.name,
      balance: debt.balance || 0,
      minPayment: debt.min_payment || 0,
      interestRate: debt.interest_rate || 0,
    })),
    [debts]
  );

  // Prioritized Debts (Avalanche Strategy: Highest interest rate first)
  const prioritizedDebts = useMemo(() => {
    return [...debts].sort((a, b) => {
      const rateA = a.interest_rate || 0;
      const rateB = b.interest_rate || 0;
      if (rateA !== rateB) return rateB - rateA;
      return (b.balance || 0) - (a.balance || 0);
    });
  }, [debts]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Debt Game Plan</h1>
          <p className="text-neutral-400 mt-2 text-lg">
            See every dollar. Know exactly what to pay first.
          </p>
        </div>

        {user && (
          <div className="text-sm text-zinc-400 self-end">
            Hello, {user.email?.split('@')[0]}
          </div>
        )}

        <button
          onClick={() => alert("Add Debt modal coming soon!")}
          className="px-6 py-3 bg-white text-zinc-900 font-semibold rounded-2xl hover:bg-zinc-100 transition flex items-center gap-2"
        >
          + Add New Debt
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-500">Total Debt</p>
          <p className="text-4xl font-bold mt-3">${totalBalance.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-500">Monthly Minimums</p>
          <p className="text-4xl font-bold mt-3 text-orange-400">
            ${totalMinPayment.toLocaleString()}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-500">Debt Pressure Score</p>
          <p className="text-4xl font-bold mt-3">{pressureScore}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {pressureScore > 75 ? "High — Act fast" : 
             pressureScore > 50 ? "Moderate" : "Under control"}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <p className="text-sm text-zinc-500">Est. Months to Debt-Free</p>
          <p className="text-4xl font-bold mt-3 text-emerald-400">
            {debtFreeMonths < 999 ? debtFreeMonths : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">at current minimum payments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Debt Breakdown - Pie Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6">Debt Breakdown</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={135}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[340px] flex items-center justify-center text-zinc-500">
              Add some debts to see the breakdown
            </div>
          )}
        </div>

        {/* Monthly Minimums - Bar Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <h2 className="text-2xl font-semibold mb-6">Monthly Minimum Payments</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString()}`, 
                    name === "minPayment" ? "Min Payment" : "Balance"
                  ]} 
                />
                <Bar dataKey="minPayment" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[340px] flex items-center justify-center text-zinc-500">
              No debts added yet
            </div>
          )}
        </div>
      </div>

      {/* Recommended Payoff Order */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Recommended Payoff Order</h2>
          <p className="text-sm text-zinc-500">Avalanche Method (Highest Interest First)</p>
        </div>

        {prioritizedDebts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            No debts found. Add your debts to get a personalized payoff strategy.
          </div>
        ) : (
          <div className="space-y-4">
            {prioritizedDebts.map((debt, idx) => {
              const balance = debt.balance || 0;
              const minPayment = debt.min_payment || 0;
              
              return (
                <div 
                  key={debt.id}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-6"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-9 h-9 rounded-2xl bg-zinc-800 flex items-center justify-center font-bold text-lg shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-xl">{debt.name}</p>
                      {debt.interest_rate && (
                        <p className="text-sm text-emerald-400">
                          {debt.interest_rate}% APR
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-1 text-sm">
                    <div>
                      <span className="text-zinc-500 block">Balance</span>
                      <span className="font-medium text-lg">${balance.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Min Payment</span>
                      <span className="font-medium text-orange-400 text-lg">
                        ${minPayment.toLocaleString()}
                      </span>
                    </div>
                    {debt.due_day && (
                      <div>
                        <span className="text-zinc-500 block">Due Day</span>
                        <span className="font-medium">Day {debt.due_day}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
