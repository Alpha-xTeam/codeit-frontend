'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { User } from '@supabase/supabase-js'
import {
  Code,
  Trophy,
  TrendingUp,
  Clock,
  Star,
  Target,
  LogOut,
  User as UserIcon,
  Award,
  Zap,
  Flame,
  Calendar,
  BarChart3,
  ChevronRight,
  Play,
  BookOpen,
  Users,
  Crown,
  Medal,
  Sparkles,
  Activity,
  GitBranch,
  Coffee,
  Lightbulb
} from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
  unlocked: boolean
  progress?: number
  maxProgress?: number
  unlocked_at?: string
}

interface SuggestedChallenge {
  id: string
  title: string
  language: string
  difficulty: string
  points: number
  estimatedTime?: string
}

interface RecentActivity {
  id: string
  type: 'completed' | 'started' | 'streak'
  title: string
  description: string
  timestamp: string
  points?: number
  icon: string
}

interface CompletedChallenge {
  challenge_id: string
  challenges: {
    language: string
  } | null
}

interface RecentChallenge {
  id: string
  status: string
  score?: number
  completed_at: string
  created_at: string
  challenges: {
    title: string
    language: string
    points: number
  }[]
}

// Icon mapping for achievements
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Target': Target,
  'Zap': Zap,
  'Flame': Flame,
  'Star': Star,
  'Trophy': Trophy,
  'Award': Award,
  'Medal': Medal,
  'Crown': Crown,
  'Code': Code,
  'BookOpen': BookOpen,
  'Lightbulb': Lightbulb,
  'Coffee': Coffee,
  'GitBranch': GitBranch,
  'Users': Users,
  'Sparkles': Sparkles,
  'Activity': Activity,
  'Play': Play,
  'ChevronRight': ChevronRight,
  'LogOut': LogOut,
  'User': UserIcon,
  'TrendingUp': TrendingUp,
  'Clock': Clock,
  'BarChart3': BarChart3,
  'Calendar': Calendar
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    name: string | null
    avatar_url: string | null
    total_score: number | null
  } | null>(null)
  const [stats, setStats] = useState({
    completedChallenges: 0,
    globalRank: 0,
    totalPoints: 0,
    practiceTime: 0,
    streakDays: 0,
    weeklyProgress: 0
  })

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [suggestedChallenges, setSuggestedChallenges] = useState<SuggestedChallenge[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const fetchUserStats = useCallback(async (userId: string): Promise<void> => {
    try {
      // Get completed challenges count
      const { count: completedCount } = await supabase
        .from('user_challenges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')

      // Get user profile information including avatar
      const { data: userProfileData } = await supabase
        .from('users')
        .select('name, avatar_url, total_score')
        .eq('id', userId)
        .single()

      setUserProfile(userProfileData)

      // Get global rank
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, total_score')
        .order('total_score', { ascending: false })

      const userRank = (allUsers?.findIndex(u => u.id === userId) ?? -1) + 1 || 0

      // Calculate practice time (hours spent on completed challenges this month)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyChallenges } = await supabase
        .from('user_challenges')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', startOfMonth.toISOString())

      // Estimate practice time (assume 30 minutes per challenge)
      const practiceTime = (monthlyChallenges?.length || 0) * 0.5

      // Calculate streak (simplified - in real app would track daily activity)
      const streakDays = Math.min(completedCount || 0, 7)

      // Weekly progress (simplified)
      const weeklyProgress = Math.min(((completedCount || 0) % 7) * 14, 100)

      setStats({
        completedChallenges: completedCount || 0,
        globalRank: userRank,
        totalPoints: userProfileData?.total_score || 0,
        practiceTime: practiceTime,
        streakDays: streakDays,
        weeklyProgress: weeklyProgress
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
      setStats({
        completedChallenges: 0,
        globalRank: 0,
        totalPoints: 0,
        practiceTime: 0,
        streakDays: 0,
        weeklyProgress: 0
      })
    }
  }, [])

  const fetchAchievements = useCallback(async (userId: string): Promise<void> => {
    try {
      // Get all achievements
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('points', { ascending: true })

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId)

      // Get user stats for calculating progress
      const { data: userStats } = await supabase
        .from('users')
        .select('total_score')
        .eq('id', userId)
        .single()

      const { data: completedChallenges } = await supabase
        .from('user_challenges')
        .select('challenge_id, challenges(language)')
        .eq('user_id', userId)
        .eq('status', 'completed')

      const unlockedAchievementIds = userAchievements?.map(ua => ua.achievement_id) || []
      const completedCount = completedChallenges?.length || 0
      const uniqueLanguages = [...new Set(
        (completedChallenges as unknown as CompletedChallenge[])?.map((c: CompletedChallenge) => c.challenges?.language).filter(Boolean) || []
      )]

      const achievementsWithProgress: Achievement[] = allAchievements?.map(achievement => {
        const isUnlocked = unlockedAchievementIds.includes(achievement.id)
        let progress = 0
        let maxProgress = 0

        // Calculate progress based on achievement type
        switch (achievement.title.toLowerCase()) {
          case 'first steps':
            progress = completedCount > 0 ? 1 : 0
            maxProgress = 1
            break
          case 'speed demon':
            // This would need daily tracking - simplified for now
            progress = Math.min(completedCount, 5)
            maxProgress = 5
            break
          case 'streak master':
            progress = Math.min(stats.streakDays, 7)
            maxProgress = 7
            break
          case 'polyglot':
            progress = uniqueLanguages.length
            maxProgress = 3
            break
          case 'perfectionist':
            progress = Math.min(completedCount, 10)
            maxProgress = 10
            break
          case 'problem solver':
            progress = Math.min(completedCount, 50)
            maxProgress = 50
            break
          case 'master coder':
            const level = Math.floor((userStats?.total_score || 0) / 500) + 1
            progress = Math.min(level, 10)
            maxProgress = 10
            break
          default:
            progress = isUnlocked ? 1 : 0
            maxProgress = 1
        }

        return {
          ...achievement,
          unlocked: isUnlocked,
          progress,
          maxProgress,
          unlocked_at: userAchievements?.find(ua => ua.achievement_id === achievement.id)?.unlocked_at
        }
      }) || []

      setAchievements(achievementsWithProgress)
    } catch (error) {
      console.error('Error fetching achievements:', error)
      setAchievements([])
    }
  }, [stats.streakDays])

  const fetchSuggestedChallenges = useCallback(async (userId: string): Promise<void> => {
    try {
      // Get challenges that user hasn't completed yet
      const { data: completedChallengeIds } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('status', 'completed')

      const completedIds = completedChallengeIds?.map(c => c.challenge_id) || []

      // Get suggested challenges (not completed by user, ordered by points)
      const { data: challenges } = await supabase
        .from('challenges')
        .select('*')
        .not('id', 'in', `(${completedIds.join(',') || 'null'})`)
        .order('points', { ascending: true })
        .limit(6)

      const suggested: SuggestedChallenge[] = challenges?.map(challenge => ({
        id: challenge.id,
        title: challenge.title,
        language: challenge.language,
        difficulty: challenge.difficulty || 'Medium',
        points: challenge.points || 0,
        estimatedTime: `${Math.floor((challenge.points || 50) / 10) * 5} min`
      })) || []

      setSuggestedChallenges(suggested)
    } catch (error) {
      console.error('Error fetching suggested challenges:', error)
      setSuggestedChallenges([])
    }
  }, [])

  const fetchRecentActivity = useCallback(async (userId: string): Promise<void> => {
    try {
      // Get recent user challenges
      const { data: recentChallenges } = await supabase
        .from('user_challenges')
        .select(`
          id,
          status,
          score,
          completed_at,
          created_at,
          challenges (
            title,
            language,
            points
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(10)

      const activities: RecentActivity[] = []

      recentChallenges?.forEach((challenge: RecentChallenge) => {
        if (challenge.status === 'completed') {
          activities.push({
            id: challenge.id,
            type: 'completed',
            title: `Completed ${challenge.challenges?.[0]?.title || 'Challenge'}`,
            description: `${new Date(challenge.completed_at).toLocaleString()} • +${challenge.score || challenge.challenges?.[0]?.points || 0} points`,
            timestamp: challenge.completed_at,
            points: challenge.score || challenge.challenges?.[0]?.points || 0,
            icon: 'Target'
          })
        } else if (challenge.status === 'in_progress') {
          activities.push({
            id: challenge.id,
            type: 'started',
            title: `Started ${challenge.challenges?.[0]?.title || 'Challenge'}`,
            description: `${new Date(challenge.created_at).toLocaleString()} • In Progress`,
            timestamp: challenge.created_at,
            icon: 'Code'
          })
        }
      })

      // Add streak achievements if any
      if (stats.streakDays >= 7) {
        activities.unshift({
          id: 'streak-7',
          type: 'streak',
          title: 'Achieved 7-day coding streak',
          description: `${new Date().toLocaleString()} • +100 bonus points`,
          timestamp: new Date().toISOString(),
          points: 100,
          icon: 'Flame'
        })
      }

      setRecentActivity(activities.slice(0, 6)) // Show only latest 6 activities
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      setRecentActivity([])
    }
  }, [stats.streakDays])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploadingAvatar(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      setUserProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setShowAvatarUpload(false)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(session?.user ?? null)

        // Fetch user stats if logged in
        if (session?.user) {
          await fetchUserStats(session.user.id)
          await fetchAchievements(session.user.id)
          await fetchSuggestedChallenges(session.user.id)
          await fetchRecentActivity(session.user.id)
        }
      } catch (error) {
        console.error('Error getting user:', error)
        window.location.href = '/login'
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)

        // Fetch user stats when user logs in
        if (session?.user) {
          fetchUserStats(session.user.id)
          fetchAchievements(session.user.id)
          fetchSuggestedChallenges(session.user.id)
          fetchRecentActivity(session.user.id)
        } else {
          setStats({
            completedChallenges: 0,
            globalRank: 0,
            totalPoints: 0,
            practiceTime: 0,
            streakDays: 0,
            weeklyProgress: 0
          })
          setAchievements([])
          setSuggestedChallenges([])
          setRecentActivity([])
          setUserProfile(null)
        }

        if (!session) {
          window.location.href = '/login'
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserStats, fetchAchievements, fetchSuggestedChallenges, fetchRecentActivity])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="relative">
            <div className="animate-spin w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full mx-auto animate-spin animation-delay-300 opacity-50"></div>
          </div>
          <p className="text-white/80 text-lg font-medium">Loading your dashboard...</p>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce animation-delay-100"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce animation-delay-200"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute top-1/2 right-10 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      {/* Floating Code Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 text-blue-400/20 text-6xl animate-bounce delay-300">{'</>'}</div>
        <div className="absolute top-3/4 right-1/4 text-purple-400/20 text-4xl animate-bounce delay-700">{'{}'}</div>
        <div className="absolute top-1/2 left-1/2 text-cyan-400/20 text-5xl animate-bounce delay-1000">{'()=>'}</div>
      </div>

      <div className="relative z-10">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center space-x-6">
                <div className="relative group">
                  {userProfile?.avatar_url ? (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/25">
                      <Image
                        src={userProfile.avatar_url}
                        alt="User Avatar"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 animate-pulse">
                      <UserIcon className="w-10 h-10 text-white" />
                    </div>
                  )}

                  {/* Avatar Upload Button */}
                  <button
                    onClick={() => setShowAvatarUpload(!showAvatarUpload)}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>

                  {/* Upload Modal/Input */}
                  {showAvatarUpload && (
                    <div className="absolute top-full mt-2 left-0 z-50">
                      <div className="bg-slate-800/95 backdrop-blur-xl rounded-xl p-4 border border-slate-600/50 shadow-2xl min-w-64">
                        <h3 className="text-white font-medium mb-3">Change Avatar</h3>
                        <div className="space-y-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            disabled={uploadingAvatar}
                            className="w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                          />
                          {uploadingAvatar && (
                            <div className="flex items-center space-x-2 text-blue-400">
                              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                              <span className="text-sm">Uploading...</span>
                            </div>
                          )}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowAvatarUpload(false)}
                              className="flex-1 px-3 py-2 text-sm bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                    Welcome back, {userProfile?.name || user.email?.split('@')[0] || 'Coder'}! 🚀
                  </h1>
                  <p className="text-white/70 text-lg">{user.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1 text-orange-400">
                      <Flame className="w-4 h-4" />
                      <span className="text-sm font-medium">{stats.streakDays} day streak</span>
                    </div>
                    <div className="flex items-center space-x-1 text-yellow-400">
                      <Star className="w-4 h-4" />
                      <span className="text-sm font-medium">Level {Math.floor(stats.totalPoints / 500) + 1}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-white/60 text-sm">Total Points</p>
                  <p className="text-2xl font-bold text-white">{stats.totalPoints.toLocaleString()}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-3 rounded-xl border border-red-500/30 hover:border-red-400/50 transition-all duration-300 hover:scale-105"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Action Button */}
          <div className="mb-12">
            <Link
              href="/challenges"
              className="group block w-full max-w-md mx-auto"
            >
              <div className="glass p-8 rounded-3xl hover-lift border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">Start Challenges</h2>
                  <p className="text-white/70 text-lg mb-6">Explore coding challenges and improve your skills</p>
                  <div className="flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                    <span className="font-semibold text-xl">Start Now</span>
                    <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="group glass p-6 rounded-2xl hover-lift border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Completed Challenges</p>
                <p className="text-3xl font-bold text-white mb-2">{stats.completedChallenges}</p>
                <div className="flex items-center text-green-400 text-sm">
                  <span>+12% from last month</span>
                </div>
              </div>
            </div>

            <div className="group glass p-6 rounded-2xl hover-lift border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Global Rank</p>
                <p className="text-3xl font-bold text-white mb-2">#{stats.globalRank || 'N/A'}</p>
                <div className="flex items-center text-purple-400 text-sm">
                  <span>Top 10% this week</span>
                </div>
              </div>
            </div>

            <div className="group glass p-6 rounded-2xl hover-lift border border-green-500/20 hover:border-green-400/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Practice Time</p>
                <p className="text-3xl font-bold text-white mb-2">{stats.practiceTime}h</p>
                <div className="flex items-center text-green-400 text-sm">
                  <span>This month</span>
                </div>
              </div>
            </div>

            <div className="group glass p-6 rounded-2xl hover-lift border border-orange-500/20 hover:border-orange-400/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-white/60 text-sm mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-white mb-2">{stats.streakDays} days</p>
                <div className="flex items-center text-orange-400 text-sm">
                  <span>Keep it up! 🔥</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Progress Bar */}
          <div className="glass p-6 rounded-2xl mb-12 border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">Weekly Progress</h3>
              </div>
              <span className="text-cyan-400 font-medium">{stats.weeklyProgress}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${stats.weeklyProgress}%` }}
              ></div>
            </div>
            <p className="text-white/60 text-sm">You&apos;re making great progress this week!</p>
          </div>

          {/* Main Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Start Challenge */}
            <Link
              href="/challenges"
              className="group glass p-8 rounded-2xl hover-lift border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 block relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Start Challenge</h3>
                    <p className="text-white/70">Begin your coding journey</p>
                  </div>
                </div>
                <div className="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
                  <span className="font-medium">Choose Challenge</span>
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Leaderboard */}
            <Link
              href="/leaderboard"
              className="group glass p-8 rounded-2xl hover-lift border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 block relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Leaderboard</h3>
                    <p className="text-white/70">See your global ranking</p>
                  </div>
                </div>
                <div className="flex items-center text-purple-400 group-hover:text-purple-300 transition-colors">
                  <span className="font-medium">View Rankings</span>
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Learning Path */}
            <div className="group glass p-8 rounded-2xl hover-lift border border-green-500/20 hover:border-green-400/40 transition-all duration-300 relative overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Learning Path</h3>
                    <p className="text-white/70">Structured learning journey</p>
                  </div>
                </div>
                <div className="flex items-center text-green-400 group-hover:text-green-300 transition-colors">
                  <span className="font-medium">Coming Soon</span>
                  <Sparkles className="w-5 h-5 ml-2 animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Achievements Section */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <Medal className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-white">Achievements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {achievements.map((achievement) => {
                const Icon = iconMap[achievement.icon] || Target
                return (
                  <div
                    key={achievement.id}
                    className={`glass p-6 rounded-2xl border transition-all duration-300 ${
                      achievement.unlocked
                        ? 'border-yellow-500/30 bg-yellow-500/5'
                        : 'border-slate-600/30 bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        achievement.unlocked
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                          : 'bg-slate-600'
                      }`}>
                        <Icon className={`w-6 h-6 ${achievement.unlocked ? 'text-white' : 'text-slate-400'}`} />
                      </div>
                      {achievement.unlocked && (
                        <div className="text-yellow-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <h3 className={`font-bold mb-2 ${achievement.unlocked ? 'text-white' : 'text-slate-400'}`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-sm mb-3 ${achievement.unlocked ? 'text-white/70' : 'text-slate-500'}`}>
                      {achievement.description}
                    </p>
                    {achievement.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>{achievement.progress}/{achievement.maxProgress}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${achievement.maxProgress ? (achievement.progress / achievement.maxProgress) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Suggested Challenges */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Lightbulb className="w-8 h-8 text-yellow-400" />
                <h2 className="text-3xl font-bold text-white">Suggested for You</h2>
              </div>
              <Link
                href="/challenges"
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="group glass p-6 rounded-2xl hover-lift border border-slate-600/30 hover:border-blue-500/40 transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Code className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-blue-400 font-medium">{challenge.language}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      challenge.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                      challenge.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <h3 className="text-white font-bold mb-2 group-hover:text-blue-300 transition-colors">
                    {challenge.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                    <span>{challenge.estimatedTime}</span>
                    <span>+{challenge.points} pts</span>
                  </div>
                  <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-300 hover:scale-105">
                    Start Challenge
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <Activity className="w-8 h-8 text-cyan-400" />
              <h2 className="text-3xl font-bold text-white">Recent Activity</h2>
            </div>
            <div className="glass rounded-2xl p-6 border border-slate-600/30">
              <div className="space-y-4">
                {recentActivity.map((activity: RecentActivity) => {
                  const Icon = iconMap[activity.icon] || Activity
                  return (
                    <div key={activity.id} className="flex items-center space-x-4 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-700/30 transition-colors">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{activity.title}</p>
                        <p className="text-slate-400 text-sm">{activity.description}</p>
                      </div>
                      {activity.points && (
                        <div className="flex items-center space-x-1 text-yellow-400">
                          <Star className="w-5 h-5" />
                          <span className="text-sm font-medium">+{activity.points}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}