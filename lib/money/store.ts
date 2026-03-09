"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Bucket,
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
        incomeSources,
        meta: {},
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [buckets, entries, spend, payments, incomeSources]);

  const totals = useMemo(() => {
    const income = entries.reduce((sum, e) => sum + e.amount, 0);
    const spending = spend.reduce((sum, s) => sum + s.amount, 0);
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      income: clampMoney(income),
      spending: clampMoney(spending),
      payments: clampMoney(paymentTotal),
    };
  }, [entries, spend, payments]);

  function addBucket(bucket: Bucket) {
    setBuckets((prev) => [bucket, ...prev]);
  }

  function addSpend(item: SpendEntry) {
    setSpend((prev) => [item, ...prev]);
  }

  function addPayment(item: PaymentEntry) {
    setPayments((prev) => [item, ...prev]);
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
    if (!exists) {
      addIncomeSource(cleanSource);
    }
  }

  function removeIncomeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function resetAll() {
    setBuckets([]);
    setEntries([]);
    setSpend([]);
    setPayments([]);
    setIncomeSources([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    buckets,
    entries,
    spend,
    payments,
    incomeSources,
    totals,
    addBucket,
    addSpend,
    addPayment,
    addIncomeSource,
    addIncomeEntry,
    removeIncomeEntry,
    resetAll,
  };
}
