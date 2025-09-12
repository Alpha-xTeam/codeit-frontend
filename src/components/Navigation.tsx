'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'
import {
  Home,
  Code,
  Trophy,
  User as UserIcon,
  LogOut,
  Zap,
  Menu,
  X,
  ShoppingCart
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/challenges', label: 'Challenges', icon: Code },
  { href: '/store', label: 'Store', icon: ShoppingCart },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export default function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  const fetchUserPoints = useCallback(async (userId: string) => {
    // Prevent multiple simultaneous calls
    if (isCreatingUser) {
      console.log('User creation already in progress, skipping...')
      return
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('total_score, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user points:', error)
        return
      }

      // If user doesn't exist in users table, create them
      if (!data) {
        console.log('User not found in users table, creating new user record...')
        const { data: authUser } = await supabase.auth.getUser()
        
        if (authUser.user) {
          setIsCreatingUser(true)
          try {
            // Use insert with onConflict to handle duplicates
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: userId,
                email: authUser.user.email,
                name: authUser.user.user_metadata?.full_name || authUser.user.email?.split('@')[0],
                total_score: 0
              })
              .select()

            if (insertError) {
              // If it's a duplicate key error, ignore it since user already exists
              if (insertError.code === '23505') {
                console.log('User record already exists, proceeding...')
              } else {
                console.error('Error creating user record:', insertError)
              }
            } else {
              console.log('User record created successfully')
            }
          } catch (insertError) {
            console.error('Error in insert operation:', insertError)
          } finally {
            setIsCreatingUser(false)
          }
        }
        
        setUserPoints(0)
        setUserAvatar('')
        return
      }

      setUserPoints(data?.total_score || 0)
      setUserAvatar(data?.avatar_url || '')
    } catch (error) {
      console.error('Error fetching user points:', error)
      setIsCreatingUser(false)
    }
  }, [isCreatingUser, setUserPoints, setUserAvatar, setIsCreatingUser])

  const updateUserPoints = useCallback(async (points: number) => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ total_score: userPoints + points })
        .eq('id', user.id)
        .select('total_score')
        .maybeSingle()

      if (error) {
        console.error('Error updating user points:', error)
        return
      }

      setUserPoints(data?.total_score || 0)
    } catch (error) {
      console.error('Error updating user points:', error)
    }
  }, [user, userPoints, setUserPoints])

  // Expose updateUserPoints globally for other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as Window & { updateUserPoints?: (points: number) => Promise<void> }).updateUserPoints = updateUserPoints
    }
  }, [user, userPoints])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Check email domain for existing session
      if (session?.user) {
        const userEmail = session.user.email
        if (!userEmail || !userEmail.endsWith('@student.uobabylon.edu.iq')) {
          console.log('Invalid email domain for session user:', userEmail)
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }
      }
      
      setUser(session?.user ?? null)
      
      // Fetch user points if logged in
      if (session?.user) {
        await fetchUserPoints(session.user.id)
      }
    }
    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        // Check email domain if user is signing in
        if (session?.user && event === 'SIGNED_IN') {
          const userEmail = session.user.email
          if (!userEmail || !userEmail.endsWith('@student.uobabylon.edu.iq')) {
            console.log('Invalid email domain for existing user:', userEmail)
            await supabase.auth.signOut()
            window.location.href = '/login'
            return
          }
        }
        
        // Fetch user points when user logs in
        if (session?.user) {
          await fetchUserPoints(session.user.id)
        } else {
          setUserPoints(0)
        }
      }
    )

    // Check theme - default to dark
    const theme = localStorage.getItem('theme')
    const isDarkMode = theme === 'dark' || (!theme && true) // Default to dark
    
    // Apply dark mode to document
    document.documentElement.classList.toggle('dark', isDarkMode)

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* Hamburger Menu Button - Show on all screens */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 w-10 h-10 bg-primary/20 backdrop-blur-xl border border-primary/30 rounded-xl flex items-center justify-center hover:bg-primary/30 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? (
          <X className="w-5 h-5 text-primary" />
        ) : (
          <Menu className="w-5 h-5 text-primary" />
        )}
      </button>

      {/* Overlay for all screens */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <nav className={`fixed left-0 top-0 h-full glass border-r border-border/50 backdrop-blur-xl z-50 transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64`}>
        <div className="flex flex-col h-full p-6">
          {/* Close button for all screens */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="self-end mb-4 w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center hover:bg-primary/30 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-primary" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 mb-8 group" onClick={() => setIsSidebarOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden">
              <Image
                src="/Code-it-Logo.png"
                alt="Code-it Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-2xl font-bold gradient-text">Code-it</span>
          </Link>

        {/* Navigation Items */}
        <div className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const requiresAuth = item.href !== '/' // Home doesn't require auth, others do
            const handleClick = () => {
              if (requiresAuth && !user) {
                window.location.href = '/login'
                return
              }
              setIsSidebarOpen(false) // Close sidebar on mobile after navigation
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all hover-lift ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-lg'
                    : 'text-foreground/80 hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* User Points */}
        {user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-xl">
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {userPoints} pts
              </span>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="space-y-3">
          {/* User menu */}
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-card/30">
                {userAvatar ? (
                  <Image
                    src={userAvatar}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-error hover:bg-error/10 transition-colors rounded-xl"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full bg-gradient-to-r from-primary to-secondary text-white px-4 py-3 rounded-xl font-medium hover:shadow-glow transition-all hover-lift focus-ring text-center block"
              onClick={() => setIsSidebarOpen(false)}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
    </>
  )
}