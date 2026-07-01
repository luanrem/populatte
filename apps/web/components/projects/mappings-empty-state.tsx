"use client";

import { ArrowRight, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface MappingsEmptyStateProps {
  onNewClick?: () => void;
}

export function MappingsEmptyState({ onNewClick }: MappingsEmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-gold/10 mb-4">
          <Layers className="size-7 text-gold" />
        </div>
        <h3 className="text-base font-semibold text-foreground">
          Criar um mapeamento
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Os mapeamentos são criados pela extensão do navegador. Abra o site de
          destino e use a extensão para capturar os campos da página.
        </p>
        {onNewClick && (
          <Button
            variant="link"
            className="mt-4 text-gold hover:text-gold/80 gap-1.5"
            onClick={onNewClick}
          >
            Como criar
            <ArrowRight className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
