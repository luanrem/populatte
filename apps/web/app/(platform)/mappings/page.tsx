import { AppHeader } from "@/components/layout/app-header";
import { PagePlaceholder } from "@/components/page-placeholder";
import { Map } from "lucide-react";

export default function MappingsPage() {
  return (
    <main className="w-full">
      <AppHeader title="Mapeamentos" />
      <PagePlaceholder
        title="Meus Mapeamentos"
        description="Biblioteca de sites mapeados e templates de preenchimento reutilizáveis."
        icon={Map}
      />
    </main>
  );
}
