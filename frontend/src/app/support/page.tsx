"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PrivateLayout from "@/layouts/PrivateLayout";
import { FaEnvelope, FaCopy, FaCheck } from "react-icons/fa";

const SUPPORT_EMAIL = "support@cryptax.live";

export default function SupportPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMailToLink = () => {
    const subject = `Support Request: ${user?.email || ""}`;
    const body = `Hello Cryptax Support,\n\nI need assistance with my account.\n\nRegistered Email: ${user?.email || "N/A"}\nUser ID: ${user?.id || "N/A"}\n\nThank you.`;
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <PrivateLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-white text-2xl font-bold mb-6">Support</h1>

          <div className="bg-gray-800/60 rounded-2xl p-6 space-y-5">
            <p className="text-gray-300 text-sm">
              Having trouble with your account? Reach out to our support team and we'll get back to you as soon as possible.
            </p>

            {/* Support Email */}
            <div className="bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FaEnvelope className="w-4 h-4" />
                  Support Email
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  {copied ? <><FaCheck className="w-3 h-3" /><span>Copied!</span></> : <><FaCopy className="w-3 h-3" /><span>Copy</span></>}
                </button>
              </div>
              <code className="text-blue-400 text-sm break-all bg-gray-600/30 px-3 py-2 rounded-lg block">
                {SUPPORT_EMAIL}
              </code>
            </div>

            {/* Notice */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p className="text-yellow-300 text-xs">
                💡 <strong>Tip:</strong> When contacting support, always include your registered email address and a clear description of your issue.
              </p>
            </div>

            {/* Contact Button */}
            <a
              href={getMailToLink()}
              className="block w-full text-center py-3 rounded-xl bg-gradient-to-r from-green-600 to-yellow-600 text-white font-semibold hover:opacity-90 transition"
            >
              Contact Support
            </a>

            {/* Manual instructions */}
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400">If the email client doesn't open:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open your email manually</li>
                <li>Send to: <strong className="text-gray-300">{SUPPORT_EMAIL}</strong></li>
                <li>Include your registered email and user ID</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </PrivateLayout>
  );
}
