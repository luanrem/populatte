'use client';

import { useCallback, useEffect, useState } from 'react';

import { Check, Copy, Puzzle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/lib/api/client';

interface GenerateCodeResponse {
  code: string;
  expiresIn: number;
}

export default function ExtensionConnectPage() {
  const apiClient = useApiClient();
  const [code, setCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await apiClient.fetch('/auth/extension-code', {
        method: 'POST',
      });
      const data: GenerateCodeResponse = await response.json();
      setCode(data.code);
      setExpiresIn(data.expiresIn);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate code'
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void generateCode();
  }, [generateCode]);

  const copyCode = async () => {
    if (code === null) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatExpiryTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 1) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${seconds} seconds`;
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Puzzle className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Connect Extension</CardTitle>
          <CardDescription>
            Enter this code in the Populatte browser extension to link your
            account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : error !== null ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={generateCode} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-lg border bg-muted/50 px-6 py-4">
                <p className="font-mono text-3xl tracking-widest">{code}</p>
              </div>
              {expiresIn !== null && (
                <p className="text-sm text-muted-foreground">
                  Code expires in {formatExpiryTime(expiresIn)}
                </p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            onClick={copyCode}
            variant="outline"
            className="flex-1"
            disabled={code === null || isLoading}
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </>
            )}
          </Button>
          <Button
            onClick={generateCode}
            variant="ghost"
            disabled={isLoading}
            title="Generate new code"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
