import PublicLayout from '@/layouts/PublicLayout';
import Link from 'next/link';
import { FaArrowRight, FaQuestionCircle, FaChartLine, FaClock, FaDollarSign, FaRocket, FaUsers, FaShieldAlt, FaCoins, FaTwitter, FaTelegram, FaDiscord } from 'react-icons/fa';

export default function Home() {
  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col bg-gray-950">
        {/* Background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
          <div className="absolute top-20 right-20 text-3xl animate-pulse opacity-20">🚀</div>
          <div className="absolute bottom-40 left-20 text-3xl animate-pulse delay-700 opacity-20">📈</div>
        </div>

        <main className="flex-grow flex flex-col justify-center items-center px-4 py-8 relative z-10">
          {/* Live badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur-sm border border-green-500/30 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium text-green-200">Live Crypto Trading — 24/7</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center">
            <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">Trade Real Crypto</span>
            <span className="block mt-2 text-gray-100">With Real-Time Precision</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl text-center leading-relaxed">
            Access live prices for Bitcoin, Ethereum, Solana and dozens more. Set your target, place your trade, and let the market do the rest.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-16 w-full max-w-md sm:max-w-lg">
            <Link href="/register" className="w-full sm:w-auto group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                <div className="relative px-6 py-3 sm:px-8 sm:py-4 bg-gray-900 rounded-lg flex items-center justify-center w-full border border-green-500/30">
                  <span className="font-bold text-white group-hover:text-green-200 transition-colors mr-2">Start Trading Now</span>
                  <FaArrowRight className="text-green-400" />
                </div>
              </div>
            </Link>

            <Link href="/#how-it-works" className="flex items-center text-gray-400 hover:text-green-300 group transition-colors w-full sm:w-auto justify-center">
              <FaQuestionCircle className="mr-2 text-green-400" />
              How It Works
            </Link>
          </div>

          {/* Top Coins Section */}
          <div className="w-full max-w-5xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">🔥 Top Cryptocurrencies</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: "Bitcoin",  symbol: "BTC",  icon: "₿",  color: "from-yellow-400 to-orange-500" },
                { name: "Ethereum", symbol: "ETH",  icon: "Ξ",  color: "from-blue-400 to-indigo-500" },
                { name: "Solana",   symbol: "SOL",  icon: "◎",  color: "from-purple-400 to-pink-500" },
                { name: "BNB",      symbol: "BNB",  icon: "🅱",  color: "from-yellow-500 to-amber-600" },
                { name: "XRP",      symbol: "XRP",  icon: "✕",  color: "from-gray-300 to-blue-400" },
              ].map((coin) => (
                <div key={coin.name} className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <div className={`text-3xl mb-2 font-bold bg-gradient-to-r ${coin.color} bg-clip-text text-transparent`}>
                      {coin.icon}
                    </div>
                    <div className="font-bold text-white text-sm">{coin.name}</div>
                    <div className="text-gray-400 text-xs">{coin.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl w-full mb-16">
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-green-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-2">50+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaCoins className="mr-2 text-green-400" /> Crypto Pairs
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-blue-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">$2T+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaDollarSign className="mr-2 text-blue-400" /> Market Volume
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-purple-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">10M+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaUsers className="mr-2 text-purple-400" /> Active Traders
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-yellow-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent mb-2">24/7</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaClock className="mr-2 text-yellow-400" /> Live Markets
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="w-full max-w-5xl mt-8" id="how-it-works">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">Why Trade on Cryptax?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                    <FaChartLine className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Live Market Prices</h3>
                  <p className="text-gray-300">Real-time price feeds across all major cryptocurrencies — no delays, no simulations</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                    <FaRocket className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Fast Execution</h3>
                  <p className="text-gray-300">Set your target price, place your trade, and get instant confirmation when it hits</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Secure & Reliable</h3>
                  <p className="text-gray-300">Enterprise-grade security with instant deposits and withdrawals, trusted worldwide</p>
                </div>
              </div>
            </div>
          </div>

          {/* Community Section */}
          <div className="w-full max-w-5xl mt-8 mb-8">
            <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 text-center">Join the Cryptax Community</h2>
              <p className="text-gray-300 text-center mb-6">Connect with traders, get market insights, and stay ahead of the market</p>
              <div className="flex justify-center gap-6">
                <a href="#" className="text-gray-400 hover:text-green-400 transition-colors">
                  <FaTwitter className="text-2xl" />
                </a>
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                  <FaTelegram className="text-2xl" />
                </a>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                  <FaDiscord className="text-2xl" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
}
