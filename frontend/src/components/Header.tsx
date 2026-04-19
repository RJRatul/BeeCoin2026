'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/Button';
import { FaTimes, FaBars } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const getUserInitials = () =>
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.firstName?.[0] ?? user?.lastName?.[0] ?? 'U').toUpperCase();

  const getUserName = () =>
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.lastName ?? 'User';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLinkClick = () => setIsMenuOpen(false);

  return (
    <header
      className={`relative w-full top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-gray-900/95 backdrop-blur-md border-b border-green-700/30 py-2'
          : 'bg-gray-900/90 backdrop-blur-sm border-b border-green-800/30 py-3'
      }`}
    >
      <nav className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center z-50">
            <div className="w-20 h-10 relative mr-2 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Cryptax Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent whitespace-nowrap">
              Cryptax
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-1 xl:space-x-2">
            <Link href="/#how-it-works" className="text-gray-300 hover:text-green-400 px-3 py-2 text-sm xl:text-base">
              About Us
            </Link>

            {/* ✅ Trade link visible only when logged in */}
            {user && (
              <Link href="/trade" className="text-gray-300 hover:text-green-400 px-3 py-2 text-sm xl:text-base">
                Trade
              </Link>
            )}

            <div className="flex items-center space-x-1 xl:space-x-2 ml-2">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                    {getUserInitials()}
                  </div>
                  <span className="text-sm font-medium text-white">{getUserName()}</span>
                  <Button onClick={logout} variant="secondary" size="sm" className="px-3">
                    Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-yellow-400 transition-colors px-3 py-2 text-sm xl:text-base"
                  >
                    Login
                  </Link>
                  <Button
                    href="/register"
                    variant="primary"
                    size="sm"
                    className="px-3 xl:px-4"
                  >
                    Register
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="lg:hidden">
            <Button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              variant="secondary"
              size="sm"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <FaTimes className="w-4 h-4" /> : <FaBars className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          ref={menuRef}
          className={`lg:hidden absolute left-0 right-0 bg-gray-900/95 backdrop-blur-md border-b border-green-700/30 transition-all duration-300 overflow-hidden ${
            isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col space-y-4">
              <Link href="/#how-it-works" onClick={handleLinkClick} className="text-gray-300 hover:text-green-400 py-2">
                About Us
              </Link>

              {user && (
                <Link href="/trade" onClick={handleLinkClick} className="text-gray-300 hover:text-green-400 py-2">
                  Trade
                </Link>
              )}

              <div className="pt-2 border-t border-green-700/30 flex flex-col space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                        {getUserInitials()}
                      </div>
                      <span className="text-sm font-medium text-white">{getUserName()}</span>
                    </div>
                    <Button
                      onClick={() => {
                        logout();
                        handleLinkClick();
                      }}
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={handleLinkClick} className="text-gray-300 hover:text-yellow-400 py-2">
                      Login
                    </Link>
                    <Button
                      href="/register"
                      variant="primary"
                      size="sm"
                      className="w-full justify-center"
                      onClick={handleLinkClick}
                    >
                      Register
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}