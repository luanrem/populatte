import { AppHeader } from "@/components/layout/app-header";
import { PagePlaceholder } from "@/components/page-placeholder";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <main className="w-full">
      <AppHeader title="Equipe" />
      <PagePlaceholder
        title="Gestão de Equipe"
        description="Gerencie operadores, convites e permissões de acesso."
        icon={Users}
      />
    </main>
  );
}
