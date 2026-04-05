import Link from "next/link";
import Image from "next/image";
import { FaTwitter, FaTelegram, FaDiscord, FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-18 h-10 flex items-center justify-center relative">
                <Image
                  src="/logo.png"
                  alt="BeeCoin Logo"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-500 bg-clip-text text-transparent">
                BeeCoin
              </span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Discover the most exciting meme coins in the crypto space. Track prices, follow trends, and join the community-driven revolution.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-gray-400 hover:text-green-400 transition-colors"
              >
                <FaTwitter className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-blue-400 transition-colors"
              >
                <FaTelegram className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-purple-400 transition-colors"
              >
                <FaDiscord className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-gray-400 transition-colors"
              >
                <FaGithub className="w-6 h-6" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/help"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} BeeCoin. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-green-400 text-sm transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-green-400 text-sm transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/cookies"
              className="text-gray-400 hover:text-green-400 text-sm transition-colors"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}