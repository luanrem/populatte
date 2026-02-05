'use client';

import { Control, useWatch } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { MappingFormData } from '../page';

interface MappingPropertiesSectionProps {
  control: Control<MappingFormData>;
}

export function MappingPropertiesSection({
  control,
}: MappingPropertiesSectionProps) {
  const successTriggerValue = useWatch({
    control,
    name: 'successTrigger',
  });

  return (
    <div className="space-y-6">
      {/* Basic Information Card */}
      <Collapsible defaultOpen>
        <Card className="py-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 py-4 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                Informacoes Basicas
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-6 space-y-4">
              {/* Name Field */}
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Formulario de cadastro" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target URL Field */}
              <FormField
                control={control}
                name="targetUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Alvo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://exemplo.com/formulario"
                      />
                    </FormControl>
                    <FormDescription>
                      A extensao ativara em qualquer URL que comece com este
                      endereco.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Behavior Card */}
      <Collapsible defaultOpen>
        <Card className="py-0">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 py-4 transition-colors">
              <CardTitle className="flex items-center justify-between text-base">
                Comportamento
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-6 space-y-4">
              {/* Active Toggle */}
              <FormField
                control={control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativo</FormLabel>
                      <FormDescription>
                        Habilita ou desabilita este mapeamento na extensao
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Success Trigger Select */}
              <FormField
                control={control}
                name="successTrigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gatilho de Sucesso</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === '' ? null : value)
                      }
                      value={field.value ?? ''}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        <SelectItem value="url_change">
                          Mudanca de URL
                        </SelectItem>
                        <SelectItem value="text_appears">
                          Texto aparece
                        </SelectItem>
                        <SelectItem value="element_disappears">
                          Elemento desaparece
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Como detectar que o formulario foi enviado com sucesso
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Selector Field */}
              {(successTriggerValue === 'text_appears' ||
                successTriggerValue === 'element_disappears') && (
                <FormField
                  control={control}
                  name="successConfig.selector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seletor CSS</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder=".success-message"
                          className="font-mono"
                        />
                      </FormControl>
                      <FormDescription>
                        {successTriggerValue === 'text_appears'
                          ? 'Seletor do elemento que contem a mensagem de sucesso'
                          : 'Seletor do elemento que desaparece apos o envio'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
