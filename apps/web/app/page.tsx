import { AppHeader } from "@/components/layout/app-header";

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
          <p className="text-muted-foreground text-center">
            Use the sidebar to navigate through the application.
          </p>
        </div>
      </div>
    </main>
  );
}
