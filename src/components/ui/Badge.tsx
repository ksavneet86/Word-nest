export function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {children}
    </span>
  );
}
