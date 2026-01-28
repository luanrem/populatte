/**
 * Global Error Boundary
 *
 * Next.js error boundary for catching and handling render errors globally.
 */

'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary component for handling render errors.
 *
 * This component catches errors that occur during rendering and provides
 * options to retry or navigate back to the dashboard.
 *
 * @param props - Error boundary props
 * @param props.error - The caught error object
 * @param props.reset - Function to attempt to re-render the error boundary
 */
export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md">{error.message}</p>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
