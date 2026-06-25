import type { ReactNode } from "react"

import { ProjectsIntro } from "@/components/projects/projects-intro"
import { ResultCount } from "@/components/projects/projects-toolbar"
import { AvatarGroup } from "@/components/ui/avatar-group"
import { EntityChip } from "@/components/ui/entity-chip"
import { ProgressMeter } from "@/components/ui/progress-meter"
import { StatusBadge } from "@/components/ui/status-badge"
import { UrlChip } from "@/components/ui/url-chip"

import { ProjectsToolbarDemo } from "./_projects-toolbar-demo"

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-12 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Design System</h1>
        <p className="text-muted-foreground">
          Catálogo vivo dos primitivos apresentacionais de{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">components/ui</code>.
        </p>
      </header>

      <Section
        title="StatusBadge"
        description="Estados do ciclo de preenchimento + variante arquivada."
      >
        <StatusBadge status="filling" />
        <StatusBadge status="done" />
        <StatusBadge status="ready" />
        <StatusBadge status="pending" />
        <StatusBadge status="archived" />
      </Section>

      <Section
        title="ProgressMeter"
        description="Label e cor da barra derivadas do status; estado “Aguardando importação” quando total = 0."
      >
        <div className="grid w-full max-w-md gap-6">
          <ProgressMeter filled={0} total={0} status="pending" />
          <ProgressMeter filled={12} total={12} status="done" />
          <ProgressMeter filled={8} total={12} status="filling" />
          <ProgressMeter filled={0} total={12} status="ready" />
        </div>
      </Section>

      <Section
        title="UrlChip"
        description="Contagem de URLs alvo, pluralizada."
      >
        <UrlChip count={1} />
        <UrlChip count={3} />
      </Section>

      <Section
        title="EntityChip"
        description="Rótulo da entidade dos dados (espresso-100/700)."
      >
        <EntityChip label="Mineração" />
        <EntityChip label="Empresas" />
      </Section>

      <Section
        title="AvatarGroup"
        description="Iniciais sobrepostas dos membros do projeto."
      >
        <AvatarGroup
          members={[
            { name: "Maria Costa", color: "gold" },
            { name: "João Pereira", color: "green" },
            { name: "Ana Lima", color: "gold" },
          ]}
        />
      </Section>

      <Section
        title="ProjectsIntro"
        description="Intro da página de projetos: H2 + subcopy com contagens (via props)."
      >
        <ProjectsIntro activeCount={6} archivedCount={2} className="w-full" />
      </Section>

      <Section
        title="ProjectsToolbar"
        description="Abas de filtro (Todos / Ativos / Arquivados, com contagem mono) + label de resultado. Clique para alternar o estado ativo."
      >
        <ProjectsToolbarDemo />
      </Section>

      <Section
        title="ResultCount"
        description="Label de resultado pluralizada."
      >
        <ResultCount count={1} />
        <ResultCount count={8} />
      </Section>
    </main>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-6">
        {children}
      </div>
    </section>
  )
}
