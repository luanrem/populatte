import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileSpreadsheet,
  MousePointer,
  Zap,
  Clock,
  Target,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="w-full">
      <AppHeader title="🎨 Populatte" />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center space-y-8">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-4 w-4" />
                Do Excel para a Web, num gole de café
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground max-w-4xl mx-auto leading-tight">
              Automatize o Preenchimento de Formulários com seus Dados do Excel
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Chega de perder horas copiando e colando dados. Com Populatte, importe sua planilha
              uma vez e preencha milhares de formulários automaticamente.
            </p>

            <SignedOut>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <SignUpButton mode="redirect">
                  <Button size="lg" className="text-lg px-8 h-12">
                    Começar Gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </SignUpButton>
                <SignInButton mode="redirect">
                  <Button size="lg" variant="outline" className="text-lg px-8 h-12">
                    Fazer Login
                  </Button>
                </SignInButton>
              </div>
            </SignedOut>

            <SignedIn>
              <Link href="/dashboard">
                <Button size="lg" className="text-lg px-8 h-12">
                  Ir para Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Como Funciona
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Três passos simples para economizar horas de trabalho manual
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="space-y-4">
                {/* Number and Icon Container - Row on mobile, Col on desktop, Left aligned */}
                <div className="flex flex-row items-center space-x-4 space-y-0 md:flex-col md:items-start md:space-y-2 md:space-x-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                    1
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-foreground text-left">
                  Importe sua Planilha
                </h3>
                <p className="text-muted-foreground text-left">
                  Faça upload do seu arquivo Excel ou CSV com os dados dos
                  clientes. Organize em projetos e gerencie tudo em um só lugar.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="space-y-4">
                {/* Number and Icon Container - Row on mobile, Col on desktop, Left aligned */}
                <div className="flex flex-row items-center space-x-4 space-y-0 md:flex-col md:items-start md:space-y-2 md:space-x-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                    2
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MousePointer className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground text-left">
                  Mapeie os Campos
                </h3>
                <p className="text-muted-foreground text-left">
                  Use nossa extensão para mapear os campos do formulário com as
                  colunas da sua planilha. A IA sugere mapeamentos
                  automaticamente.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="space-y-4">
                {/* Number and Icon Container - Row on mobile, Col on desktop, Left aligned */}
                <div className="flex flex-row items-center space-x-4 space-y-0 md:flex-col md:items-start md:space-y-2 md:space-x-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                    3
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-foreground text-left">
                  Preencha Automaticamente
                </h3>
                <p className="text-muted-foreground text-left">
                  Clique em "Preencher" e veja a mágica acontecer. A extensão
                  preenche o formulário instantaneamente com os dados corretos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Por que Empresas Escolhem Populatte?
              </h2>
              <p className="text-lg text-muted-foreground">
                Transforme processos manuais demorados em automação inteligente.
                Populatte foi feito para empresas que valorizam tempo e precisão.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: Clock,
                    title: "Economia de 95% do Tempo",
                    description: "O que levava horas agora leva minutos",
                  },
                  {
                    icon: Target,
                    title: "Precisão Absoluta",
                    description: "Elimine erros humanos de digitação",
                  },
                  {
                    icon: Shield,
                    title: "Segurança Garantida",
                    description: "Seus dados ficam protegidos e privados",
                  },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
                <h3 className="text-2xl font-bold text-foreground mb-6">
                  Use Cases Reais
                </h3>
                <ul className="space-y-4">
                  {[
                    "Preenchimento de cadastros governamentais",
                    "Registro de múltiplos funcionários em sistemas",
                    "Atualização em massa de dados cadastrais",
                    "Importação de clientes para CRMs",
                    "Preenchimento de formulários repetitivos",
                  ].map((useCase, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6 md:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground">
            Pronto para Economizar Horas de Trabalho?
          </h2>
          <p className="text-xl text-muted-foreground">
            Junte-se às empresas que já automatizaram seus processos de preenchimento de formulários.
          </p>

          <SignedOut>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <SignUpButton mode="redirect">
                <Button size="lg" className="text-lg px-8 h-12">
                  Começar Agora - É Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
            </div>
            <p className="text-sm text-muted-foreground">
              Sem cartão de crédito necessário • Configuração em 2 minutos
            </p>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg" className="text-lg px-8 h-12">
                Acessar Plataforma
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              © 2025 Populatte. Todos os direitos reservados.
            </p>
            <p className="text-xs mt-2">
              Transformando Excel em automação, um formulário por vez.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
