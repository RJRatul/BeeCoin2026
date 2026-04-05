import PublicLayout from '@/layouts/PublicLayout';
import Link from 'next/link';
import { FaArrowRight, FaQuestionCircle, FaChartLine, FaClock, FaDollarSign, FaRocket, FaUsers, FaGem, FaCoins, FaDog, FaCat, FaFrog, FaTwitter, FaTelegram, FaDiscord } from 'react-icons/fa';

export default function Home() {
  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col bg-gray-950">
        {/* Animated background elements for Meme Coins feel */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-yellow-500/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-red-500/10 rounded-full filter blur-3xl animate-pulse delay-2000"></div>
          {/* Floating meme coin emojis */}
          <div className="absolute top-20 left-10 text-4xl animate-bounce opacity-20">🐶</div>
          <div className="absolute bottom-20 right-10 text-4xl animate-bounce delay-1000 opacity-20">🐸</div>
          <div className="absolute top-40 right-20 text-3xl animate-pulse opacity-20">🚀</div>
          <div className="absolute bottom-40 left-20 text-3xl animate-pulse delay-700 opacity-20">🌙</div>
        </div>

        {/* Main content area that grows to fill available space */}
        <main className="flex-grow flex flex-col justify-center items-center px-4 py-8 relative z-10">
          {/* Meme Coins Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gray-900/80 backdrop-blur-sm border border-green-500/30 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium text-green-200">Top Meme Coins Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center">
            <span className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 bg-clip-text text-transparent drop-shadow-lg">Discover the Best</span>
            <span className="block mt-2 text-gray-100">Meme Coins to Watch</span>
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl text-center leading-relaxed">
            From Dogecoin to Pepe, explore the most exciting meme cryptocurrencies. Track prices, follow trends, and join the community-driven revolution.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mb-16 w-full max-w-md sm:max-w-lg">
            <Link href="/register" className="w-full sm:w-auto group">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                <div className="relative px-6 py-3 sm:px-8 sm:py-4 bg-gray-900 rounded-lg flex items-center justify-center w-full border border-green-500/30">
                  <span className="font-bold text-white group-hover:text-green-200 transition-colors mr-2">Start Trading Now</span>
                  <FaArrowRight className="text-yellow-400" />
                </div>
              </div>
            </Link>
            
            <Link href="/#how-it-works" className="flex items-center text-gray-400 hover:text-green-300 group transition-colors w-full sm:w-auto justify-center">
              <FaQuestionCircle className="mr-2 text-yellow-400" />
              Learn About Meme Coins
            </Link>
          </div>

          {/* Popular Meme Coins Section */}
          <div className="w-full max-w-5xl mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">🔥 Trending Meme Coins</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { name: "Dogecoin", symbol: "DOGE", icon: "🐶", color: "from-yellow-400 to-orange-500" },
                { name: "Shiba Inu", symbol: "SHIB", icon: "🐕", color: "from-orange-400 to-red-500" },
                { name: "Pepe", symbol: "PEPE", icon: "🐸", color: "from-green-400 to-emerald-500" },
                { name: "Floki", symbol: "FLOKI", icon: "🐕‍🦺", color: "from-blue-400 to-cyan-500" },
                { name: "Bonk", symbol: "BONK", icon: "🐕", color: "from-purple-400 to-pink-500" }
              ].map((coin) => (
                <div key={coin.name} className="bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <div className={`text-4xl mb-2 bg-gradient-to-r ${coin.color} bg-clip-text text-transparent`}>
                      {coin.icon}
                    </div>
                    <div className="font-bold text-white text-sm">{coin.name}</div>
                    <div className="text-gray-400 text-xs">{coin.symbol}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Section - Responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl w-full mb-16">
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-green-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-yellow-400 bg-clip-text text-transparent mb-2">200+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaCoins className="mr-2 text-yellow-400" /> Meme Coins Listed
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-yellow-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-red-400 bg-clip-text text-transparent mb-2">$50B+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaDollarSign className="mr-2 text-green-400" /> Market Cap
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-red-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent mb-2">5M+</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaUsers className="mr-2 text-red-400" /> Active Holders
              </div>
            </div>
            <div className="bg-gray-900/80 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-purple-500/30 flex flex-col items-center">
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">24/7</div>
              <div className="text-gray-300 text-sm sm:text-base flex items-center">
                <FaClock className="mr-2 text-purple-400" /> Live Trading
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <div className="w-full max-w-5xl mt-8" id="how-it-works">
            <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">Why Join the Meme Coin Revolution?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full flex items-center justify-center mb-4">
                    <FaRocket className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">High Growth Potential</h3>
                  <p className="text-gray-300">Meme coins have shown incredible returns with strong community backing</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-red-500 rounded-full flex items-center justify-center mb-4">
                    <FaUsers className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Community Driven</h3>
                  <p className="text-gray-300">Join millions of holders worldwide in the most active crypto communities</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                    <FaGem className="text-white text-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Easy to Start</h3>
                  <p className="text-gray-300">Simple and accessible trading for everyone, from beginners to experts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Community Section */}
          <div className="w-full max-w-5xl mt-8 mb-8">
            <div className="bg-gradient-to-r from-green-900/20 to-yellow-900/20 backdrop-blur-sm rounded-2xl border border-green-500/30 p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 text-center">Join the Community</h2>
              <p className="text-gray-300 text-center mb-6">Be part of the fastest growing meme coin ecosystem</p>
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