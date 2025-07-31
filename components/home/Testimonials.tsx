import FeatureBadge from "@/components/shared/FeatureBadge";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Star, StarHalf } from "lucide-react";
import { useTranslations } from "next-intl";

type Testimonial = {
  content: string;
  author: {
    name: string;
    position: string;
    avatar: string;
  };
  rating: number;
};

const RatingStars = ({ rating }: { rating: number }) => {
  // Ensure rating is valid and within bounds
  const validRating = Math.max(0, Math.min(5, isNaN(rating) ? 0 : rating));
  const fullStars = Math.floor(validRating);
  const hasHalfStar = validRating % 1 >= 0.5;

  return (
    <div className="flex items-center">
      <div className="text-yellow-400 flex">
        {Array.from({ length: fullStars }, (_, i) => (
          <Star key={i} className="fill-current h-5 w-5" />
        ))}
        {hasHalfStar && <StarHalf className="fill-current h-5 w-5" />}
      </div>
      <span className="ml-2 text-gray-300">{validRating.toFixed(1)}</span>
    </div>
  );
};

export default function Testimonials() {
  const t = useTranslations("Landing.Testimonials");
  
  // Get testimonials from translation data with error handling
  const getTestimonialData = (index: number): Testimonial => {
    try {
      const ratingStr = t(`items.${index}.rating`);
      const rating = parseFloat(ratingStr);
      
      return {
        content: t(`items.${index}.content`),
        author: {
          name: t(`items.${index}.author.name`),
          position: t(`items.${index}.author.position`),
          avatar: t(`items.${index}.author.avatar`),
        },
        rating: isNaN(rating) ? 5.0 : rating,
      };
    } catch (error) {
      // Fallback testimonial if translation fails
      return {
        content: "Amazing AI image enhancement tool!",
        author: {
          name: "User",
          position: "Creator",
          avatar: "/images/users/user1.jpeg",
        },
        rating: 5.0,
      };
    }
  };

  const testimonials: Testimonial[] = [
    getTestimonialData(0),
    getTestimonialData(1),
    getTestimonialData(2),
  ];

  return (
    <section id="testimonials" className="py-20 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <FeatureBadge label={t("badge.label")} className="mb-8" />
          <h2 className="text-center z-10 text-3xl md:text-5xl font-bold mb-4">
            <span className="text-white">
              {t("title")}
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <li key={index} className="min-h-[16rem] list-none">
              <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-gray-600 p-2 md:rounded-[1.5rem] md:p-3">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] bg-black/40 p-6 shadow-sm md:p-6">
                  <div className="relative flex flex-1 flex-col justify-between gap-3">
                    <RatingStars rating={testimonial.rating} />
                    <p className="text-gray-200">{testimonial.content}</p>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center">
                        <img
                          src={testimonial.author.avatar}
                          alt={testimonial.author.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                        />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-white">
                          {testimonial.author.name},{" "}
                          <span className="text-gray-300">
                            {testimonial.author.position}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
