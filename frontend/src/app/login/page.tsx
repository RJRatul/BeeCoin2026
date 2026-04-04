/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/Button";
import {
  FaArrowLeft,
  FaSignInAlt,
  FaUserPlus,
  FaLock,
  FaEnvelope,
  FaEyeSlash,
  FaEye,
  FaTimes,
  FaCopy,
  FaCheck,
} from "react-icons/fa";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      router.push("/trade");
    } catch (error: any) {
      if (error.message?.includes("suspended")) {
        setError("Your account has been suspended. Please contact support.");
        // Optionally show AccountSuspended modal
      } else {
        setError(error.message || "Login failed. Please try again.");
      }
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPasswordModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEmailSubject = () => {
    const userEmail = email.toUpperCase();
    return `Forgot Password: ${userEmail}`;
  };

  const getEmailBody = () => {
    return `Hello BeeCoin Support,\n\nI have forgotten my password and need assistance resetting it.\n\nMy email address is: ${email}\n\nPlease help me reset my password.\n\nThank you.`;
  };

  const getMailToLink = () => {
    const subject = getEmailSubject();
    const body = getEmailBody();
    return `mailto:beecoin.aitrading@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen flex flex-col justify-start md:justify-center items-center py-8 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
        {/* Back button */}
        <div className="w-full max-w-md mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-gray-400 hover:text-purple-400 transition-colors"
          >
            <FaArrowLeft className="mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-md">
          {/* Logo and heading */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Sign in to BeeCoin
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Access your ALGO-powered trading dashboard
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Login form */}
          <div className="bg-gray-800/70 backdrop-blur-sm py-8 px-6 rounded-2xl border border-gray-700/50">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white sm:text-sm"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5 text-gray-500 hover:text-gray-300" />
                    ) : (
                      <FaEye className="h-5 w-5 text-gray-500 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Forgot your password?
                </button>
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  icon={<FaSignInAlt />}
                  size="lg"
                  className="w-full"
                >
                  Sign in
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">
                    New to BeeCoin?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  href="/register"
                  variant="secondary"
                  icon={<FaUserPlus />}
                  size="lg"
                  className="w-full"
                >
                  Create a new account
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Forgot Password
                </h3>
                <button
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  If you have forgotten your password, please contact our
                  support team by email. We&apos;ll help you reset your password
                  as soon as possible.
                </p>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-300">
                      Support Email:
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard("beecoin.aitrading@gmail.com")
                      }
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
                  <code className="text-blue-400 text-sm break-all">
                    beecoin.aitrading@gmail.com
                  </code>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs">
                    💡 <strong>Important:</strong> In the email subject, please
                    use your email address in capital letters. For example:{" "}
                    <strong>
                      &quot;Forgot Password:{" "}
                      {email ? email.toUpperCase() : "YOUREMAIL@EXAMPLE.COM"}
                      &quot;
                    </strong>
                  </p>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-300 text-xs">
                    ⏱️ Our support team will reach out to you within 48 hours to
                    help reset your password.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-2">
                  <Button
                    href={getMailToLink()}
                    variant="primary"
                    className="flex-1"
                    onClick={() => setShowForgotPasswordModal(false)}
                  >
                    Open Email Client
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>

                {/* Manual Instructions */}
                <div className="text-xs text-gray-400 mt-4">
                  <p>If the email client doesn&apos;t open automatically:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Open your email client manually</li>
                    <li>
                      Send email to:{" "}
                      <strong>beecoin.aitrading@gmail.com</strong>
                    </li>
                    <li>
                      Subject:{" "}
                      <strong>
                        Forgot Password:{" "}
                        {email ? email.toUpperCase() : "YOUR_EMAIL"}
                      </strong>
                    </li>
                    <li>Include your registered email address in the body</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
