import { PagePlaceholder } from "@/components/page-placeholder";
import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <PagePlaceholder
      title="Gestão de Equipe"
      description="Gerencie operadores, convites e permissões de acesso."
      icon={Users}
    />
  );
}
