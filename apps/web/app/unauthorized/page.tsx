/**
 * Unauthorized Access Page
 *
 * 403 page for handling unauthorized access attempts.
 */

import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * 403 Unauthorized page component.
 *
 * Displayed when a user attempts to access a resource they don't have
 * permission to view. Provides a link to navigate back to the dashboard.
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">403 - Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
