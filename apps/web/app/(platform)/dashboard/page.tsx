import { PagePlaceholder } from "@/components/page-placeholder";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Visão Geral"
      description="Painel de controle com métricas de projetos, economia de tempo e atalhos rápidos."
      icon={LayoutDashboard}
    />
  );
}
