/**
 * Custom 404 Page
 *
 * Next.js not-found page for handling missing routes.
 */

import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * 404 Not Found page component.
 *
 * Displayed when a user navigates to a route that doesn't exist.
 * Provides a link to navigate back to the dashboard.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
