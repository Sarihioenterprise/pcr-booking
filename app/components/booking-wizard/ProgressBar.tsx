"use client";

import { STEP_LABELS } from "./types";
import { Check } from "lucide-react";

interface ProgressBarProps {
  currentStep: number; // 1-indexed
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="w-full mb-8">
      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}:{" "}
          <span className="text-[#2EBD6B]">{STEP_LABELS[currentStep - 1]}</span>
        </p>
        <p className="text-xs text-gray-400">
          {Math.round((currentStep / totalSteps) * 100)}% complete
        </p>
      </div>

      {/* Progress track */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-[#2EBD6B] h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, idx) => {
          const step = idx + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isUpcoming = step > currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "w-6 h-6 bg-[#2EBD6B] text-white"
                    : isCurrent
                      ? "w-7 h-7 bg-[#2EBD6B] text-white ring-4 ring-[#2EBD6B]/20"
                      : "w-5 h-5 bg-gray-200 text-gray-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className={`font-semibold ${isCurrent ? "text-xs" : "text-[10px]"}`}>
                    {step}
                  </span>
                )}
              </div>
              <span
                className={`hidden sm:block text-[9px] font-medium leading-tight text-center max-w-[44px] ${
                  isCurrent
                    ? "text-[#2EBD6B]"
                    : isCompleted
                      ? "text-gray-500"
                      : "text-gray-300"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
