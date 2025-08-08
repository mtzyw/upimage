import MDXComponents from "@/components/mdx/MDXComponents";
import { BG1 } from "@/components/shared/BGs";
import { Locale, LOCALES } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import fs from "fs/promises";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import path from "path";
import remarkGfm from "remark-gfm";

const options = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
};

async function getMDXContent(locale: string) {
  const filePath = path.join(
    process.cwd(),
    "content",
    "privacy-policy",
    `${locale}.mdx`
  );
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    console.error(`Error reading MDX file: ${error}`);
    return "";
  }
}

type Params = Promise<{
  locale: string;
}>;

type MetadataProps = {
  params: Params;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPolicy" });

  return constructMetadata({
    page: "PrivacyPolicy",
    title: t("title"),
    description: t("description"),
    locale: locale as Locale,
    path: `/privacy-policy`,
  });
}

export default async function AboutPage({ params }: { params: Params }) {
  const { locale } = await params;
  const content = await getMDXContent(locale);

  return (
    <div className="min-h-screen relative">
      <BG1 />
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-12">
        <article className="prose prose-invert lg:prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white prose-p:text-gray-200 prose-li:text-gray-200 prose-a:text-cyan-400 prose-strong:text-white prose-code:text-cyan-300 prose-blockquote:text-gray-300 prose-blockquote:border-cyan-500 max-w-none">
          <MDXRemote
            source={content}
            components={MDXComponents}
            options={options}
          />
        </article>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({
    locale,
  }));
}
