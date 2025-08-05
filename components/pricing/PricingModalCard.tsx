import PricingCTA from "@/components/home/PricingCTA";
import { cn } from "@/lib/utils";
import { PricingPlan, PricingPlanTranslation } from "@/types/pricing";
import { Check } from "lucide-react";

const defaultBorderStyle = "border-gray-600 bg-black/40";
const highlightedBorderStyle =
  "border-pink-400 bg-black/60 hover:border-pink-300";
const highlightedBgStyle = "bg-pink-500";

interface PricingModalCardProps {
  plan: PricingPlan;
  localizedPlan: PricingPlanTranslation;
}

export function PricingModalCard({
  plan,
  localizedPlan,
}: PricingModalCardProps) {
  const cardTitle =
    localizedPlan?.card_title || plan.card_title || "Unnamed Plan";
  const cardDescription =
    localizedPlan?.card_description || plan.card_description || "";
  const displayPrice = localizedPlan?.display_price || plan.display_price || "";
  const originalPrice = localizedPlan?.original_price || plan.original_price;
  const priceSuffix =
    localizedPlan?.price_suffix?.replace(/^\/+/, "") ||
    plan.price_suffix?.replace(/^\/+/, "");
  const features = localizedPlan?.features || plan.features || [];
  const highlightText = localizedPlan?.highlight_text;

  return (
    <div
      className={`card rounded-xl p-6 shadow-sm border-t-4 ${
        plan.is_highlighted ? highlightedBorderStyle : defaultBorderStyle
      } ${
        plan.is_highlighted ? "shadow-lg relative z-10" : ""
      }`}
    >
      {plan.is_highlighted && highlightText && (
        <div
          className={cn(
            "absolute top-[-1px] right-0 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg font-medium",
            highlightedBgStyle
          )}
        >
          {highlightText}
        </div>
      )}
      
      <h3 className="text-xl font-semibold mb-2 text-white">{cardTitle}</h3>
      {cardDescription && (
        <p className="text-gray-300 mb-4 text-sm h-[2.5rem]">{cardDescription}</p>
      )}

      <div className="text-3xl mb-4 text-white">
        {originalPrice ? (
          <span className="text-sm line-through decoration-2 text-gray-400 mr-1">
            {originalPrice}
          </span>
        ) : null}

        {displayPrice}

        {priceSuffix ? (
          <span className="text-sm text-gray-300">/{priceSuffix}</span>
        ) : null}
      </div>

      <PricingCTA plan={plan} localizedPlan={localizedPlan} />

      <ul className="space-y-2 mt-4">
        {features?.slice(0, 2).map(
          (
            feature: { description: string; included: boolean; bold?: boolean },
            index: number
          ) => (
            <li key={index} className="flex items-start">
              {feature.included && (
                <Check className="text-cyan-400 h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              )}
              <span
                className={cn(
                  feature.included ? "text-gray-200" : "text-gray-400 opacity-50",
                  feature.bold ? "font-semibold" : "",
                  "text-sm"
                )}
              >
                {feature.description}
              </span>
            </li>
          )
        )}
      </ul>
    </div>
  );
}