/**
 * OtpInput Component
 *
 * 6-digit OTP code input with countdown timer.
 * Auto-focuses next input and handles paste.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiClock, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

interface OtpInputProps {
  onComplete: (code: string) => void;
  onResend: () => void;
  expiresIn: number; // seconds
  disabled?: boolean;
  error?: string;
  isLoading?: boolean;
  phone?: string;
}

export function OtpInput({
  onComplete,
  onResend,
  expiresIn,
  disabled = false,
  error,
  isLoading = false,
  phone,
}: OtpInputProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [timeLeft, setTimeLeft] = useState(expiresIn);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Reset timer when expiresIn changes (e.g., after resend)
  useEffect(() => {
    setTimeLeft(expiresIn);
    setCanResend(false);
  }, [expiresIn]);

  // Focus first input on mount
  useEffect(() => {
    if (!disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = useCallback((index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);

    setCode((prev) => {
      const newCode = [...prev];
      newCode[index] = digit;

      // Check if complete
      if (newCode.every((d) => d !== '') && newCode.length === 6) {
        // Delay to allow state update
        setTimeout(() => onComplete(newCode.join('')), 0);
      }

      return newCode;
    });

    // Move to next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [onComplete]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      const fullCode = code.join('');
      if (fullCode.length === 6) {
        onComplete(fullCode);
      }
    }
  }, [code, onComplete]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newCode[i] = pastedData[i];
      }
      setCode(newCode);

      // Focus last filled input or next empty
      const lastIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastIndex]?.focus();

      // Check if complete
      if (pastedData.length === 6) {
        setTimeout(() => onComplete(pastedData), 0);
      }
    }
  }, [code, onComplete]);

  const handleResend = () => {
    if (canResend && !isLoading) {
      setCode(Array(6).fill(''));
      setTimeLeft(expiresIn);
      setCanResend(false);
      onResend();
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Enter the 6-digit code sent to
        </p>
        {phone && (
          <p className="font-medium text-gray-900">{phone}</p>
        )}
      </div>

      {/* OTP input boxes */}
      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled || isLoading}
            className={`w-12 h-14 text-center text-xl font-semibold border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } ${disabled || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center justify-center gap-1 text-sm text-red-600">
          <FiAlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Timer and resend */}
      <div className="flex items-center justify-center gap-4 text-sm">
        {timeLeft > 0 ? (
          <div className="flex items-center gap-1 text-gray-500">
            <FiClock className="w-4 h-4" />
            Code expires in {formatTime(timeLeft)}
          </div>
        ) : (
          <div className="text-gray-500">Code expired</div>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || isLoading}
          className={`flex items-center gap-1 ${
            canResend && !isLoading
              ? 'text-blue-600 hover:text-blue-700 hover:underline'
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <FiRefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <FiRefreshCw className="w-4 h-4" />
          )}
          Resend code
        </button>
      </div>
    </div>
  );
}

export default OtpInput;
