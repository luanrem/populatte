import { AppHeader } from "@/components/layout/app-header";
import { PagePlaceholder } from "@/components/page-placeholder";
import { FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <main className="w-full">
      <AppHeader title="Projetos" />
      <PagePlaceholder
        title="Meus Projetos"
        description="Gerenciamento dos lotes de trabalho. Crie novos projetos e importe planilhas aqui."
        icon={FolderKanban}
      />
    </main>
  );
}
