import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
  title: React.ReactNode;
  children?: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <SignedIn>
            <SidebarTrigger />
          </SignedIn>
          <div className="text-xl font-bold text-foreground">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
