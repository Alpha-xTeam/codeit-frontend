"use client"

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginClient() {
  const [redirectTo, setRedirectTo] = useState('/challenges')
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    // Set redirect URL on client side only
    if (typeof window !== 'undefined') {
      setRedirectTo(`${window.location.origin}/challenges`)
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsLoading(true)
        setError(null) // Clear any previous errors
        
        console.log('User signed in:', session.user)
        console.log('User metadata:', session.user.user_metadata)
        
        // Check if email ends with @student.uobabylon.edu.iq
        const userEmail = session.user.email
        if (!userEmail || !userEmail.endsWith('@student.uobabylon.edu.iq')) {
          console.log('Invalid email domain:', userEmail)
          setError('يجب أن يكون حساب Google الخاص بك ينتهي بـ @student.uobabylon.edu.iq للدخول إلى النظام.')
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }
        
        // Check if user exists in our users table, if not create them
        try {
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle()

          if (checkError) {
            console.error('Error checking existing user:', checkError)
          }

          if (!existingUser) {
            console.log('Creating new user record...')
            
            // Extract user data from Google
            const userData = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    session.user.email?.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url || 
                         session.user.user_metadata?.picture || 
                         session.user.user_metadata?.profile_picture
            }
            
            console.log('User data to insert:', userData)

            // Create user record with Google profile data
            const { error } = await supabase
              .from('users')
              .insert(userData)

            if (error) {
              console.error('Error creating user:', error)
              setError('Failed to create user account. Please try again.')
              setIsLoading(false)
              return
            } else {
              console.log('User created successfully')
            }
          } else {
            console.log('User already exists')
          }
        } catch (error) {
          console.error('Error checking/creating user:', error)
          setError('An unexpected error occurred. Please try again.')
          setIsLoading(false)
          return
        }

        // Redirect to challenges
        console.log('Redirecting to challenges...')
        router.push('/challenges')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-64 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-8 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/50">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Signing you in...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Setting up your profile with Google
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-20 h-20 bg-blue-400/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-400/10 rounded-full blur-xl animate-pulse delay-500"></div>

      <div className="w-full max-w-md fade-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Code-it
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
            Sign in with your Google account
          </p>
        </div>

        {/* Login Card */}
        <div className="card p-8 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <span className="font-semibold text-red-800 dark:text-red-200">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
              Welcome to Code-it
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Sign in with your Google account to start coding
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#1d4ed8',
                    inputBackground: 'rgba(255, 255, 255, 0.8)',
                    inputBorder: 'rgba(0, 0, 0, 0.1)',
                    inputBorderFocus: '#3b82f6',
                    inputBorderHover: '#3b82f6',
                  },
                  borderWidths: {
                    buttonBorderWidth: '0px',
                    inputBorderWidth: '2px',
                  },
                  radii: {
                    borderRadiusButton: '12px',
                    buttonBorderRadius: '12px',
                    inputBorderRadius: '12px',
                  },
                  fonts: {
                    bodyFontFamily: 'Inter, sans-serif',
                    buttonFontFamily: 'Inter, sans-serif',
                    inputFontFamily: 'Inter, sans-serif',
                    labelFontFamily: 'Inter, sans-serif',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button-modern',
                input: 'auth-input-modern',
                label: 'auth-label-modern',
              },
            }}
            providers={['google']}
            onlyThirdPartyProviders={true}
            redirectTo={redirectTo}
            localization={{
              variables: {
                sign_in: {
                  social_provider_text: 'Continue with {{provider}}',
                  loading_button_label: 'Signing in with Google...',
                },
                sign_up: {
                  social_provider_text: 'Continue with {{provider}}',
                  loading_button_label: 'Creating account with Google...',
                },
              },
            }}
          />

          {/* Info Section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50 backdrop-blur-sm">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-semibold text-blue-800 dark:text-blue-200">Google Account Required</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              You must sign in with a Google account. Your profile picture will be automatically used as your avatar in the application.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2025 Code-it. All rights reserved.
          </p>
          <div className="flex items-center justify-center mt-4 space-x-4">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
