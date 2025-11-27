import { AppHeader } from "@/components/layout/app-header";
import { PagePlaceholder } from "@/components/page-placeholder";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <main className="w-full">
      <AppHeader title="Assinatura" />
      <PagePlaceholder
        title="Assinatura"
        description="Gerencie seu plano, faturas e cota de consumo."
        icon={CreditCard}
      />
    </main>
  );
}
