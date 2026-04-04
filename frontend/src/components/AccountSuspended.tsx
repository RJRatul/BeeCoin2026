"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/Button";
import {
  FaExclamationTriangle,
  FaEnvelope,
  FaCopy,
  FaCheck,
  FaClock,
} from "react-icons/fa";

interface AccountSuspendedProps {
  email?: string;
  userId?: string;
}

export default function AccountSuspended({ email, userId }: AccountSuspendedProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const { logout } = useAuth();

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      logout();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, logout]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSuspendedMailToLink = () => {
    const subject = `Account Suspension: ${email || 'SUPPORT_REQUEST'}`;
    const body = `Hello BeeCoin Support,\n\nMy account has been suspended. Please assist me with reactivating my account.\n\nRegistered Email: ${email || 'N/A'}\nUser ID: ${userId || 'N/A'}\n\nThank you.`;
    return `mailto:beecoin.aitrading@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md border border-red-500/30 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Account Suspended
          </h1>
          <p className="text-gray-300">
            Your account has been temporarily suspended
          </p>
        </div>

        {/* Message Content */}
        <div className="space-y-4">
          <p className="text-gray-300 text-sm text-center">
            Your account has been banned. Please contact our support team for assistance.
          </p>

          {/* Countdown Timer */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FaClock className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Auto logout in:</span>
            </div>
            <div className="text-2xl font-bold text-blue-400 font-mono">
              {formatTime(timeLeft)}
            </div>
            <p className="text-blue-300 text-xs mt-2">
              You will be automatically logged out for security reasons
            </p>
          </div>

          {/* Support Email Section */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <FaEnvelope className="h-4 w-4" />
                Support Email:
              </span>
              <button
                onClick={() => copyToClipboard("beecoin.aitrading@gmail.com")}
                className="cursor-pointer flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                {copied ? (
                  <>
                    <FaCheck className="h-3 w-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <FaCopy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <code className="text-blue-400 text-sm break-all bg-gray-600/30 px-2 py-1 rounded">
              beecoin.aitrading@gmail.com
            </code>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-300 text-xs">
              💡 <strong>Important:</strong> In your email, please include your registered email address and the reason for contacting support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              href={getSuspendedMailToLink()}
              variant="primary"
              className="flex-1"
            >
              Contact Support
            </Button>
            <Button
              onClick={logout}
              variant="secondary"
              className="flex-1"
            >
              Logout Now
            </Button>
          </div>

          {/* Manual Instructions */}
          <div className="text-xs text-gray-400 mt-4">
            <p>If the email client doesn&apos;t open automatically:</p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Open your email client manually</li>
              <li>Send email to: <strong>beecoin.aitrading@gmail.com</strong></li>
              <li>Subject: <strong>Account Suspension: {email?.toUpperCase() || 'YOUR_EMAIL'}</strong></li>
              <li>Include your registered email and user ID in the message</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}