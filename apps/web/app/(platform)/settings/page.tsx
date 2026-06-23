import { Settings } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Preferências da sua conta e do workspace estarão disponíveis em breve."
      icon={Settings}
    />
  );
}
