export default function MiniMetric({
  icon,
  label,
  value,
  good,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="income-mini-metric">
      <div className="income-mini-icon">{icon}</div>
      <p className="income-mini-label">{label}</p>
      <p className={danger ? "income-mini-value danger" : good ? "income-mini-value good" : "income-mini-value"}>
        {value}
      </p>
    </div>
  );
}
