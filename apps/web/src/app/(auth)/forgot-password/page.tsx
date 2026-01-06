'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@repo/packages-ui/button';
import { Input } from '@repo/packages-ui/input';
import { Label } from '@repo/packages-ui/label';
import { Info, MailIcon, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { RedirectIfAuthenticated } from '@/components/auth/redirect-if-authenticated';
import { authClient } from '@/lib/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: '/reset-password',
      });

      if (result.error) {
        toast.error(result.error.message || 'Failed to send reset email');
        return;
      }

      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Forgot password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <RedirectIfAuthenticated>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-lg border p-8">
            <div className="mb-6 text-center">
              <div className="bg-primary text-primary-foreground mx-auto mb-4 flex size-16 items-center justify-center rounded-full">
                <MailIcon className="size-8" />
              </div>
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                We sent a password reset link to
              </p>
              <p className="text-foreground mt-1 text-sm font-medium">
                {getValues('email')}
              </p>
            </div>
            <div className="mb-6 space-y-4 rounded-lg border p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <Info className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Next steps
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Click the link in the email to reset your password. The link
                    will expire in 1 hour.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <TriangleAlert className="size-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground text-sm font-medium">
                    Didn't receive it?
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Check your spam folder or use the button below to send
                    another email.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEmailSent(false)}
              >
                Send another email
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </RedirectIfAuthenticated>
    );
  }

  return (
    <RedirectIfAuthenticated>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="bg-card w-full max-w-md rounded-lg border p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Reset your password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your email address and we'll send you a link to reset your
              password
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-4 pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send reset link
              </Button>
              <p className="text-muted-foreground text-center text-sm">
                Remember your password?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
