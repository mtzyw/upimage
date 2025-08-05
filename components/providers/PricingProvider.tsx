"use client";

import { PricingPlan } from "@/types/pricing";
import { createContext, useContext, useEffect, useState } from "react";

interface PricingContextType {
  plans: PricingPlan[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setError(null);
      const response = await fetch('/api/pricing/public');
      const result = await response.json();
      
      if (result.success) {
        setPlans(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch pricing plans');
        console.error('Failed to fetch pricing plans:', result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      console.error('Error fetching pricing plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const value: PricingContextType = {
    plans,
    isLoading,
    error,
    refetch: fetchPlans,
  };

  return (
    <PricingContext.Provider value={value}>
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider');
  }
  return context;
}