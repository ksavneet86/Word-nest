export function Btn({
  children,
  onClick,
  variant = "solid",
  color = "#FF7A59",
  className = "",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "solid" | "soft" | "outline";
  color?: string;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center gap-2 justify-center rounded-2xl font-bold px-4 py-2.5 transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 min-h-[40px]";
  const style =
    variant === "solid"
      ? { backgroundColor: color, color: "white" }
      : variant === "soft"
      ? { backgroundColor: `${color}1a`, color }
      : { backgroundColor: "transparent", color, border: `2px solid ${color}` };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${className}`} style={style}>
      {children}
    </button>
  );
}
