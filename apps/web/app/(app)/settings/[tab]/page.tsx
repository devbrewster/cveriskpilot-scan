import { redirect } from 'next/navigation';

interface SettingsTabRedirectProps {
  params: Promise<{ tab: string }>;
}

export default async function SettingsTabRedirect({ params }: SettingsTabRedirectProps) {
  const { tab } = await params;
  redirect(`/settings?tab=${encodeURIComponent(tab)}`);
}
