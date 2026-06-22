import { Settings } from "lucide-react";

import { PagePlaceholder } from "@/components/page-placeholder";

export default function SettingsPage() {
  return (
    <main className="w-full">
      <PagePlaceholder
        title="Configurações"
        description="Preferências da sua conta e do workspace estarão disponíveis em breve."
        icon={Settings}
      />
    </main>
  );
}
