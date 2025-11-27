import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <SignedIn>
            <SidebarTrigger />
          </SignedIn>
          <h1 className="text-xl font-bold text-foreground">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton />
          </SignedOut>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
