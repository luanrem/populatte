import { AppHeader } from "@/components/layout/app-header";
import { PagePlaceholder } from "@/components/page-placeholder";
import { GraduationCap } from "lucide-react";

export default function OnboardingPage() {
  return (
    <main className="w-full">
      <AppHeader title="Tutorial" />
      <PagePlaceholder
        title="Aprenda a Usar"
        description="Tutoriais e link para instalação da extensão."
        icon={GraduationCap}
      />
    </main>
  );
}
