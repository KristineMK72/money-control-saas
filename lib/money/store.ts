"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Bucket,
  DebtEntry,
  Entry,
  IncomeSource,
  PaymentEntry,
  SpendEntry,
  StorageShape,
} from "./types";
import { STORAGE_KEY } from "./storageKey";
import { clampMoney } from "./utils";

export function useMoneyStore() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [spend, setSpend] = useState<SpendEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StorageShape>;

      setBuckets(Array.isArray(parsed.buckets) ? parsed.buckets : []);
      setEntries(Array.isArray(parsed.entries) ? parsed.entries : []);
      setSpend(Array.isArray(parsed.spend) ? parsed.spend : []);
      setPayments(Array.isArray(parsed.payments) ? parsed.payments : []);
      setDebts(Array.isArray(parsed.debts) ? parsed.debts : []);
      setIncomeSources(
        Array.isArray(parsed.incomeSources) ? parsed.incomeSources : []
      );
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const payload: StorageShape = {
        buckets,
        entries,
        spend,
        payments,
        debts,
        incomeSources,
        meta: {},
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [buckets, entries, spend, payments, debts, incomeSources]);

  const totals = useMemo(() => {
    const income = entries.reduce((sum, e) => sum + e.amount, 0);
    const spending = spend.reduce((sum, s) => sum + s.amount, 0);
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    const debtTotal = debts.reduce((sum, d) => sum + d.balance, 0);
    const minDueTotal = debts.reduce((sum, d) => sum + (d.minPayment || 0), 0);

    return {
      income: clampMoney(income),
      spending: clampMoney(spending),
      payments: clampMoney(paymentTotal),
      debtBalance: clampMoney(debtTotal),
      debtMinimums: clampMoney(minDueTotal),
    };
  }, [entries, spend, payments, debts]);

  function addBucket(bucket: Bucket) {
    setBuckets((prev) => [bucket, ...prev]);
  }

  function addSpend(item: SpendEntry) {
    setSpend((prev) => [item, ...prev]);
  }

  function removeSpend(id: string) {
    setSpend((prev) => prev.filter((item) => item.id !== id));
  }

  function addPayment(item: PaymentEntry) {
    setPayments((prev) => [item, ...prev]);
  }

  function removePayment(id: string) {
    setPayments((prev) => prev.filter((item) => item.id !== id));
  }

  function addDebt(item: DebtEntry) {
    setDebts((prev) => [item, ...prev]);
  }

  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((item) => item.id !== id));
  }

  function addIncomeSource(name: string) {
    const clean = name.trim();
    if (!clean) return;

    const exists = incomeSources.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );
    if (exists) return;

    const source: IncomeSource = {
      id: crypto.randomUUID(),
      name: clean,
    };

    setIncomeSources((prev) =>
      [source, ...prev].sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  function addIncomeEntry(params: {
    dateISO: string;
    sourceName: string;
    amount: number;
    note?: string;
  }) {
    const cleanSource = params.sourceName.trim();
    const amt = clampMoney(params.amount);

    if (!cleanSource || !Number.isFinite(amt) || amt <= 0) return;

    const entry: Entry = {
      id: crypto.randomUUID(),
      dateISO: params.dateISO,
      sourceName: cleanSource,
      amount: amt,
      note: params.note?.trim() || undefined,
      allocations: {},
    };

    setEntries((prev) =>
      [entry, ...prev].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
    );

    const exists = incomeSources.some(
      (s) => s.name.toLowerCase() === cleanSource.toLowerCase()
    );
    if (!exists) addIncomeSource(cleanSource);
  }

  function removeIncomeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function resetAll() {
    setBuckets([]);
    setEntries([]);
    setSpend([]);
    setPayments([]);
    setDebts([]);
    setIncomeSources([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    buckets,
    entries,
    spend,
    payments,
    debts,
    incomeSources,
    totals,
    addBucket,
    addSpend,
    removeSpend,
    addPayment,
    removePayment,
    addDebt,
    removeDebt,
    addIncomeSource,
    addIncomeEntry,
    removeIncomeEntry,
    resetAll,
  };
}
