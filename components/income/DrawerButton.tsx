export default function DrawerButton({
  children,
  active,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "income-drawer-button",
        active ? "active" : "",
        danger ? "danger" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
