import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="w-full">
      <AppHeader title="🎨 Populatte" />

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] space-y-6">
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to Populatte
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl">
            Transform your Excel data into automated form filling with just a few clicks.
          </p>

          <SignedOut>
            <div className="flex gap-4 mt-4">
              <SignInButton mode="redirect">
                <Button size="lg">Entrar</Button>
              </SignInButton>
              <SignUpButton mode="redirect">
                <Button size="lg" variant="outline">
                  Criar Conta
                </Button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <Link href="/dashboard">
              <Button size="lg">Ir para Dashboard</Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </main>
  );
}
