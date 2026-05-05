"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Entreprise", path: "/company" },
  { label: "Station", path: "/station" },
  { label: "Cuves", path: "/cuves" },
  { label: "Pistolets", path: "/pistolets" },
  { label: "Boutique", path: "/boutique" },
  { label: "Validation", path: "/validation" },
];

export function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentStepIndex = steps.findIndex((s) => pathname.startsWith(s.path));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 py-4 px-6">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SF</span>
          </div>
          <span className="text-white font-bold text-lg">SuccessFuel</span>
        </div>
      </div>

      {/* Stepper */}
      <div className="py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.path} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                        isCompleted
                          ? "bg-amber-500 border-amber-500 text-white"
                          : isCurrent
                          ? "border-amber-500 text-amber-400 bg-transparent"
                          : "border-slate-600 text-slate-500 bg-transparent"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 hidden sm:block",
                        isCurrent ? "text-amber-400" : isCompleted ? "text-slate-300" : "text-slate-500"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-8 sm:w-16 mx-1",
                        index < currentStepIndex ? "bg-amber-500" : "bg-slate-700"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        {children}
      </div>
    </div>
  );
}
