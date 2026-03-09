export type BucketKey = string;

export type BucketKind = "bill" | "credit" | "loan";

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type BucketCategory =
  | "housing"
  | "utilities"
  | "transportation"
  | "debt"
  | "food"
  | "other";

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

  category?: BucketCategory;
};

export type IncomeSource = {
  id: string;
  name: string;
};

export type Entry = {
  id: string;
  dateISO: string;
  sourceName: string;
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

export type DebtEntry = {
  id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  minPayment?: number;
  dueDate?: string;
  apr?: number;
  creditLimit?: number;
  note?: string;
};

export type StorageShape = {
  buckets: Bucket[];
  entries: Entry[];
  spend: SpendEntry[];
  payments: PaymentEntry[];
  debts: DebtEntry[];
  incomeSources: IncomeSource[];
  meta?: {
    lastMonthlyApplied?: string;
  };
};
