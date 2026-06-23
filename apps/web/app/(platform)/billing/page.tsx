import { PagePlaceholder } from "@/components/page-placeholder";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <PagePlaceholder
      title="Assinatura"
      description="Gerencie seu plano, faturas e cota de consumo."
      icon={CreditCard}
    />
  );
}
