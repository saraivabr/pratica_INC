"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

interface StepInfo {
  number: number
  title: string
}

interface VendaStepIndicatorProps {
  currentStep: number
  completedSteps: number[]
  steps?: StepInfo[]
}

const defaultSteps: StepInfo[] = [
  { number: 1, title: "Dados" },
  { number: 2, title: "Distribuicao" },
  { number: 3, title: "Parcelas" },
  { number: 4, title: "Revisao" },
]

export function VendaStepIndicator({
  currentStep,
  completedSteps,
  steps = defaultSteps,
}: VendaStepIndicatorProps) {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isLast = index === steps.length - 1

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200",
                    isCompleted &&
                      "bg-emerald-500 border-emerald-500 text-white",
                    isCurrent &&
                      !isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-muted border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    isCurrent && "text-primary",
                    isCompleted && "text-emerald-600",
                    !isCurrent && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>

              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-all duration-200",
                    completedSteps.includes(step.number + 1) ||
                      completedSteps.includes(step.number)
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
