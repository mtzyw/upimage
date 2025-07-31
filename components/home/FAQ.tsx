import { useTranslations } from "next-intl";

type FAQItem = {
  question: string;
  answer: string;
};

const FAQItem = ({ faq }: { faq: FAQItem }) => {
  return (
    <div className="rounded-xl p-6 shadow-sm border border-gray-600 bg-black/40">
      <div className="flex items-center mb-3">
        <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
      </div>
      <div className="text-gray-300">
        <p>{faq.answer}</p>
      </div>
    </div>
  );
};

export default function FAQ() {
  const t = useTranslations("Landing.FAQ");

  const faqs: FAQItem[] = t.raw("items");

  return (
    <section id="faq" className="py-20 bg-slate-800/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-center z-10 text-3xl md:text-5xl font-bold mb-4">
            <span className="text-white">
              {t("title")}
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} faq={faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
