/**
 * @pageContext
 * @title Sign In
 * @purpose Authenticate to access the GEA Portal - supports both government staff (OAuth) and citizens (SMS OTP)
 * @audience public
 * @features
 *   - Google OAuth sign-in for government staff
 *   - Microsoft OAuth sign-in for government staff
 *   - Phone number + OTP sign-in for citizens (when enabled)
 *   - Registration flow for new citizens
 *   - Password login for returning citizens
 *   - "Remember me" device trust option
 * @steps
 *   - Government Staff: Click OAuth provider button and authenticate
 *   - Citizens: Enter phone number, verify OTP, complete registration if new
 * @tips
 *   - Citizen login only appears when enabled by admin
 *   - Use your Grenada phone number for citizen portal
 * @relatedPages
 *   - /auth/unauthorized: Shown if email is not authorized
 *   - /admin/home: Destination for staff after sign-in
 *   - /citizen: Destination for citizens after sign-in
 * @permissions
 *   - public: Anyone can access sign-in page
 */

'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FiPhone, FiLock, FiUser, FiMail, FiArrowLeft, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
import PhoneInput from '@/components/citizen/PhoneInput';
import OtpInput from '@/components/citizen/OtpInput';

type CitizenStep = 'phone' | 'otp' | 'register' | 'password';
type LoginMethod = 'otp' | 'password';

interface CitizenState {
  phone: string;
  citizenId: string | null;
  isNewUser: boolean;
  otpExpiresIn: number;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  rememberDevice: boolean;
  loginMethod: LoginMethod;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const error = searchParams.get('error');

  // OAuth loading state
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);

  // Citizen login state
  const [citizenEnabled, setCitizenEnabled] = useState<boolean | null>(null);
  const [citizenStep, setCitizenStep] = useState<CitizenStep>('phone');
  const [citizenState, setCitizenState] = useState<CitizenState>({
    phone: '',
    citizenId: null,
    isNewUser: false,
    otpExpiresIn: 300,
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberDevice: false,
    loginMethod: 'otp',
  });
  const [citizenLoading, setCitizenLoading] = useState(false);
  const [citizenError, setCitizenError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Check if citizen login is enabled and if already authenticated (trusted device)
  useEffect(() => {
    const checkCitizenEnabled = async () => {
      try {
        const res = await fetch('/api/citizen/auth/check');
        if (res.status === 403) {
          setCitizenEnabled(false);
        } else {
          const data = await res.json();
          setCitizenEnabled(true);
          // If already authenticated via trusted device, redirect to citizen portal
          if (data.authenticated) {
            router.push('/citizen');
          }
        }
      } catch {
        setCitizenEnabled(false);
      }
    };
    checkCitizenEnabled();
  }, [router]);

  // OAuth sign in handler
  const handleOAuthSignIn = async (provider: 'google' | 'azure-ad') => {
    setIsOAuthLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsOAuthLoading(null);
    }
  };

  // Citizen: Send OTP
  const handleSendOtp = async () => {
    if (!citizenState.phone) {
      setCitizenError('Please enter your phone number');
      return;
    }

    setCitizenLoading(true);
    setCitizenError(null);

    try {
      const res = await fetch('/api/citizen/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: citizenState.phone }),
      });

      const data = await res.json();

      if (!data.success) {
        setCitizenError(data.error || 'Failed to send verification code');
        return;
      }

      setCitizenState(prev => ({
        ...prev,
        phone: data.phone,
        isNewUser: data.isNewUser,
        otpExpiresIn: data.expiresIn || 300,
      }));
      setCitizenStep('otp');
    } catch (error) {
      console.error('Error sending OTP:', error);
      setCitizenError('Failed to send verification code');
    } finally {
      setCitizenLoading(false);
    }
  };

  // Citizen: Verify OTP
  const handleVerifyOtp = async (code: string) => {
    setCitizenLoading(true);
    setCitizenError(null);

    try {
      const res = await fetch('/api/citizen/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: citizenState.phone,
          code,
          rememberDevice: citizenState.rememberDevice,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setCitizenError(data.error || 'Invalid verification code');
        return;
      }

      if (data.requiresRegistration) {
        // New user - show registration form
        setCitizenState(prev => ({
          ...prev,
          citizenId: data.citizenId,
          isNewUser: true,
        }));
        setCitizenStep('register');
      } else {
        // Existing user - logged in, redirect
        router.push('/citizen');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setCitizenError('Failed to verify code');
    } finally {
      setCitizenLoading(false);
    }
  };

  // Citizen: Complete Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setCitizenError(null);

    // Validation
    if (!citizenState.name.trim()) {
      setCitizenError('Name is required');
      return;
    }
    if (!citizenState.email.trim()) {
      setCitizenError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(citizenState.email)) {
      setCitizenError('Invalid email format');
      return;
    }
    if (citizenState.password.length < 8) {
      setCitizenError('Password must be at least 8 characters');
      return;
    }
    if (citizenState.password !== citizenState.confirmPassword) {
      setCitizenError('Passwords do not match');
      return;
    }

    setCitizenLoading(true);

    try {
      const res = await fetch('/api/citizen/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId: citizenState.citizenId,
          name: citizenState.name.trim(),
          email: citizenState.email.trim().toLowerCase(),
          password: citizenState.password,
          confirmPassword: citizenState.confirmPassword,
          rememberDevice: citizenState.rememberDevice,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setCitizenError(data.error || 'Registration failed');
        return;
      }

      // Registered and logged in - redirect
      router.push('/citizen');
    } catch (error) {
      console.error('Error registering:', error);
      setCitizenError('Registration failed');
    } finally {
      setCitizenLoading(false);
    }
  };

  // Blocked account state
  const [blockedInfo, setBlockedInfo] = useState<{
    blocked: boolean;
    reason: string;
    contact: string;
  } | null>(null);

  // Citizen: Password Login (for returning users)
  const handlePasswordLogin = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    setCitizenError(null);
    setBlockedInfo(null);

    if (!citizenState.password) {
      setCitizenError('Password is required');
      return;
    }

    setCitizenLoading(true);

    try {
      const res = await fetch('/api/citizen/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: citizenState.phone,
          password: citizenState.password,
          rememberDevice: citizenState.rememberDevice,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        // Check if account is blocked
        if (data.error === 'account_blocked') {
          setBlockedInfo({
            blocked: true,
            reason: data.blockReason || 'Your account has been blocked.',
            contact: data.contact || 'support@gea.gov.gd',
          });
          return;
        }
        setCitizenError(data.error || 'Login failed');
        return;
      }

      router.push('/citizen');
    } catch (error) {
      console.error('Error logging in:', error);
      setCitizenError('Login failed');
    } finally {
      setCitizenLoading(false);
    }
  };

  // Reset citizen flow
  const resetCitizenFlow = () => {
    setCitizenStep('phone');
    setCitizenState({
      phone: '',
      citizenId: null,
      isNewUser: false,
      otpExpiresIn: 300,
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      rememberDevice: false,
      loginMethod: 'otp',
    });
    setCitizenError(null);
    setBlockedInfo(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4 py-8 pt-24">
      <div className="max-w-md w-full space-y-6">
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

        {/* Government Staff Sign-in Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="text-center space-y-1 mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Government Staff Login
            </h3>
            <p className="text-xs text-gray-600">
              Use your government account to access the admin portal
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0"
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
                <p className="text-sm text-red-700">
                  {error === 'OAuthAccountNotLinked'
                    ? 'This email is already associated with another provider.'
                    : error === 'AccessDenied'
                    ? 'Your account is not authorized to access this portal.'
                    : 'An error occurred during sign in. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* OAuth Provider buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={isOAuthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <FcGoogle className="h-5 w-5" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {isOAuthLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('azure-ad')}
              disabled={isOAuthLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {isOAuthLoading === 'azure-ad' ? 'Signing in...' : 'Continue with Microsoft'}
              </span>
            </button>
          </div>

          <p className="mt-3 text-xs text-center text-gray-500">
            Only authorized government personnel can sign in
          </p>
        </div>

        {/* Citizen Login Card (if enabled) */}
        {citizenEnabled && (
          <>
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-blue-50 via-white to-green-50 text-gray-500">
                  or
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="text-center space-y-1 mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Citizen Portal Login
                </h3>
                <p className="text-xs text-gray-600">
                  Sign in with your phone number to access citizen services
                </p>
              </div>

              {/* Blocked Account Alert */}
              {blockedInfo && (
                <div className="mb-4 bg-red-50 border border-red-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-800 mb-1">Account Blocked</h4>
                      <p className="text-sm text-red-700 mb-2">
                        Your account has been blocked from accessing the Citizen Portal.
                      </p>
                      <div className="bg-red-100 rounded p-2 mb-3">
                        <p className="text-xs font-medium text-red-800">Reason:</p>
                        <p className="text-sm text-red-700">{blockedInfo.reason}</p>
                      </div>
                      <p className="text-xs text-red-600 mb-3">
                        If you believe this is an error, please contact support for assistance.
                      </p>
                      <a
                        href={`mailto:${blockedInfo.contact}?subject=Account Block Appeal&body=Phone: ${citizenState.phone}%0A%0AI would like to appeal my account block.`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <FiMail className="w-4 h-4" />
                        Contact Support
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setBlockedInfo(null);
                          setCitizenState(prev => ({ ...prev, password: '' }));
                        }}
                        className="ml-2 text-sm text-red-600 hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {citizenError && citizenStep !== 'otp' && !blockedInfo && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{citizenError}</p>
                </div>
              )}

              {/* Step: Phone Number */}
              {citizenStep === 'phone' && (
                <div className="space-y-4">
                  <PhoneInput
                    value={citizenState.phone}
                    onChange={(phone) => setCitizenState(prev => ({ ...prev, phone }))}
                    onSubmit={citizenState.loginMethod === 'otp' ? handleSendOtp : undefined}
                    disabled={citizenLoading}
                    error={citizenError || undefined}
                    isLoading={citizenLoading}
                  />

                  {/* Login Method Toggle */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Login Method
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="loginMethod"
                          value="otp"
                          checked={citizenState.loginMethod === 'otp'}
                          onChange={() => setCitizenState(prev => ({ ...prev, loginMethod: 'otp' }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">SMS OTP</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="loginMethod"
                          value="password"
                          checked={citizenState.loginMethod === 'password'}
                          onChange={() => setCitizenState(prev => ({ ...prev, loginMethod: 'password' }))}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Password</span>
                      </label>
                    </div>
                  </div>

                  {citizenState.loginMethod === 'otp' ? (
                    <button
                      onClick={handleSendOtp}
                      disabled={citizenLoading || !citizenState.phone}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {citizenLoading ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </>
                      ) : (
                        <>
                          <FiPhone className="w-5 h-5" />
                          Send OTP Code
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={citizenState.password}
                            onChange={(e) => setCitizenState(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter your password"
                            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={citizenState.rememberDevice}
                          onChange={(e) => setCitizenState(prev => ({ ...prev, rememberDevice: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Remember this device</span>
                      </label>

                      <button
                        onClick={handlePasswordLogin}
                        disabled={citizenLoading || !citizenState.phone || !citizenState.password}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                      >
                        {citizenLoading ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Signing in...
                          </>
                        ) : (
                          <>
                            <FiLock className="w-5 h-5" />
                            Sign In
                          </>
                        )}
                      </button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCitizenState(prev => ({ ...prev, loginMethod: 'otp', password: '' }));
                            setCitizenError(null);
                          }}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Forgot password? Use OTP instead
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    {citizenState.loginMethod === 'otp'
                      ? 'New user? OTP will register your account automatically.'
                      : 'Password login is for returning users only.'}
                  </p>

                  <div className="text-center">
                    <a href="/helpdesk" className="text-sm text-blue-600 hover:underline">
                      Track existing ticket without login →
                    </a>
                  </div>
                </div>
              )}

              {/* Step: OTP Verification */}
              {citizenStep === 'otp' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setCitizenStep('phone')}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Change phone number
                  </button>

                  <OtpInput
                    onComplete={handleVerifyOtp}
                    onResend={handleSendOtp}
                    expiresIn={citizenState.otpExpiresIn}
                    disabled={citizenLoading}
                    error={citizenError || undefined}
                    isLoading={citizenLoading}
                    phone={citizenState.phone}
                  />

                  {/* Remember device checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={citizenState.rememberDevice}
                      onChange={(e) => setCitizenState(prev => ({ ...prev, rememberDevice: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Remember this device for 30 days</span>
                  </label>
                </div>
              )}

              {/* Step: Registration Form */}
              {citizenStep === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <button
                    type="button"
                    onClick={resetCitizenFlow}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Start over
                  </button>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FiCheck className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        Phone verified! Complete your registration below.
                      </p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={citizenState.name}
                        onChange={(e) => setCitizenState(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Smith"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={citizenState.email}
                        onChange={(e) => setCitizenState(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={citizenState.password}
                        onChange={(e) => setCitizenState(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Min. 8 characters"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={citizenState.confirmPassword}
                        onChange={(e) => setCitizenState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm password"
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Remember device */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={citizenState.rememberDevice}
                      onChange={(e) => setCitizenState(prev => ({ ...prev, rememberDevice: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Remember this device for 30 days</span>
                  </label>

                  <button
                    type="submit"
                    disabled={citizenLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {citizenLoading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              )}

              {/* Step: Password Login (for returning users who want to use password instead of OTP) */}
              {citizenStep === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <button
                    type="button"
                    onClick={resetCitizenFlow}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <FiArrowLeft className="w-4 h-4" />
                    Start over
                  </button>

                  <p className="text-sm text-gray-600">
                    Logging in as <strong>{citizenState.phone}</strong>
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={citizenState.password}
                        onChange={(e) => setCitizenState(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={citizenState.rememberDevice}
                      onChange={(e) => setCitizenState(prev => ({ ...prev, rememberDevice: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Remember this device</span>
                  </label>

                  <button
                    type="submit"
                    disabled={citizenLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {citizenLoading ? 'Signing in...' : 'Sign In'}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCitizenStep('phone');
                        setCitizenError(null);
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Forgot password? Use OTP instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}

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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
