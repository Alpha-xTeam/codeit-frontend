import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Send, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-card via-card/95 to-card/90 border-t border-border/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Team Section */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center overflow-hidden">
                <Image
                  src="/ALPHA-LOGO.png"
                  alt="Alpha Team Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-2xl font-bold gradient-text">Alpha Team</h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Building innovative solutions for the future of technology.
            </p>
            <div className="flex justify-center md:justify-start space-x-4">
              <Link
                href="https://www.instagram.com/talpha.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Instagram className="w-5 h-5 text-white" />
              </Link>
              <Link
                href="https://t.me/xteam_alpha"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
              >
                <Send className="w-5 h-5 text-white" />
              </Link>
            </div>
          </div>

          {/* Developer Section */}
          <div className="text-center">
            <h4 className="text-lg font-semibold mb-4 gradient-text">Team Leader</h4>
            <div className="flex flex-col items-center space-y-3">
              <div className="w-20 h-20 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center overflow-hidden border-4 border-primary/20">
                <Image
                  src="/Hussien.JPG"
                  alt="Hussien Haider"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h5 className="text-lg font-bold text-foreground">Hussien Haider</h5>
                <p className="text-sm text-muted-foreground">Alpha Team Leader</p>
              </div>
              <Link
                href="https://linktr.ee/hsabadix"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:shadow-glow transition-all hover-lift"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Connect</span>
              </Link>
            </div>
          </div>

          {/* Project Info */}
          <div className="text-center md:text-right">
            <h4 className="text-lg font-semibold mb-4 gradient-text">Code-it Platform</h4>
            <p className="text-muted-foreground mb-4">
              An interactive platform for programming training with real-time feedback.
            </p>
            <div className="flex justify-center md:justify-end space-x-4 text-sm text-muted-foreground">
              <span>© 2025 Alpha Team</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              Made with ❤️ by Alpha Team
            </p>
            <div className="flex space-x-6 text-sm">
              <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
                Home
              </Link>
              <Link href="/challenges" className="text-muted-foreground hover:text-primary transition-colors">
                Challenges
              </Link>
              <Link href="/leaderboard" className="text-muted-foreground hover:text-primary transition-colors">
                Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}