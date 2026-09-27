"use client";

import React, { useState } from "react";
import { BudgetBreakdown, Trip } from "@/lib/types";
import { Card } from "../ui/Card";
import { ChevronDown, ChevronUp, List } from "lucide-react";
import { ExpenditureModal } from "../chat/MessageRenderer";

interface BudgetCardProps {
  breakdown: BudgetBreakdown;
  onSetBudget?: (newBudget: number) => void;
  className?: string;
  trip?: Trip;
}

export function BudgetCard({ breakdown, onSetBudget, className = "", trip }: BudgetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [customBudget, setCustomBudget] = useState("");
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [showExpenditure, setShowExpenditure] = useState(false);

  const handleSaveBudget = () => {
    const val = parseInt(customBudget.replace(/[^0-9]/g, ''));
    if (!isNaN(val) && val > 0 && onSetBudget) {
      onSetBudget(val);
    }
    setIsEditingBudget(false);
  };

  // If budget is 0 or missing, render prompt state
  if (!breakdown.budget || breakdown.budget === 0) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-ink-900 mb-1">No budget set yet</div>
            <div className="text-xs text-ink-500">
              Tell Voyage your budget in chat, or enter one here.
            </div>
            {breakdown.total > 0 && (
              <div className="text-xs text-ink-500 mt-1">
                Current estimated spending: <strong className="text-ink-700">₹{breakdown.total.toLocaleString('en-IN')}</strong>
              </div>
            )}
          </div>

          {isEditingBudget ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="e.g. 25000"
                value={customBudget}
                onChange={e => setCustomBudget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                className="w-28 px-3 py-1.5 text-xs border border-sage-300 rounded-lg outline-none focus:border-sage-500 bg-cream-50 dark:bg-cream-200 text-ink-900"
                autoFocus
              />
              <button
                onClick={handleSaveBudget}
                className="px-3 py-1.5 text-xs font-semibold bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingBudget(false)}
                className="px-2 py-1.5 text-xs text-ink-500 hover:text-ink-900"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingBudget(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-cream-100 dark:bg-cream-200 text-sage-800 border border-cream-200 rounded-lg hover:bg-cream-200 dark:hover:bg-cream-200 transition-colors shrink-0"
            >
              Set Budget
            </button>
          )}
        </div>
      </Card>
    );
  }

  // SVG Ring calculation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(breakdown.total / breakdown.budget, 1);
  const strokeDashoffset = circumference - percent * circumference;

  let ringColor = "text-sage-500";
  if (breakdown.status === "over") ringColor = "text-coral-500";
  else if (breakdown.status === "near") ringColor = "text-amber-500";

  const isOver = breakdown.status === "over";

  return (
    <>
      <Card className={`p-5 ${className}`}>
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              {/* Background ring */}
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-cream-200" />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ease-out ${ringColor}`}
                />
              </svg>
              <div className="absolute font-display font-bold text-sm text-ink-900">
                {Math.round((breakdown.total / breakdown.budget) * 100)}%
              </div>
            </div>

            <div>
              <div className="text-sm text-ink-500 font-medium mb-1">Total Estimated Cost</div>
              <div className="text-2xl font-display font-bold text-ink-900">
                ₹{breakdown.total.toLocaleString('en-IN')} <span className="text-sm font-medium text-ink-500">of ₹{breakdown.budget.toLocaleString('en-IN')}</span>
              </div>
              {isOver && (
                <div className="text-xs font-bold text-coral-600 mt-0.5">
                  Over budget by ₹{(breakdown.total - breakdown.budget).toLocaleString('en-IN')}
                </div>
              )}
              {!isOver && breakdown.remaining > 0 && (
                <div className="text-xs text-sage-700 mt-0.5">
                  ₹{breakdown.remaining.toLocaleString('en-IN')} remaining
                </div>
              )}
            </div>
          </div>

          <button className="p-2 text-ink-500 hover:text-ink-900 transition-colors">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {expanded && (
          <div className="mt-6 pt-5 border-t border-cream-200 space-y-4">
            <BreakdownRow label="Transport" amount={breakdown.transport} color="bg-sky-400" />
            <BreakdownRow label="Accommodation" amount={breakdown.hotel} color="bg-indigo-400" />
            <BreakdownRow label="Food & Dining" amount={breakdown.food} color="bg-coral-400" />
            <BreakdownRow label="Activities" amount={breakdown.activities} color="bg-sage-400" />
            <BreakdownRow label="Local Travel" amount={breakdown.localTransport} color="bg-amber-400" />
            <BreakdownRow label="Other" amount={breakdown.other} color="bg-ink-300" />

            <button
              onClick={(e) => { e.stopPropagation(); setShowExpenditure(true); }}
              className="flex items-center gap-2 text-xs text-sage-700 dark:text-sage-400 font-semibold hover:text-sage-900 transition-colors mt-2 pt-2 border-t border-cream-200 w-full"
            >
              <List size={14} />
              See entire list
            </button>
          </div>
        )}
      </Card>

      {showExpenditure && (
        <ExpenditureModal
          breakdown={breakdown}
          tripName={trip?.name}
          onClose={() => setShowExpenditure(false)}
        />
      )}
    </>
  );
}

function BreakdownRow({ label, amount, color }: { label: string; amount: number; color: string }) {
  if (!amount || amount === 0) return null;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-ink-700 text-sm font-medium">{label}</span>
      </div>
      <span className="text-ink-900 font-semibold text-sm">₹{amount.toLocaleString('en-IN')}</span>
    </div>
  );
}
