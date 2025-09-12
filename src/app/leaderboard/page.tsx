'use client'

import { Trophy, Medal, Award, Crown, TrendingUp, Star, Users, Target } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { User } from '@supabase/supabase-js'

interface LeaderboardUser {
  id: string
  name: string
  email: string
  total_score: number
  avatar: string
  streak: number
  challenges_completed: number
  trend: number
  selected_hat: string | null
  selected_avatar_frame: string | null
  selected_text_color: string | null
  selected_background_effect: string | null
  selected_badge: string | null
  avatarError?: boolean
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [userPoints, setUserPoints] = useState<number>(0)
  const [userStreak, setUserStreak] = useState<number>(0)
  const [userAvatar, setUserAvatar] = useState<string>('')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [stats, setStats] = useState({
    activeDevelopers: 0,
    challengesCompleted: 0,
    avgChallengesPerUser: 0
  })

  useEffect(() => {
    // Set initial time on client side only
    setCurrentTime(new Date().toLocaleTimeString())
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      await fetchLeaderboard(session?.user?.id)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        fetchLeaderboard(session?.user?.id)
        if (!session) {
          setUserRank(null)
          setUserPoints(0)
          setUserStreak(0)
          setUserAvatar('')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchLeaderboard = async (currentUserId?: string) => {
    try {
      setLoading(true)

      // جلب المستخدمين مع النقاط الإجمالية
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, total_score, avatar_url, selected_hat, selected_avatar_frame, selected_text_color, selected_background_effect, selected_badge')
        .order('total_score', { ascending: false })
        .limit(10)

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return
      }

      // حساب التاريخ قبل أسبوع
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // جلب عدد التحديات المكتملة لكل مستخدم و streak
      const usersWithChallenges = await Promise.all(
        (users || []).map(async (user) => {
          const { data: challenges, error: challengesError } = await supabase
            .from('user_challenges')
            .select('id, completed_at, score')
            .eq('user_id', user.id)
            .eq('status', 'completed')

          if (challengesError) {
            console.error('Error fetching challenges for user:', challengesError)
            return {
              ...user,
              challenges_completed: 0,
              avatar: (user.name || user.email)[0].toUpperCase(),
              streak: 0,
              trend: 0
            }
          }

          // حساب streak كعدد التحديات في الأسبوع الماضي
          const recentChallenges = challenges?.filter(c => c.completed_at && new Date(c.completed_at) >= oneWeekAgo) || []
          const streak = recentChallenges.length

          // حساب trend كمجموع النقاط في الأسبوع الماضي
          const trend = recentChallenges.reduce((sum, c) => sum + (c.score || 0), 0)

          return {
            ...user,
            challenges_completed: challenges?.length || 0,
            avatar: user.avatar_url || (user.name || user.email)[0].toUpperCase(),
            streak: streak,
            trend: trend,
            selected_hat: user.selected_hat,
            selected_avatar_frame: user.selected_avatar_frame,
            selected_text_color: user.selected_text_color,
            selected_background_effect: user.selected_background_effect,
            selected_badge: user.selected_badge
          }
        })
      )

      // حساب rank وpoints للمستخدم الحالي
      if (currentUserId) {
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, total_score, avatar_url')
          .order('total_score', { ascending: false })

        const currentUserIndex = allUsers?.findIndex(u => u.id === currentUserId) ?? -1
        setUserRank(currentUserIndex >= 0 ? currentUserIndex + 1 : null)

        const currentUser = allUsers?.find(u => u.id === currentUserId)
        setUserPoints(currentUser?.total_score || 0)
        setUserAvatar(currentUser?.avatar_url || '')

        // حساب streak للمستخدم الحالي
        const { data: userChallenges } = await supabase
          .from('user_challenges')
          .select('completed_at')
          .eq('user_id', currentUserId)
          .eq('status', 'completed')
          .gte('completed_at', oneWeekAgo.toISOString())

        setUserStreak(userChallenges?.length || 0)
      }

      // جلب إحصائيات إضافية
      const { data: allChallenges, error: statsError } = await supabase
        .from('user_challenges')
        .select('status, score')

      if (statsError) {
        console.error('Error fetching stats:', statsError)
      } else {
        const completedChallenges = allChallenges?.filter(c => c.status === 'completed') || []
        const activeUsers = usersWithChallenges?.length || 0

        setStats({
          activeDevelopers: activeUsers,
          challengesCompleted: completedChallenges.length,
          avgChallengesPerUser: activeUsers > 0 ? Math.round(completedChallenges.length / activeUsers) : 0
        })
      }

      setLeaderboard(usersWithChallenges || [])
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const handleAvatarError = (userId: string) => {
    setLeaderboard(prev => prev.map(user => 
      user.id === userId ? { ...user, avatarError: true } : user
    ))
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600'
      case 2:
        return 'from-gray-300 to-gray-500'
      case 3:
        return 'from-amber-400 to-amber-600'
      default:
        return 'from-primary to-secondary'
    }
  }

  const getTextColorClass = (colorIcon: string | null) => {
    if (!colorIcon) return 'text-foreground'
    
    switch (colorIcon) {
      case '✨': return 'text-yellow-400'
      case '🌈': return 'text-transparent bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 to-purple-400 bg-clip-text'
      case '⚡': return 'text-cyan-400'
      case '💎': return 'text-purple-400'
      default: return 'text-foreground'
    }
  }

  const getBackgroundEffectClass = (bgIcon: string | null) => {
    if (!bgIcon) return ''
    
    switch (bgIcon) {
      case '🌌': return 'bg-gradient-to-r from-purple-900/20 to-blue-900/20'
      case '🌅': return 'bg-gradient-to-r from-orange-900/20 to-pink-900/20'
      case '🎆': return 'bg-gradient-to-r from-red-900/20 to-yellow-900/20'
      case '🌌': return 'bg-gradient-to-r from-indigo-900/20 to-purple-900/20'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M50 50c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm-2 0c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8 8 3.6 8 8zm-8-6c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-secondary/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-accent/10 rounded-full blur-xl animate-pulse delay-500"></div>
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-primary/5 rounded-full blur-xl animate-pulse delay-2000"></div>

      {/* Trophy Background Elements */}
      <div className="absolute top-10 right-10 opacity-10">
        <div className="text-6xl">🏆</div>
      </div>
      <div className="absolute bottom-10 left-10 opacity-10">
        <div className="text-4xl">⭐</div>
      </div>
      <div className="absolute top-1/2 right-10 opacity-5">
        <div className="text-5xl">🎯</div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl mb-8 shadow-2xl shadow-primary/25 animate-pulse">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text">Global Leaderboard</h1>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Compete with developers worldwide and climb the ranks
          </p>
          <div className="flex items-center justify-center space-x-8 mt-6">
            <div className="flex items-center space-x-2 text-sm text-primary">
              <Crown className="w-5 h-5" />
              <span>Top Performers</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-secondary">
              <TrendingUp className="w-5 h-5" />
              <span>Real-time Updates</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-accent">
              <Star className="w-5 h-5" />
              <span>Weekly Streaks</span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="glass p-8 rounded-3xl text-center hover-lift shadow-2xl border border-primary/10 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div className="text-4xl font-bold gradient-text mb-3">{stats.activeDevelopers.toLocaleString()}</div>
            <div className="text-lg text-muted-foreground font-medium">Active Developers</div>
            <div className="text-sm text-muted-foreground mt-2">Coding together worldwide</div>
          </div>
          <div className="glass p-8 rounded-3xl text-center hover-lift shadow-2xl border border-secondary/10 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-secondary to-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="text-4xl font-bold gradient-text mb-3">{stats.challengesCompleted.toLocaleString()}</div>
            <div className="text-lg text-muted-foreground font-medium">Challenges Completed</div>
            <div className="text-sm text-muted-foreground mt-2">Problems solved</div>
          </div>
          <div className="glass p-8 rounded-3xl text-center hover-lift shadow-2xl border border-accent/10 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div className="text-4xl font-bold gradient-text mb-3">{stats.avgChallengesPerUser}</div>
            <div className="text-lg text-muted-foreground font-medium">Avg Challenges/User</div>
            <div className="text-sm text-muted-foreground mt-2">Average engagement</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass rounded-3xl overflow-hidden shadow-2xl border border-primary/10">
          <div className="p-8 border-b border-border/50 bg-gradient-to-r from-card/80 to-card/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold gradient-text">Top Performers</h2>
                  <p className="text-muted-foreground">Updated in real-time • Competitive rankings</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Last updated</div>
                <div className="text-lg font-semibold">{currentTime || 'Loading...'}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2 gradient-text">Loading Leaderboard...</h3>
              <p className="text-muted-foreground">Fetching the latest rankings</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 gradient-text">No Users Yet</h3>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                Be the first to complete challenges and appear on the leaderboard!
              </p>
              <a
                href="/challenges"
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary via-secondary to-accent text-white px-8 py-4 rounded-2xl font-bold hover:shadow-glow transition-all hover-lift focus-ring shadow-2xl"
              >
                <Target className="w-6 h-6" />
                <span>Start Challenges</span>
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-card/80 to-card/60">
                  <tr className="border-b border-border/50">
                    <th className="text-left py-6 px-8 font-bold text-lg gradient-text">Rank</th>
                    <th className="text-left py-6 px-8 font-bold text-lg gradient-text">Developer</th>
                    <th className="text-left py-6 px-8 font-bold text-lg gradient-text">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((user, index) => {
                    const rank = index + 1
                    return (
                      <tr
                        key={user.id}
                        className={`border-b border-border/30 hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 transition-all duration-300 hover:shadow-lg ${getBackgroundEffectClass(user.selected_background_effect)}`}
                      >
                        <td className="py-6 px-8">
                          <div className="flex items-center space-x-4">
                            {getRankIcon(rank)}
                            {rank <= 3 && (
                              <div className={`w-10 h-10 bg-gradient-to-br ${getRankColor(rank)} rounded-2xl flex items-center justify-center shadow-lg animate-pulse`}>
                                <span className="text-white font-bold text-lg">{rank}</span>
                              </div>
                            )}
                            <span className="text-2xl font-bold text-muted-foreground">#{rank}</span>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              {/* Avatar Frame */}
                              {user.selected_avatar_frame && (
                                <div className="absolute inset-0 rounded-2xl p-1">
                                  <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl"></div>
                                </div>
                              )}
                              
                              {/* Avatar */}
                              {user.avatar && user.avatar.startsWith('http') && !user.avatarError ? (
                                <Image
                                  src={user.avatar}
                                  alt={user.name || user.email}
                                  width={48}
                                  height={48}
                                  className="relative w-12 h-12 rounded-2xl object-cover border-2 border-primary/20 shadow-lg"
                                  onError={() => handleAvatarError(user.id)}
                                />
                              ) : (
                                <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                  {user.avatar && !user.avatar.startsWith('http') ? user.avatar : (user.name || user.email)[0].toUpperCase()}
                                </div>
                              )}
                              
                              {/* Hat */}
                              {user.selected_hat && (
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-primary/20">
                                  <span className="text-lg">{user.selected_hat}</span>
                                </div>
                              )}
                              
                              {/* Badge */}
                              {user.selected_badge && (
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                  <span className="text-sm">{user.selected_badge}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className={`font-bold text-lg ${getTextColorClass(user.selected_text_color)}`}>
                                {user.name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center space-x-1">
                                <Star className="w-3 h-3" />
                                <span>Level {Math.floor(user.total_score / 300) + 1}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-8">
                          <div className="text-2xl font-bold gradient-text">{user.total_score.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">points</div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Your Rank Card */}
        <div className="mt-12 glass p-8 rounded-3xl shadow-2xl border border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {userAvatar && !userAvatar.includes('error') ? (
                <Image
                  src={userAvatar}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-primary/20 shadow-lg"
                  onError={() => setUserAvatar('')}
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">{user?.email?.[0].toUpperCase() || 'U'}</span>
                </div>
              )}
              <div>
                <div className="text-xl font-bold gradient-text mb-1">Your Rank</div>
                <div className="text-muted-foreground flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Current streak: {userStreak} days</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Keep solving challenges to climb higher!
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold gradient-text mb-2">
                {userRank ? `#${userRank}` : 'Unranked'}
              </div>
              <div className="text-xl text-muted-foreground">
                {userPoints.toLocaleString()} points
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total score
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="glass p-12 rounded-3xl shadow-2xl border border-secondary/10">
            <div className="w-20 h-20 bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl lg:text-4xl font-bold mb-6 gradient-text">
              {leaderboard.length > 0 ? 'Ready to Climb the Ranks?' : 'Be the First Champion!'}
            </h3>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {leaderboard.length > 0 
                ? 'Start solving challenges and watch your ranking improve with each completed task. Join the competitive coding community!'
                : 'Complete your first challenge and become the top developer on our leaderboard!'
              }
            </p>
            <a
              href="/challenges"
              className="inline-flex items-center space-x-4 bg-gradient-to-r from-primary via-secondary to-accent text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-glow transition-all hover-lift focus-ring shadow-2xl transform hover:scale-105"
            >
              <Target className="w-6 h-6" />
              <span>Start Challenges</span>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}