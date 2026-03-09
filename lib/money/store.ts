"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bucket, Entry, PaymentEntry, SpendEntry, StorageShape } from "./types";
import { STORAGE_KEY } from "./storageKey";
import { clampMoney } from "./utils";

export function useMoneyStore() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [spend, setSpend] = useState<SpendEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StorageShape>;

      setBuckets(Array.isArray(parsed.buckets) ? parsed.buckets : []);
      setEntries(Array.isArray(parsed.entries) ? parsed.entries : []);
      setSpend(Array.isArray(parsed.spend) ? parsed.spend : []);
      setPayments(Array.isArray(parsed.payments) ? parsed.payments : []);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const payload: StorageShape = {
        buckets,
        entries,
        spend,
        payments,
        meta: {},
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [buckets, entries, spend, payments]);

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

  function resetAll() {
    setBuckets([]);
    setEntries([]);
    setSpend([]);
    setPayments([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    buckets,
    entries,
    spend,
    payments,
    totals,
    addBucket,
    addSpend,
    addPayment,
    resetAll,
  };
}
