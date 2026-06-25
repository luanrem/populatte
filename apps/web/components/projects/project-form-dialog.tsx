"use client";

import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Plus,
  Star,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type CreateProjectRequest,
  type ProjectSummaryResponse,
} from "@/lib/api/schemas/project.schema";

// Multi-URL editor (POP-61): the form mirrors the `urls[]` API contract —
// at least one valid URL with exactly one marked as primary.
const urlEntrySchema = z.object({
  url: z.string().trim().url("URL inválida"),
  isPrimary: z.boolean(),
  label: z.string().optional(),
});

const projectFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  description: z.string().max(500).optional(),
  targetEntity: z.string().max(100).optional(),
  urls: z
    .array(urlEntrySchema)
    .min(1, "Adicione ao menos uma URL")
    .refine(
      (entries) => entries.filter((entry) => entry.isPrimary).length === 1,
      "Marque exatamente uma URL principal",
    ),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;
type UrlEntry = ProjectFormValues["urls"][number];

const EMPTY_URLS: UrlEntry[] = [{ url: "", isPrimary: true }];

function urlsFromProject(project: ProjectSummaryResponse): UrlEntry[] {
  if (project.urls.length === 0) {
    return [{ url: "", isPrimary: true }];
  }
  const hasPrimary = project.urls.some((entry) => entry.isPrimary);
  return project.urls.map((entry, index) => ({
    url: entry.url,
    isPrimary: hasPrimary ? entry.isPrimary : index === 0,
    ...(entry.label !== undefined ? { label: entry.label } : {}),
  }));
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateProjectRequest) => void;
  project?: ProjectSummaryResponse | null;
  isPending?: boolean;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  onSubmit,
  project,
  isPending,
}: ProjectFormDialogProps) {
  const isEditing = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetEntity: "",
      urls: EMPTY_URLS,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "urls",
  });

  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          description: project.description ?? "",
          targetEntity: project.targetEntity ?? "",
          urls: urlsFromProject(project),
        });
      } else {
        form.reset({
          name: "",
          description: "",
          targetEntity: "",
          urls: EMPTY_URLS,
        });
      }
    }
  }, [open, project, form]);

  const urls = useWatch({ control: form.control, name: "urls" });
  const urlCount = urls?.length ?? 0;
  const urlsError =
    form.formState.errors.urls?.root?.message ??
    form.formState.errors.urls?.message;

  function setPrimary(index: number) {
    const current = form.getValues("urls");
    current.forEach((_, i) => {
      form.setValue(`urls.${i}.isPrimary`, i === index, {
        shouldValidate: true,
        shouldDirty: true,
      });
    });
  }

  function handleRemove(index: number) {
    const wasPrimary = form.getValues(`urls.${index}.isPrimary`);
    remove(index);
    if (wasPrimary) {
      const remaining = form.getValues("urls");
      if (remaining.length > 0) {
        form.setValue("urls.0.isPrimary", true, { shouldValidate: true });
      }
    }
  }

  function handleSubmit(values: ProjectFormValues) {
    onSubmit({
      name: values.name,
      description: values.description,
      targetEntity: values.targetEntity,
      urls: values.urls.map((entry) => ({
        url: entry.url,
        isPrimary: entry.isPrimary,
        ...(entry.label ? { label: entry.label } : {}),
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar projeto" : "Novo projeto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do projeto."
              : "Preencha as informações para criar um novo projeto."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nome <span className="text-terra-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Cadastro de empresas - Receita Federal"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva brevemente o objetivo deste projeto"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="targetEntity"
              render={({ field }) => (
                <FormItem className="sm:w-3/5">
                  <div className="flex items-center gap-1.5">
                    <FormLabel>Entidade alvo</FormLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Tipo de entidade que você trabalha, ex: Empresas,
                        Pessoas, Imóveis
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <FormControl>
                    <Input placeholder="Ex: Empresas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <FormLabel className="text-sm font-medium">
                    URLs do formulário
                  </FormLabel>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="size-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Endereços dos formulários web que deseja preencher
                      automaticamente
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="rounded-full bg-mocha-100 px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground">
                  {urlCount} página{urlCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {fields.map((field, index) => {
                  const isPrimary = urls?.[index]?.isPrimary ?? false;
                  return (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`urls.${index}.url`}
                      render={({ field: urlField }) => (
                        <FormItem className="space-y-1">
                          <div className="flex items-center gap-2 rounded-lg border border-border bg-card py-1.5 pr-2 pl-3">
                            <LinkIcon className="size-[15px] shrink-0 text-mocha-500" />
                            <FormControl>
                              <Input
                                placeholder="gov.br/exemplo/novo"
                                className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-[13px] text-espresso-700 shadow-none focus-visible:ring-0"
                                {...urlField}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setPrimary(index)}
                              aria-pressed={isPrimary}
                              aria-label={
                                isPrimary
                                  ? "URL principal"
                                  : "Marcar como principal"
                              }
                              title={
                                isPrimary
                                  ? "URL principal"
                                  : "Marcar como principal"
                              }
                              className={cn(
                                "flex shrink-0 items-center gap-1 rounded-md text-[9px] font-semibold tracking-wider uppercase transition-colors",
                                isPrimary
                                  ? "border border-gold-400 bg-gold-200 px-1.5 py-1 text-espresso-800"
                                  : "size-7 justify-center text-mocha-400 hover:bg-latte-50 hover:text-gold-500",
                              )}
                            >
                              <Star
                                className="size-[11px]"
                                fill={isPrimary ? "currentColor" : "none"}
                              />
                              {isPrimary ? "principal" : null}
                            </button>
                            {fields.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                aria-label="Remover URL"
                                title="Remover"
                                className="grid size-7 shrink-0 place-items-center rounded-md text-mocha-400 transition-colors hover:bg-terra-50 hover:text-terra-500"
                              >
                                <X className="size-[15px]" />
                              </button>
                            ) : null}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>

              {urlsError ? (
                <p className="text-sm text-destructive">{urlsError}</p>
              ) : null}

              <button
                type="button"
                onClick={() => append({ url: "", isPrimary: false })}
                className="flex h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-mocha-300 text-[13px] font-semibold text-espresso-700 transition-colors hover:border-gold-500 hover:bg-latte-50"
              >
                <Plus className="size-4" />
                Adicionar URL
              </button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gold text-gold-foreground hover:bg-gold-600"
              >
                {isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isEditing ? "Salvar" : "Criar projeto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
