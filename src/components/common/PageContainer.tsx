import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("flex flex-col gap-5 p-5 md:p-6 max-w-full", className)}>
      {children}
    </div>
  );
}
