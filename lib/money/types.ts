export type BucketKey = string;

export type BucketKind = "bill" | "credit" | "loan";

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type Bucket = {
  key: BucketKey;
  name: string;
  kind: BucketKind;

  target: number;
  saved: number;

  dueDate?: string;
  due?: string;
  priority?: PriorityLevel;

  focus?: boolean;

  balance?: number;
  apr?: number;
  minPayment?: number;
  creditLimit?: number;

  isMonthly?: boolean;
  monthlyTarget?: number;
  dueDay?: number;

  category?:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other";
};

export type EntrySource = "Paycheck" | "Gig" | "Cash" | "Other";

export type Entry = {
  id: string;
  dateISO: string;
  source: EntrySource;
  amount: number;
  note?: string;
  allocations: Partial<Record<BucketKey, number>>;
};

export type SpendCategory =
  | "groceries"
  | "gas"
  | "eating_out"
  | "kids"
  | "business"
  | "self_care"
  | "subscriptions"
  | "misc";

export type SpendEntry = {
  id: string;
  dateISO: string;
  amount: number;
  category: SpendCategory;
  merchant?: string;
  note?: string;
};

export type PaymentEntry = {
  id: string;
  dateISO: string;
  amount: number;
  merchant?: string;
  note?: string;
};

export type StorageShape = {
  buckets: Bucket[];
  entries: Entry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
  meta?: {
    lastMonthlyApplied?: string;
  };
};
