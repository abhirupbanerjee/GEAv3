/**
 * GEA Portal - Unauthorized Access Page
 *
 * This page is shown when a user successfully authenticates with OAuth
 * but their email is not whitelisted in the users table or their account
 * is inactive.
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-xl flex items-center justify-center mb-4">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            GEA Portal - Government of Grenada
          </p>
        </div>

        {/* Error card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-red-100">
          <div className="text-center space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Unauthorized Access
              </h3>
              <p className="text-sm text-red-700">
                {error === 'not_authorized'
                  ? 'Your account is not authorized to access the GEA Portal. Your email address must be added by an administrator before you can sign in.'
                  : 'Your account does not have the necessary permissions to access this portal.'}
              </p>
            </div>

            {/* What to do next */}
            <div className="text-left space-y-4">
              <h4 className="font-semibold text-gray-900 text-sm">
                What can I do?
              </h4>
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-3 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    <strong>Contact your administrator</strong> at{' '}
                    <a
                      href="mailto:admin@dta.gov.gd"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      admin@dta.gov.gd
                    </a>{' '}
                    to request access
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-3 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>
                    <strong>Provide the following information:</strong>
                    <ul className="mt-1 ml-5 list-disc text-xs text-gray-600">
                      <li>Your full name</li>
                      <li>Your email address</li>
                      <li>Your ministry/department/agency</li>
                      <li>Reason for needing access</li>
                    </ul>
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-blue-600 mr-3 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>
                    Wait for the administrator to add your account to the
                    system (typically within 1-2 business days)
                  </span>
                </li>
              </ul>
            </div>

            {/* Contact info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 text-sm mb-2">
                Digital Transformation Agency
              </h4>
              <p className="text-xs text-blue-800">
                Ministry of Finance, Energy and Public Utilities
                <br />
                Government of Grenada
                <br />
                Email:{' '}
                <a
                  href="mailto:admin@dta.gov.gd"
                  className="underline hover:text-blue-900"
                >
                  admin@dta.gov.gd
                </a>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Sign Out
            </button>
            <a
              href="/auth/signin"
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-center"
            >
              Back to Sign In
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            &copy; 2025 Government of Grenada. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
