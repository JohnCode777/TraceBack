import type { ReactNode } from "react";
import Link from "next/link";

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.5 2.5 0 0 1 4.4 1.7c0 1.6-2.2 2-2.2 3.3M12 17h.01" />
      </>
    ),
    bug: (
      <>
        <rect x="6" y="7" width="12" height="13" rx="6" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2M3 10h3m12 0h3M3 16h3m12 0h3M12 10v10" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    spark: (
      <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" />
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.spark}
    </svg>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Button({
  children,
  href,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      className={`${variant === "primary" ? "button" : variant === "secondary" ? "button-secondary" : "button-ghost"} ${className}`}
      href={href}
    >
      {children}
    </Link>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function SeverityBadge({ value }: { value: string | null }) {
  return (
    <Badge tone={value?.toLowerCase() ?? "neutral"}>
      {value ?? "No severity"}
    </Badge>
  );
}
export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={value.toLowerCase()}>{value}</Badge>;
}
export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      aria-label={name}
      className={`avatar ${size === "sm" ? "avatar-sm" : ""}`}
    >
      {initials}
    </span>
  );
}
export function Tabs({
  items,
}: {
  items: { label: string; href: string; active?: boolean }[];
}) {
  return (
    <nav aria-label="Sections" className="tabs">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={item.active ? "tab active" : "tab"}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <Card className="empty-state">
      <span className="empty-icon">
        <Icon name="spark" />
      </span>
      <h2 className="section-title">{title}</h2>
      <p className="muted">{description}</p>
      {action && <Button href={action.href}>{action.label}</Button>}
    </Card>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="muted mt-2">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function Skeleton({ className = "h-5 w-full" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}
export function Completeness({
  score,
  level,
}: {
  score: number;
  level: string;
}) {
  return (
    <div className="completeness">
      <span
        className="score-ring"
        style={{
          background: `conic-gradient(var(--accent) ${score}%, var(--line) 0)`,
        }}
      >
        <span>{score}</span>
      </span>
      <span>
        <strong>{level}</strong>
        <small>{score}/100 complete</small>
      </span>
    </div>
  );
}
