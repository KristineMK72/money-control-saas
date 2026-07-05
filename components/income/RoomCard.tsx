export default function RoomCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`income-room-card ${className}`}>{children}</section>;
}
