import { redirect } from "next/navigation";

type LegacyPublicQuotePageProps = {
  params: Promise<{ token: string }>;
};

export default async function LegacyPublicQuotePage({ params }: LegacyPublicQuotePageProps) {
  const { token } = await params;

  redirect(`/q/${token}`);
}
