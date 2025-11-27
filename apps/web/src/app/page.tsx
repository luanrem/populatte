import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-b from-background to-muted">
      <div className="z-10 max-w-5xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Populatte
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Do Excel para a Web, num gole de café ☕
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel</CardTitle>
              <CardDescription>
                Faça upload dos seus dados em formato Excel ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Começar Agora</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mapear Campos</CardTitle>
              <CardDescription>
                Use nossa extensão para mapear campos automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Instalar Extensão
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Automatizar</CardTitle>
              <CardDescription>
                Preencha formulários com um clique
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" className="w-full">
                Ver Projetos
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Powered by Next.js 15 + shadcn/ui + Tailwind CSS
          </p>
        </div>
      </div>
    </main>
  );
}
