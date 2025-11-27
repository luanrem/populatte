import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function ColorPreviewPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              🎨 Populatte
            </h1>
          </div>
          <ModeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-12 p-8">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            Color System Preview
          </h2>
          <p className="text-muted-foreground text-lg">
            Teste diferentes paletas alterando o <code className="px-2 py-1 bg-muted rounded">globals.css</code>
          </p>
        </div>

        {/* Background & Foreground */}
        <Section title="Background & Foreground">
          <div className="grid grid-cols-2 gap-4">
            <ColorCard
              color="background"
              label="Background"
              className="bg-background border-2 border-border"
            >
              <p className="text-foreground">Foreground text on background</p>
            </ColorCard>
            <ColorCard
              color="foreground"
              label="Foreground"
              className="bg-foreground"
            >
              <p className="text-background">Background text on foreground</p>
            </ColorCard>
          </div>
        </Section>

        {/* Primary Colors */}
        <Section title="Primary Colors">
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <Button>Primary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="link">Link Button</Button>
            </div>
            <ColorCard color="primary" label="Primary" className="bg-primary">
              <p className="text-primary-foreground font-semibold">
                Primary Foreground Text
              </p>
            </ColorCard>
          </div>
        </Section>

        {/* Secondary Colors */}
        <Section title="Secondary Colors">
          <div className="space-y-4">
            <Button variant="secondary">Secondary Button</Button>
            <ColorCard
              color="secondary"
              label="Secondary"
              className="bg-secondary"
            >
              <p className="text-secondary-foreground">
                Secondary Foreground Text
              </p>
            </ColorCard>
          </div>
        </Section>

        {/* Destructive Colors */}
        <Section title="Destructive Colors">
          <div className="space-y-4">
            <Button variant="destructive">Destructive Button</Button>
            <ColorCard
              color="destructive"
              label="Destructive"
              className="bg-destructive"
            >
              <p className="text-destructive-foreground">
                Destructive Foreground Text
              </p>
            </ColorCard>
          </div>
        </Section>

        {/* Muted Colors */}
        <Section title="Muted Colors">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground">
                Muted background with muted foreground text. Used for subtle UI elements.
              </p>
            </div>
            <ColorCard color="muted" label="Muted" className="bg-muted">
              <p className="text-muted-foreground">Muted Foreground Text</p>
            </ColorCard>
          </div>
        </Section>

        {/* Accent Colors */}
        <Section title="Accent Colors">
          <div className="space-y-4">
            <div className="p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors cursor-pointer">
              <p className="text-accent-foreground">
                Hover me! Accent background with accent foreground.
              </p>
            </div>
            <ColorCard color="accent" label="Accent" className="bg-accent">
              <p className="text-accent-foreground">Accent Foreground Text</p>
            </ColorCard>
          </div>
        </Section>

        {/* Card Colors */}
        <Section title="Card Colors">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h3 className="text-card-foreground font-semibold mb-2">
                Card Title
              </h3>
              <p className="text-muted-foreground text-sm">
                This is a card component using card background and card-foreground text.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h3 className="text-card-foreground font-semibold mb-2">
                Another Card
              </h3>
              <p className="text-muted-foreground text-sm">
                Cards are great for grouping content.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <h3 className="text-card-foreground font-semibold mb-2">
                Third Card
              </h3>
              <p className="text-muted-foreground text-sm">
                Notice the consistent styling.
              </p>
            </div>
          </div>
        </Section>

        {/* Popover Colors */}
        <Section title="Popover Colors">
          <ColorCard
            color="popover"
            label="Popover"
            className="bg-popover border border-border shadow-lg"
          >
            <p className="text-popover-foreground">
              Popover background with popover foreground text. Used for floating elements.
            </p>
          </ColorCard>
        </Section>

        {/* Chart Colors */}
        <Section title="Chart Colors">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <ColorCard
              color="chart-1"
              label="Chart 1"
              className="bg-chart-1"
            >
              <p className="text-background font-semibold">Chart 1</p>
            </ColorCard>
            <ColorCard
              color="chart-2"
              label="Chart 2"
              className="bg-chart-2"
            >
              <p className="text-background font-semibold">Chart 2</p>
            </ColorCard>
            <ColorCard
              color="chart-3"
              label="Chart 3"
              className="bg-chart-3"
            >
              <p className="text-background font-semibold">Chart 3</p>
            </ColorCard>
            <ColorCard
              color="chart-4"
              label="Chart 4"
              className="bg-chart-4"
            >
              <p className="text-foreground font-semibold">Chart 4</p>
            </ColorCard>
            <ColorCard
              color="chart-5"
              label="Chart 5"
              className="bg-chart-5"
            >
              <p className="text-foreground font-semibold">Chart 5</p>
            </ColorCard>
          </div>
        </Section>

        {/* Border, Input, Ring */}
        <Section title="Border, Input & Ring">
          <div className="space-y-4">
            <div className="p-4 border-2 border-border rounded-lg">
              <p className="text-foreground">
                This box uses the <code className="text-primary">border</code> color
              </p>
            </div>
            <div className="p-4 bg-input rounded-lg">
              <p className="text-foreground">
                This uses the <code className="text-primary">input</code> background color
              </p>
            </div>
            <div className="p-4 border-2 border-ring rounded-lg">
              <p className="text-foreground">
                This box uses the <code className="text-primary">ring</code> color (focus states)
              </p>
            </div>
          </div>
        </Section>

        {/* Complete Button Showcase */}
        <Section title="All Button Variants">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Default</p>
              <Button className="w-full">Button</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Secondary</p>
              <Button variant="secondary" className="w-full">
                Button
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Destructive</p>
              <Button variant="destructive" className="w-full">
                Button
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Outline</p>
              <Button variant="outline" className="w-full">
                Button
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Ghost</p>
              <Button variant="ghost" className="w-full">
                Button
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">Link</p>
              <Button variant="link" className="w-full">
                Button
              </Button>
            </div>
          </div>
        </Section>

        {/* Color Variables Reference */}
        <Section title="CSS Variables Reference">
          <div className="bg-muted p-6 rounded-lg">
            <pre className="text-xs text-muted-foreground overflow-x-auto">
              <code>{`/* Edit these in globals.css */
--background
--foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--card
--card-foreground
--popover
--popover-foreground
--border
--input
--ring
--chart-1
--chart-2
--chart-3
--chart-4
--chart-5`}</code>
            </pre>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-8 border-t border-border">
          <p className="text-muted-foreground">
            Altere as cores em{" "}
            <code className="px-2 py-1 bg-muted rounded text-foreground">
              apps/web/app/globals.css
            </code>{" "}
            e veja as mudanças em tempo real!
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground border-b border-border pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorCard({
  color,
  label,
  className,
  children,
}: {
  color: string;
  label: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <code className="text-xs opacity-70">--{color}</code>
        <span className="text-xs opacity-70">{label}</span>
      </div>
      {children}
    </div>
  );
}
