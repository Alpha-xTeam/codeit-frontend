import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Send, ExternalLink, Heart, Code, Trophy, Users } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-t border-slate-700/50 overflow-hidden">
      {/* Wave Divider */}
      <div className="absolute top-0 left-0 w-full h-16 overflow-hidden">
        <svg
          className="absolute bottom-0 overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          version="1.1"
          viewBox="0 0 2560 100"
          x="0"
          y="0"
        >
          <polygon
            className="fill-slate-800"
            points="2560 0 2560 100 0 100"
          ></polygon>
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Team Section */}
          <div className="lg:col-span-2 text-center lg:text-left group">
            <div className="flex items-center justify-center lg:justify-start space-x-4 mb-6">
              <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden group-hover:scale-110 transition-all duration-500">
                <Image
                  src="/ALPHA-LOGO.png"
                  alt="Alpha Team Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain z-10"
                />
              </div>
              <div>
                <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Alpha Team
                </h3>
                <p className="text-slate-400 text-sm">Innovative Solutions</p>
              </div>
            </div>
            <p className="text-slate-300 mb-6 leading-relaxed">
              Building cutting-edge solutions that shape the future of technology and empower developers worldwide.
            </p>
            <div className="flex justify-center lg:justify-start space-x-4">
              <Link
                href="https://www.instagram.com/talpha.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-12 h-12 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl flex items-center justify-center hover:scale-125 transition-all duration-300 shadow-lg shadow-pink-500/25 hover:shadow-pink-500/50"
              >
                <Instagram className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
              </Link>
              <Link
                href="https://t.me/xteam_alpha"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center hover:scale-125 transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/50"
              >
                <Send className="w-6 h-6 text-white group-hover:-rotate-12 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Developer Section */}
          <div className="text-center group">
            <h4 className="text-xl font-semibold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Team Leader
            </h4>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden border-4 border-slate-700/50 shadow-2xl shadow-green-500/25 group-hover:scale-110 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-green-300 to-blue-600 opacity-75 animate-pulse"></div>
                <Image
                  src="/Hussien.JPG"
                  alt="Hussien Haider"
                  width={96}
                  height={96}
                  className="relative w-full h-full object-cover z-10"
                />
              </div>
              <div className="text-center">
                <h5 className="text-xl font-bold text-white mb-1">Hussien Haider</h5>
                <p className="text-slate-400 text-sm mb-3">Alpha Team Leader</p>
                <Link
                  href="https://linktr.ee/hsabadix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Connect</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center lg:text-left">
            <h4 className="text-xl font-semibold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Quick Links
            </h4>
            <div className="space-y-3">
              <Link
                href="/"
                className="group flex items-center space-x-3 text-slate-300 hover:text-white transition-colors duration-300"
              >
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Code className="w-4 h-4" />
                </div>
                <span>Home</span>
              </Link>
              <Link
                href="/challenges"
                className="group flex items-center space-x-3 text-slate-300 hover:text-white transition-colors duration-300"
              >
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Trophy className="w-4 h-4" />
                </div>
                <span>Challenges</span>
              </Link>
              <Link
                href="/leaderboard"
                className="group flex items-center space-x-3 text-slate-300 hover:text-white transition-colors duration-300"
              >
                <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <span>Leaderboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Project Info Card */}
        <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-slate-600/30 shadow-2xl">
          <div className="text-center">
            <h4 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Code-it Platform
            </h4>
            <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto">
              An innovative interactive platform designed for programming training, featuring real-time feedback,
              multiple language support, and gamified learning experience to help developers master coding skills.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-600/30">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-2 text-slate-400">
              <span>Made with</span>
              <Heart className="w-5 h-5 text-red-500 animate-pulse" />
              <span>by Alpha Team</span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2025 Alpha Team. All rights reserved.
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-blue-500 rounded-full animate-ping opacity-75"></div>
      <div className="absolute top-32 right-20 w-1 h-1 bg-purple-500 rounded-full animate-ping opacity-50 animation-delay-1000"></div>
      <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping opacity-60 animation-delay-2000"></div>
    </footer>
  )
}