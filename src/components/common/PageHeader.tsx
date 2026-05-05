import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.3px",
            lineHeight: 1.1,
            color: "var(--foreground)",
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            style={{
              fontSize: 12,
              color: "var(--txt3, #4D6680)",
              marginTop: 3,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
