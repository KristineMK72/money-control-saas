return {
  id: row.id,
  name: row.name,
  kind: row.kind,

  balance: row.balance ?? null,

  minPayment: row.min_payment ?? null,
  dueDate: row.due_date ?? null,
  isMonthly: row.is_monthly ?? false,
  dueDay: row.due_day ?? null,

  apr: row.apr ?? null,
  creditLimit: row.credit_limit ?? null,

  note: row.note ?? null,
};
