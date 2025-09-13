"use client"

import Link from 'next/link'
import { ArrowRight, Code, Trophy, Users, Zap, Target, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DecryptedText from '../components/DecryptedText'
import LogoLoop from '../components/LogoLoop'
import GradualBlur from '../components/GradualBlur'
import CardSwap, { Card } from '../components/CardSwap'
import LetterGlitch from '../components/LetterGlitch'


function HomeContent() {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Letter Glitch Background */}
      <div className="fixed inset-0 z-0">
        <LetterGlitch
          glitchColors={['#2b4539', '#61dca3', '#61b3dc']}
          glitchSpeed={50}
          centerVignette={false}
          outerVignette={true}
          smooth={true}
          characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789"
        />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          {/* Floating Elements */}
          <div className="absolute top-20 left-20 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-accent/10 rounded-full blur-xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-secondary/10 rounded-full blur-xl animate-pulse delay-500"></div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="text-center fade-in">
              {/* Logo/Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-2xl mb-8 shadow-2xl shadow-primary/25">
                <Code className="w-10 h-10 text-white" />
              </div>

              {/* Main Heading */}
              <h1 className="text-5xl lg:text-7xl font-bold mb-6">
                <span className="gradient-text"><DecryptedText text="Code-it" /></span>
                <br />
                <span className="text-foreground">
                  <div style={{ marginTop: '4rem' }}>
                    <DecryptedText
                      text="Learn Programming Through Practice"
                      animateOn="view"
                      revealDirection="center"
                    />
                  </div>
                </span>
              </h1>

              {/* Welcome Message for Logged-in Users */}
              {user && (
                <div className="mb-8 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                  <p className="text-green-400 font-semibold text-lg">
                    Welcome back, {user.email}! Ready to continue your coding journey?
                  </p>
                </div>
              )}

              {/* Programming Languages Logo Loop */}
              <div className="mb-8">
                <LogoLoop
                  logos={[
                    { src: '/icons/icons8-python-48.png', alt: 'Python', title: 'Python' },
                    { src: '/icons/icons8-javascript-48.png', alt: 'JavaScript', title: 'JavaScript' },
                    { src: '/icons/icons8-java-logo-48.png', alt: 'Java', title: 'Java' },
                    { src: '/icons/icons8-c++-48.png', alt: 'C++', title: 'C++' }
                  ]}
                  speed={80}
                  direction="left"
                  logoHeight={48}
                  gap={60}
                  pauseOnHover={true}
                  fadeOut={true}
                  scaleOnHover={true}
                  ariaLabel="Programming languages supported"
                  className="opacity-80"
                />
              </div>

              {/* Subtitle */}
              <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                <DecryptedText text="Train your programming skills with instant feedback and interactive challenges.
                  Join thousands of developers improving their coding abilities." />
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link
                  href="/login"
                  className="group bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-glow transition-all hover-lift focus-ring flex items-center space-x-2"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/leaderboard"
                  className="group glass text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-card/50 transition-all hover-lift focus-ring flex items-center space-x-2"
                >
                  <Trophy className="w-5 h-5" />
                  <span>View Leaderboard</span>
                </Link>
                {user && (
                  <Link
                    href="/challenges"
                    className="group bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-glow transition-all hover-lift focus-ring flex items-center space-x-2"
                  >
                    <Code className="w-5 h-5" />
                    <span>Continue Challenges</span>
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">10K+</div>
                  <div className="text-muted-foreground">Active Learners</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">500+</div>
                  <div className="text-muted-foreground">Challenges</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text mb-2">50+</div>
                  <div className="text-muted-foreground">Programming Languages</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card Swap Showcase Section */}
        <section className="py-24 bg-black relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 gradient-text">Interactive Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Discover our cutting-edge interactive components that bring your learning experience to life
              </p>
            </div>

            {/* Card Swap Container */}
            <div className="relative h-[600px] flex items-center justify-center">
              <CardSwap
                width={450}
                height={350}
                cardDistance={80}
                verticalDistance={60}
                delay={4000}
                pauseOnHover={true}
                skewAmount={8}
                easing="elastic"
              >
                {/* Card 1 - Learning Paths */}
                <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 p-8 flex flex-col justify-center items-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Learning Paths</h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    Structured learning journeys designed to take you from beginner to expert in your chosen programming language.
                  </p>
                  <div className="mt-6 flex items-center space-x-2 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Interactive Progress Tracking</span>
                  </div>
                </Card>

                {/* Card 2 - Real-time Collaboration */}
                <Card className="bg-gradient-to-br from-purple-500 to-pink-500 p-8 flex flex-col justify-center items-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Live Collaboration</h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    Code together with peers in real-time, share solutions, and learn from the community.
                  </p>
                  <div className="mt-6 flex items-center space-x-2 text-sm">
                    <Star className="w-4 h-4" />
                    <span>Real-time Pair Programming</span>
                  </div>
                </Card>

                {/* Card 3 - AI-Powered Assistance */}
                <Card className="bg-gradient-to-br from-green-500 to-emerald-500 p-8 flex flex-col justify-center items-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Code className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">AI Assistant</h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    Get intelligent code suggestions, debugging help, and personalized learning recommendations.
                  </p>
                  <div className="mt-6 flex items-center space-x-2 text-sm">
                    <Trophy className="w-4 h-4" />
                    <span>Smart Code Analysis</span>
                  </div>
                </Card>

                {/* Card 4 - Achievement System */}
                <Card className="bg-gradient-to-br from-orange-500 to-red-500 p-8 flex flex-col justify-center items-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Achievements</h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    Unlock badges and rewards as you progress through challenges and reach new milestones.
                  </p>
                  <div className="mt-6 flex items-center space-x-2 text-sm">
                    <Star className="w-4 h-4" />
                    <span>Gamified Learning</span>
                  </div>
                </Card>

                {/* Card 5 - Performance Analytics */}
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 p-8 flex flex-col justify-center items-center text-white">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Analytics Dashboard</h3>
                  <p className="text-center text-white/90 leading-relaxed">
                    Track your progress with detailed analytics, performance metrics, and learning insights.
                  </p>
                  <div className="mt-6 flex items-center space-x-2 text-sm">
                    <Target className="w-4 h-4" />
                    <span>Data-Driven Learning</span>
                  </div>
                </Card>
              </CardSwap>

              {/* Description Text */}
              <div className="absolute left-8 top-1/2 transform -translate-y-1/2 max-w-md">
                <h3 className="text-3xl font-bold text-white mb-4">Experience Innovation</h3>
                <p className="text-white/70 leading-relaxed mb-6">
                  Our interactive card system showcases the dynamic nature of modern web development.
                  Hover over the cards to pause the animation and explore each feature in detail.
                </p>
                <div className="flex items-center space-x-4 text-sm text-white/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    <span>3D Transforms</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    <span>Smooth Animations</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Interactive Controls</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <div className="glass p-12 rounded-3xl">
              <Star className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 gradient-text">
                Ready to Start Your Journey?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join the developer community and take your programming skills to the next level.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-glow transition-all hover-lift focus-ring"
              >
                <span>Start Now</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="relative">
      <HomeContent />

      {/* Gradual Blur Effects for Scroll */}
      <GradualBlur
        position="top"
        height="8rem"
        strength={2.5}
        divCount={6}
        curve="bezier"
        opacity={0.9}
        animated="scroll"
        target="page"
        zIndex={999}
      />

      <GradualBlur
        position="bottom"
        height="8rem"
        strength={2.5}
        divCount={6}
        curve="bezier"
        opacity={0.9}
        animated="scroll"
        target="page"
        zIndex={999}
      />
    </div>
  )
}
