'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Form } from '@/components/ui/form';
import { useMapping, useUpdateMapping } from '@/lib/query/hooks/use-mappings';
import { ApiError } from '@/lib/api/types';

import { useReorderSteps } from '@/lib/query/hooks/use-steps';

import { MappingPropertiesSection } from './_components/mapping-properties-section';
import { StepsSection } from './_components/steps-section';
import { UnsavedChangesGuard } from './_components/unsaved-changes-guard';

// Form validation schema
const mappingFormSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(100, 'Maximo 100 caracteres'),
  targetUrl: z.string().url('URL invalida').min(1, 'URL e obrigatoria'),
  isActive: z.boolean(),
  successTrigger: z.enum(['url_change', 'text_appears', 'element_disappears']).nullable(),
  successConfig: z
    .object({
      selector: z.string().optional(),
    })
    .nullable(),
});

export type MappingFormData = z.infer<typeof mappingFormSchema>;

export default function MappingEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ mappingId: string }>;
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { mappingId } = use(params);
  const { projectId } = use(searchParams);
  const router = useRouter();

  // Redirect if no projectId
  useEffect(() => {
    if (!projectId) {
      router.push('/projects');
    }
  }, [projectId, router]);

  const {
    data: mapping,
    isLoading,
    isError,
    error,
  } = useMapping(projectId ?? '', mappingId);

  const updateMapping = useUpdateMapping(projectId ?? '');
  const reorderSteps = useReorderSteps(projectId ?? '', mappingId);

  const form = useForm<MappingFormData>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: {
      name: '',
      targetUrl: '',
      isActive: true,
      successTrigger: null,
      successConfig: null,
    },
  });

  // Reset form when mapping data loads
  useEffect(() => {
    if (mapping) {
      form.reset({
        name: mapping.name,
        targetUrl: mapping.targetUrl,
        isActive: mapping.isActive,
        successTrigger: mapping.successTrigger,
        successConfig: mapping.successConfig,
      });
    }
  }, [mapping, form]);

  const handleStepsChange = (orderedStepIds: string[]) => {
    reorderSteps.mutate(orderedStepIds);
  };

  const handleSave = async (data: MappingFormData) => {
    try {
      await updateMapping.mutateAsync({
        mappingId,
        data: {
          name: data.name,
          targetUrl: data.targetUrl,
          isActive: data.isActive,
          successTrigger: data.successTrigger,
          successConfig: data.successConfig,
        },
      });
      form.reset(data);
      toast.success('Mapeamento salvo');
    } catch {
      toast.error('Erro ao salvar mapeamento');
    }
  };

  // Loading state
  if (isLoading || !projectId) {
    return (
      <main className="w-full">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center justify-between px-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-6 w-48" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-8 py-6 space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  // Error state - 404
  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-3xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Mapeamento nao encontrado
            </h2>
            <p className="text-muted-foreground">
              O mapeamento que voce procura nao existe ou foi removido.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button variant="default">Voltar para o projeto</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Error state - other errors
  if (isError) {
    return (
      <main className="w-full">
        <div className="mx-auto max-w-3xl px-8 py-16">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-muted-foreground">
              Tente novamente mais tarde.
            </p>
            <Link href={`/projects/${projectId}`}>
              <Button variant="default">Voltar para o projeto</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!mapping) {
    return null;
  }

  const { isDirty } = form.formState;
  const isSaving = updateMapping.isPending;

  return (
    <main className="w-full">
      <UnsavedChangesGuard isDirty={isDirty} />

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">{mapping.name}</h1>
          </div>
          <Button
            onClick={form.handleSubmit(handleSave)}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-8 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <MappingPropertiesSection control={form.control} />
          </form>
        </Form>

        <StepsSection
          steps={mapping.steps}
          projectId={projectId}
          mappingId={mappingId}
          onStepsChange={handleStepsChange}
          excelColumns={[]}
        />
      </div>
    </main>
  );
}
