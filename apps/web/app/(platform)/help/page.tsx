import { LifeBuoy } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export default function HelpPage() {
  return (
    <PagePlaceholder
      title="Ajuda"
      description="Central de ajuda, documentação e suporte estarão disponíveis em breve."
      icon={LifeBuoy}
    />
  );
}
