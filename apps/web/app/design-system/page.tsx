"use client"

import type { ReactNode } from "react"

import { ProjectsIntro } from "@/components/projects/projects-intro"
import { ResultCount } from "@/components/projects/projects-toolbar"
import { AvatarGroup } from "@/components/ui/avatar-group"
import { EntityChip } from "@/components/ui/entity-chip"
import { ProgressMeter } from "@/components/ui/progress-meter"
import { StatusBadge } from "@/components/ui/status-badge"
import { UrlChip } from "@/components/ui/url-chip"
import { BatchCard } from "@/components/projects/batch-card"
import { MappingCard } from "@/components/projects/mapping-card"
import { NewImportTile } from "@/components/projects/new-import-tile"
import { NewProjectTile } from "@/components/projects/new-project-tile"
import { ProjectCard } from "@/components/projects/project-card"
import { ProjectEmptyState } from "@/components/projects/project-empty-state"
import type { BatchResponse } from "@/lib/api/schemas/batch.schema"
import type { MappingListItem } from "@/lib/api/schemas/mapping.schema"
import type { ProjectSummaryResponse } from "@/lib/api/schemas/project.schema"

const noop = () => {}

const sampleMapping: MappingListItem = {
  id: "m1",
  name: "Cadastro RAL — ANM (template oficial)",
  targetUrl: "https://sistemas.anm.gov.br/ral/cadastro",
  isActive: true,
  stepCount: 12,
  createdAt: "2026-06-25T21:00:00.000Z",
  updatedAt: "2026-06-30T18:00:00.000Z",
}

const sampleMappingInactive: MappingListItem = {
  id: "m2",
  name: "eSocial Admissão (rascunho)",
  targetUrl: "https://www.esocial.gov.br/admissao",
  isActive: false,
  stepCount: 3,
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-28T14:00:00.000Z",
}

const sampleBatch: BatchResponse = {
  id: "b1",
  projectId: "p1",
  userId: "u1",
  mode: "LIST_MODE",
  name: "cadastro_ral_anm_2026.xlsx",
  status: "COMPLETED",
  fileCount: 1,
  rowCount: 245,
  columnMetadata: [],
  totalRows: 245,
  identifierFieldKey: null,
  secondaryFieldKey: null,
  createdAt: "2026-06-28T10:00:00.000Z",
  updatedAt: "2026-06-28T10:05:00.000Z",
  deletedAt: null,
  deletedBy: null,
}

const sampleProjects: ProjectSummaryResponse[] = [
  {
    id: "p1",
    name: "Cadastro RAL — ANM",
    description:
      "Relatório anual de lavra — preenchimento do portal da ANM com os dados das clientes.",
    targetEntity: "Mineração",
    urls: [
      { url: "https://sistemas.anm.gov.br", isPrimary: true },
      { url: "https://www.gov.br/anm", isPrimary: false },
    ],
    status: "active",
  },
  {
    id: "p2",
    name: "Admissões RH — Maio (eSocial, lote completo do mês)",
    description: "Cadastro de admissões e vínculos no eSocial.",
    targetEntity: "Pessoas",
    urls: [],
    status: "active",
  },
  {
    id: "p3",
    name: "Declaração ITR 2024",
    description: "Imposto territorial rural — ciclo encerrado e arquivado.",
    targetEntity: "Imóveis",
    urls: [{ url: "https://www.gov.br/receitafederal", isPrimary: true }],
    status: "archived",
  },
]

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

      <Section
        title="ProjectCard"
        description="Composição: top (nome truncado + pill arquivado + kebab), badges, progresso (placeholder) e footer. O título trunca em larguras estreitas (POP-13)."
      >
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sampleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={noop}
              onDelete={noop}
              onToggleArchive={noop}
            />
          ))}
          <NewProjectTile onClick={noop} />
        </div>
      </Section>

      <Section
        title="ProjectEmptyState"
        description="Três variantes contextuais: sem projetos, sem resultado de busca e sem arquivados."
      >
        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
          <ProjectEmptyState variant="no-projects" onCreateClick={noop} />
          <ProjectEmptyState
            variant="no-results"
            query="receita"
            onClearSearch={noop}
          />
          <ProjectEmptyState variant="no-archived" onViewActive={noop} />
        </div>
      </Section>

      <Section
        title="MappingCard"
        description="Card de mapeamento da zona Mapeamentos (POP-67). Badge dinâmico: ativo → 'pronto p/ usar' (success); inativo → 'inativo' (secondary)."
      >
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <MappingCard
            mapping={sampleMapping}
            onEdit={noop}
            onDelete={noop}
          />
          <MappingCard
            mapping={sampleMappingInactive}
            onEdit={noop}
            onDelete={noop}
          />
        </div>
      </Section>

      <Section
        title="BatchCard"
        description="Card de importação da zona Importações (POP-67). Chips: modo, registros e chip estático 'Significado: pendente' (gold)."
      >
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <BatchCard
            batch={sampleBatch}
            projectId="p1"
            onSettingsClick={noop}
            onDeleteClick={noop}
          />
        </div>
      </Section>

      <Section
        title="NewImportTile"
        description="Tile dashed 'Nova importação' exibido no grid de importações (POP-67)."
      >
        <div className="w-full max-w-xs">
          <NewImportTile onClick={noop} />
        </div>
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
