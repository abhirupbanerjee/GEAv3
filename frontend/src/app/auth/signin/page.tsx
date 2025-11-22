/**
 * GEA Portal - Custom Sign-In Page
 *
 * This page provides a branded sign-in experience for the GEA Portal.
 * Users can sign in using their Google or Microsoft accounts.
 *
 * Authorization is handled by checking the users table in the database.
 * Only users with active accounts and whitelisted emails can sign in.
 */

'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { SiMicrosoft } from 'react-icons/si';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const error = searchParams.get('error');

  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: 'google' | 'microsoft') => {
    setIsLoading(provider);
    try {
      await signIn(provider, {
        callbackUrl,
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center mb-4">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            GEA Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Government of Grenada
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Enterprise Architecture Services
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-800">
              Sign in to continue
            </h3>
            <p className="text-sm text-gray-600">
              Use your government account to access the portal
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-800">
                    Authentication Error
                  </h4>
                  <p className="mt-1 text-sm text-red-700">
                    {error === 'OAuthAccountNotLinked'
                      ? 'This email is already associated with another provider.'
                      : error === 'AccessDenied'
                      ? 'Your account is not authorized to access this portal.'
                      : 'An error occurred during sign in. Please try again.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Provider buttons */}
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              onClick={() => handleSignIn('google')}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <FcGoogle className="h-5 w-5" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {isLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>

            {/* Microsoft Sign In - Commented out until configured */}
            {/* <button
              onClick={() => handleSignIn('microsoft')}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <SiMicrosoft className="h-5 w-5 text-[#00A4EF]" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {isLoading === 'microsoft' ? 'Signing in...' : 'Continue with Microsoft'}
              </span>
            </button> */}
          </div>

          {/* Info message */}
          <div className="border-t border-gray-200 pt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-blue-600 mt-0.5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Only authorized government personnel
                    can access this portal. If you need access, please contact
                    your system administrator at{' '}
                    <a
                      href="mailto:admin@dta.gov.gd"
                      className="underline hover:text-blue-900"
                    >
                      admin@dta.gov.gd
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <a href="/terms" className="underline hover:text-gray-700">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="underline hover:text-gray-700">
              Privacy Policy
            </a>
          </p>
          <p className="mt-2">
            &copy; 2025 Government of Grenada. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
