'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Step } from '@/lib/api/schemas/step.schema';
import { useCreateStep, useUpdateStep } from '@/lib/query/hooks';

import { SourceColumnCombobox } from './source-column-combobox';

// Form schema
const stepFormSchema = z.object({
  action: z.enum(['fill', 'click', 'wait', 'verify']),
  selector: z.object({
    type: z.enum(['css', 'xpath']),
    value: z.string().min(1, 'Seletor obrigatorio'),
  }),
  selectorFallbacks: z.array(
    z.object({
      type: z.enum(['css', 'xpath']),
      value: z.string().min(1, 'Seletor obrigatorio'),
    }),
  ),
  useFixedValue: z.boolean(), // UI-only field for toggle
  sourceFieldKey: z.string().nullable().optional(),
  fixedValue: z.string().nullable().optional(),
  optional: z.boolean(),
  clearBefore: z.boolean(),
  pressEnter: z.boolean(),
  waitMs: z.number().nullable().optional(),
});

type StepFormData = z.infer<typeof stepFormSchema>;

interface StepEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: Step | null; // null for create mode
  projectId: string;
  mappingId: string;
  excelColumns: string[];
}

export function StepEditorModal({
  open,
  onOpenChange,
  step,
  projectId,
  mappingId,
  excelColumns,
}: StepEditorModalProps) {
  const isEditing = step !== null;
  const createStep = useCreateStep(projectId, mappingId);
  const updateStep = useUpdateStep(projectId, mappingId);

  const form = useForm<StepFormData>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      action: 'fill',
      selector: { type: 'css', value: '' },
      selectorFallbacks: [],
      useFixedValue: false,
      sourceFieldKey: null,
      fixedValue: null,
      optional: false,
      clearBefore: false,
      pressEnter: false,
      waitMs: null,
    },
  });

  // Reset form when step changes or modal opens
  useEffect(() => {
    if (open) {
      if (step) {
        form.reset({
          action: step.action,
          selector: step.selector,
          selectorFallbacks: step.selectorFallbacks,
          useFixedValue: !!step.fixedValue,
          sourceFieldKey: step.sourceFieldKey,
          fixedValue: step.fixedValue,
          optional: step.optional,
          clearBefore: step.clearBefore,
          pressEnter: step.pressEnter,
          waitMs: step.waitMs,
        });
      } else {
        form.reset({
          action: 'fill',
          selector: { type: 'css', value: '' },
          selectorFallbacks: [],
          useFixedValue: false,
          sourceFieldKey: null,
          fixedValue: null,
          optional: false,
          clearBefore: false,
          pressEnter: false,
          waitMs: null,
        });
      }
    }
  }, [open, step, form]);

  const actionValue = form.watch('action');
  const useFixedValue = form.watch('useFixedValue');
  const selectorFallbacks = form.watch('selectorFallbacks');

  // Handler to add fallback selector (max 5)
  function addFallback() {
    if (selectorFallbacks.length < 5) {
      form.setValue('selectorFallbacks', [
        ...selectorFallbacks,
        { type: 'css', value: '' },
      ]);
    }
  }

  // Handler to remove fallback selector
  function removeFallback(index: number) {
    form.setValue(
      'selectorFallbacks',
      selectorFallbacks.filter((_, i) => i !== index),
    );
  }

  async function onSubmit(data: StepFormData) {
    // Clean up data based on action type and toggle
    const payload = {
      action: data.action,
      selector: data.selector,
      selectorFallbacks: data.selectorFallbacks,
      sourceFieldKey: data.useFixedValue
        ? null
        : (data.sourceFieldKey ?? null),
      fixedValue: data.useFixedValue ? (data.fixedValue ?? null) : null,
      optional: data.optional,
      clearBefore: data.action === 'fill' ? data.clearBefore : false,
      pressEnter: data.action === 'fill' ? data.pressEnter : false,
      waitMs: data.action === 'wait' ? data.waitMs : null,
    };

    try {
      if (isEditing && step) {
        await updateStep.mutateAsync({ stepId: step.id, data: payload });
        toast.success('Passo atualizado');
      } else {
        await createStep.mutateAsync(payload);
        toast.success('Passo criado');
      }
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? 'Erro ao atualizar passo' : 'Erro ao criar passo');
    }
  }

  const isPending = createStep.isPending || updateStep.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Passo' : 'Novo Passo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Action type */}
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Acao</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fill">Preencher</SelectItem>
                      <SelectItem value="click">Clicar</SelectItem>
                      <SelectItem value="wait">Aguardar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Primary selector */}
            <div className="space-y-3">
              <FormLabel>Seletor Primario</FormLabel>
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="selector.type"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="xpath">XPath</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormField
                  control={form.control}
                  name="selector.value"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="#input-nome"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Fallback selectors */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Seletores de Fallback</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addFallback}
                  disabled={selectorFallbacks.length >= 5}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
              {selectorFallbacks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Seletores alternativos caso o primario falhe
                </p>
              ) : (
                <div className="space-y-2">
                  {selectorFallbacks.map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`selectorFallbacks.${index}.type`}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="css">CSS</SelectItem>
                              <SelectItem value="xpath">XPath</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`selectorFallbacks.${index}.value`}
                        render={({ field }) => (
                          <Input
                            {...field}
                            className="flex-1 font-mono"
                            placeholder="Seletor alternativo"
                          />
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFallback(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source/Fixed value toggle - only for fill action */}
            {actionValue === 'fill' && (
              <>
                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <Switch
                    id="useFixedValue"
                    checked={useFixedValue}
                    onCheckedChange={(checked) => {
                      form.setValue('useFixedValue', checked);
                      // Clear the other field when switching
                      if (checked) {
                        form.setValue('sourceFieldKey', null);
                      } else {
                        form.setValue('fixedValue', null);
                      }
                    }}
                  />
                  <Label htmlFor="useFixedValue">Usar valor fixo</Label>
                </div>

                {useFixedValue ? (
                  <FormField
                    control={form.control}
                    name="fixedValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Fixo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder="Valor que sera inserido"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="sourceFieldKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coluna de Origem</FormLabel>
                        <FormControl>
                          <SourceColumnCombobox
                            columns={excelColumns}
                            value={field.value ?? ''}
                            onValueChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Coluna do Excel cujo valor sera usado
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Wait duration - only for wait action */}
            {actionValue === 'wait' && (
              <FormField
                control={form.control}
                name="waitMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duracao (ms)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        placeholder="1000"
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo de espera em milissegundos
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Options - only for fill action */}
            {actionValue === 'fill' && (
              <div className="space-y-3">
                <FormLabel>Opcoes</FormLabel>
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="optional"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 rounded-lg border p-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <div>
                          <Label>Opcional</Label>
                          <p className="text-xs text-muted-foreground">
                            Pular se o elemento nao for encontrado
                          </p>
                        </div>
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clearBefore"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 rounded-lg border p-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <div>
                          <Label>Limpar antes</Label>
                          <p className="text-xs text-muted-foreground">
                            Limpar o campo antes de preencher
                          </p>
                        </div>
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pressEnter"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2 rounded-lg border p-3">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <div>
                          <Label>Pressionar Enter</Label>
                          <p className="text-xs text-muted-foreground">
                            Pressionar Enter apos preencher
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
