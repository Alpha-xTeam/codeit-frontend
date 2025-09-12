'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { User } from '@supabase/supabase-js'
import { ShoppingCart, Star, Zap, CheckCircle, XCircle, Coins } from 'lucide-react'

interface StoreItem {
  id: string
  name: string
  description: string
  price: number
  icon: string
  category: string
  available: boolean
}

interface PurchasedItem {
  item_id: string
  purchased_at: string
}

export default function StorePage() {
  const [user, setUser] = useState<User | null>(null)
  const [userPoints, setUserPoints] = useState(0)
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [selectedHat, setSelectedHat] = useState<string | null>(null)
  const [selectedAvatarFrame, setSelectedAvatarFrame] = useState<string | null>(null)
  const [selectedTextColor, setSelectedTextColor] = useState<string | null>(null)
  const [selectedBackgroundEffect, setSelectedBackgroundEffect] = useState<string | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // عناصر المتجر المتاحة
  const defaultItems: StoreItem[] = [
    // Hats
    {
      id: 'crown_hat',
      name: 'Golden Crown Hat',
      description: 'A golden crown hat that appears on the leaderboard',
      price: 500,
      icon: '👑',
      category: 'hats',
      available: true
    },
    {
      id: 'star_hat',
      name: 'Magic Star Hat',
      description: 'A magical star hat that appears on the leaderboard',
      price: 300,
      icon: '⭐',
      category: 'hats',
      available: true
    },
    {
      id: 'fire_hat',
      name: 'Fire Hat',
      description: 'A fire hat that appears on the leaderboard',
      price: 400,
      icon: '🔥',
      category: 'hats',
      available: true
    },
    {
      id: 'diamond_hat',
      name: 'Diamond Hat',
      description: 'A diamond hat that appears on the leaderboard',
      price: 600,
      icon: '💎',
      category: 'hats',
      available: true
    },
    {
      id: 'rocket_hat',
      name: 'Rocket Hat',
      description: 'A rocket hat that appears on the leaderboard',
      price: 450,
      icon: '🚀',
      category: 'hats',
      available: true
    },
    // Avatar Frames
    {
      id: 'golden_frame',
      name: 'Golden Avatar Frame',
      description: 'A luxurious golden frame around your avatar',
      price: 350,
      icon: '🖼️',
      category: 'frames',
      available: true
    },
    {
      id: 'rainbow_frame',
      name: 'Rainbow Avatar Frame',
      description: 'A colorful rainbow frame around your avatar',
      price: 400,
      icon: '🌈',
      category: 'frames',
      available: true
    },
    {
      id: 'diamond_frame',
      name: 'Diamond Avatar Frame',
      description: 'A sparkling diamond frame around your avatar',
      price: 550,
      icon: '💎',
      category: 'frames',
      available: true
    },
    {
      id: 'fire_frame',
      name: 'Fire Avatar Frame',
      description: 'A flaming fire frame around your avatar',
      price: 450,
      icon: '🔥',
      category: 'frames',
      available: true
    },
    // Text Colors
    {
      id: 'golden_text',
      name: 'Golden Text Color',
      description: 'Make your name appear in golden color',
      price: 200,
      icon: '✨',
      category: 'colors',
      available: true
    },
    {
      id: 'rainbow_text',
      name: 'Rainbow Text Color',
      description: 'Make your name appear in rainbow colors',
      price: 300,
      icon: '🌈',
      category: 'colors',
      available: true
    },
    {
      id: 'neon_text',
      name: 'Neon Text Color',
      description: 'Make your name glow with neon effect',
      price: 250,
      icon: '⚡',
      category: 'colors',
      available: true
    },
    {
      id: 'diamond_text',
      name: 'Diamond Text Color',
      description: 'Make your name sparkle like diamonds',
      price: 350,
      icon: '💎',
      category: 'colors',
      available: true
    },
    // Background Effects
    {
      id: 'starfield_bg',
      name: 'Starfield Background',
      description: 'Animated starfield background effect',
      price: 600,
      icon: '🌌',
      category: 'backgrounds',
      available: true
    },
    {
      id: 'aurora_bg',
      name: 'Aurora Background',
      description: 'Beautiful aurora light background effect',
      price: 700,
      icon: '🌅',
      category: 'backgrounds',
      available: true
    },
    {
      id: 'fireworks_bg',
      name: 'Fireworks Background',
      description: 'Celebration fireworks background effect',
      price: 800,
      icon: '🎆',
      category: 'backgrounds',
      available: true
    },
    {
      id: 'galaxy_bg',
      name: 'Galaxy Background',
      description: 'Spiral galaxy background effect',
      price: 650,
      icon: '🌌',
      category: 'backgrounds',
      available: true
    },
    // Special Badges
    {
      id: 'champion_badge',
      name: 'Champion Badge',
      description: 'Show off your champion status',
      price: 1000,
      icon: '🏆',
      category: 'badges',
      available: true
    },
    {
      id: 'master_coder_badge',
      name: 'Master Coder Badge',
      description: 'Display your mastery in coding',
      price: 900,
      icon: '👨‍💻',
      category: 'badges',
      available: true
    },
    {
      id: 'speed_demon_badge',
      name: 'Speed Demon Badge',
      description: 'Show your lightning-fast coding skills',
      price: 750,
      icon: '⚡',
      category: 'badges',
      available: true
    },
    {
      id: 'perfectionist_badge',
      name: 'Perfectionist Badge',
      description: 'Demonstrate your attention to detail',
      price: 850,
      icon: '🎯',
      category: 'badges',
      available: true
    }
  ]

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setLoading(true)

      // جلب النقاط والإعدادات المختارة
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('total_score, selected_hat, selected_avatar_frame, selected_text_color, selected_background_effect, selected_badge')
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('Error fetching user points:', userError)
      } else {
        setUserPoints(userData?.total_score || 0)
        setSelectedHat(userData?.selected_hat || null)
        setSelectedAvatarFrame(userData?.selected_avatar_frame || null)
        setSelectedTextColor(userData?.selected_text_color || null)
        setSelectedBackgroundEffect(userData?.selected_background_effect || null)
        setSelectedBadge(userData?.selected_badge || null)
      }

      // جلب العناصر المشتراة
      const { data: purchases, error: purchasesError } = await supabase
        .from('user_purchases')
        .select('item_id, purchased_at')
        .eq('user_id', userId)

      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError)
      } else {
        setPurchasedItems(purchases || [])
      }

      setStoreItems(defaultItems)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }, [setUserPoints, setSelectedHat, setSelectedAvatarFrame, setSelectedTextColor, setSelectedBackgroundEffect, setSelectedBadge, setPurchasedItems, setStoreItems, setLoading])

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchUserData(session.user.id)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchUserData(session.user.id)
        } else {
          setUserPoints(0)
          setPurchasedItems([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserData])

  const purchaseItem = async (item: StoreItem) => {
    if (!user) return
    if (userPoints < item.price) {
            setMessage({ type: 'error', text: 'You don&apos;t have enough points!' })
      return
    }

    setPurchasing(item.id)

    try {
      // خصم النقاط
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_score: userPoints - item.price })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating points:', updateError)
        setMessage({ type: 'error', text: 'Error updating points' })
        return
      }

      // إضافة المشترى
      const { error: purchaseError } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          item_id: item.id,
          purchased_at: new Date().toISOString()
        })

      if (purchaseError) {
        console.error('Error recording purchase:', purchaseError)
        setMessage({ type: 'error', text: 'Error recording purchase' })
        return
      }

      // تحديث الحالة
      setUserPoints(prev => prev - item.price)
      setPurchasedItems(prev => [...prev, { item_id: item.id, purchased_at: new Date().toISOString() }])
      setMessage({ type: 'success', text: `${item.name} purchased successfully!` })

      // إخفاء الرسالة بعد 3 ثوان
      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error purchasing item:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setPurchasing(null)
    }
  }

  const isItemPurchased = (itemId: string) => {
    return purchasedItems.some(purchase => purchase.item_id === itemId)
  }

  const selectHat = async (hatIcon: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ selected_hat: hatIcon })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating selected hat:', error)
        setMessage({ type: 'error', text: 'Error updating selected hat' })
        return
      }

      setSelectedHat(hatIcon)
      setMessage({ type: 'success', text: hatIcon ? 'Selected hat updated!' : 'Hat removed!' })

      // إخفاء الرسالة بعد 3 ثوان
      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error selecting hat:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
  }

  const selectAvatarFrame = async (frameIcon: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ selected_avatar_frame: frameIcon })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating selected frame:', error)
        setMessage({ type: 'error', text: 'Error updating selected frame' })
        return
      }

      setSelectedAvatarFrame(frameIcon)
      setMessage({ type: 'success', text: frameIcon ? 'Selected frame updated!' : 'Frame removed!' })

      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error selecting frame:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
  }

  const selectTextColor = async (colorIcon: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ selected_text_color: colorIcon })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating selected text color:', error)
        setMessage({ type: 'error', text: 'Error updating selected text color' })
        return
      }

      setSelectedTextColor(colorIcon)
      setMessage({ type: 'success', text: colorIcon ? 'Selected text color updated!' : 'Text color removed!' })

      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error selecting text color:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
  }

  const selectBackgroundEffect = async (bgIcon: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ selected_background_effect: bgIcon })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating selected background effect:', error)
        setMessage({ type: 'error', text: 'Error updating selected background effect' })
        return
      }

      setSelectedBackgroundEffect(bgIcon)
      setMessage({ type: 'success', text: bgIcon ? 'Selected background effect updated!' : 'Background effect removed!' })

      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error selecting background effect:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
  }

  const getPurchasedHats = () => {
    return storeItems
      .filter(item => item.category === 'hats' && isItemPurchased(item.id))
      .map(item => item.icon)
  }

  const getPurchasedFrames = () => {
    return storeItems
      .filter(item => item.category === 'frames' && isItemPurchased(item.id))
      .map(item => item.icon)
  }

  const getPurchasedColors = () => {
    return storeItems
      .filter(item => item.category === 'colors' && isItemPurchased(item.id))
      .map(item => item.icon)
  }

  const getPurchasedBackgrounds = () => {
    return storeItems
      .filter(item => item.category === 'backgrounds' && isItemPurchased(item.id))
      .map(item => item.icon)
  }

  const getPurchasedBadges = () => {
    return storeItems
      .filter(item => item.category === 'badges' && isItemPurchased(item.id))
      .map(item => item.icon)
  }

  const getHatIcon = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'hats')
    return item ? item.icon : '🎩'
  }

  const getHatName = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'hats')
    return item ? item.name : 'Unknown Hat'
  }

  const getFrameIcon = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'frames')
    return item ? item.icon : '👤'
  }

  const getFrameName = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'frames')
    return item ? item.name : 'Unknown Frame'
  }

  const getColorIcon = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'colors')
    return item ? item.icon : '🎨'
  }

  const getColorName = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'colors')
    return item ? item.name : 'Unknown Color'
  }

  const getBackgroundIcon = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'backgrounds')
    return item ? item.icon : '🌟'
  }

  const getBackgroundName = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'backgrounds')
    return item ? item.name : 'Unknown Background'
  }

  const getBadgeIcon = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'badges')
    return item ? item.icon : '🏆'
  }

  const getBadgeName = (icon: string) => {
    const item = storeItems.find(item => item.icon === icon && item.category === 'badges')
    return item ? item.name : 'Unknown Badge'
  }

  const selectBadge = async (badgeIcon: string | null) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ selected_badge: badgeIcon })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating selected badge:', error)
        setMessage({ type: 'error', text: 'Error updating selected badge' })
        return
      }

      setSelectedBadge(badgeIcon)
      setMessage({ type: 'success', text: badgeIcon ? 'Selected badge updated!' : 'Badge removed!' })

      setTimeout(() => setMessage(null), 3000)

    } catch (error) {
      console.error('Error selecting badge:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4 gradient-text">Login Required</h1>
          <p className="text-muted-foreground mb-8">Please log in to access the store</p>
          <a
            href="/login"
            className="bg-gradient-to-r from-primary to-secondary text-white px-8 py-4 rounded-2xl font-bold hover:shadow-glow transition-all"
          >
            Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-secondary/10 rounded-full blur-xl animate-pulse delay-1000"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl mb-8 shadow-2xl">
            <ShoppingCart className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text">Store</h1>
          <p className="text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Purchase exclusive items using your points
          </p>
        </div>

        {/* User Points */}
        <div className="glass p-6 rounded-3xl mb-12 text-center shadow-2xl border border-primary/10">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text">{userPoints.toLocaleString()}</div>
              <div className="text-muted-foreground">Available Points</div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`glass p-6 rounded-3xl mb-8 text-center shadow-2xl border ${
            message.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'
          }`}>
            <div className="flex items-center justify-center space-x-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <span className={`text-lg font-medium ${
                message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {message.text}
              </span>
            </div>
          </div>
        )}

        {/* Store Items */}
        <div className="space-y-16">
          {/* Hats Section */}
          <div>
            <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Hats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {storeItems.filter(item => item.category === 'hats').map((item) => {
                const purchased = isItemPurchased(item.id)
                const canAfford = userPoints >= item.price

                return (
                  <div
                    key={item.id}
                    className={`glass p-8 rounded-3xl shadow-2xl border transition-all duration-300 hover-lift ${
                      purchased ? 'border-green-500/20 bg-green-500/5' : 'border-primary/10'
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <h3 className="text-2xl font-bold mb-2 gradient-text">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.price}
                      </span>
                    </div>

                    {purchased ? (
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl font-medium">
                          <CheckCircle className="w-5 h-5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all hover-lift focus-ring shadow-xl ${
                          canAfford
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Purchasing...</span>
                          </div>
                        ) : canAfford ? (
                          'Buy Now'
                        ) : (
                          'Insufficient Points'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Avatar Frames Section */}
          <div>
            <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Avatar Frames</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {storeItems.filter(item => item.category === 'frames').map((item) => {
                const purchased = isItemPurchased(item.id)
                const canAfford = userPoints >= item.price

                return (
                  <div
                    key={item.id}
                    className={`glass p-8 rounded-3xl shadow-2xl border transition-all duration-300 hover-lift ${
                      purchased ? 'border-green-500/20 bg-green-500/5' : 'border-primary/10'
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <h3 className="text-2xl font-bold mb-2 gradient-text">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.price}
                      </span>
                    </div>

                    {purchased ? (
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl font-medium">
                          <CheckCircle className="w-5 h-5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all hover-lift focus-ring shadow-xl ${
                          canAfford
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Purchasing...</span>
                          </div>
                        ) : canAfford ? (
                          'Buy Now'
                        ) : (
                          'Insufficient Points'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Text Colors Section */}
          <div>
            <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Text Colors</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {storeItems.filter(item => item.category === 'colors').map((item) => {
                const purchased = isItemPurchased(item.id)
                const canAfford = userPoints >= item.price

                return (
                  <div
                    key={item.id}
                    className={`glass p-8 rounded-3xl shadow-2xl border transition-all duration-300 hover-lift ${
                      purchased ? 'border-green-500/20 bg-green-500/5' : 'border-primary/10'
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <h3 className="text-2xl font-bold mb-2 gradient-text">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.price}
                      </span>
                    </div>

                    {purchased ? (
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl font-medium">
                          <CheckCircle className="w-5 h-5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all hover-lift focus-ring shadow-xl ${
                          canAfford
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Purchasing...</span>
                          </div>
                        ) : canAfford ? (
                          'Buy Now'
                        ) : (
                          'Insufficient Points'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Background Effects Section */}
          <div>
            <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Background Effects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {storeItems.filter(item => item.category === 'backgrounds').map((item) => {
                const purchased = isItemPurchased(item.id)
                const canAfford = userPoints >= item.price

                return (
                  <div
                    key={item.id}
                    className={`glass p-8 rounded-3xl shadow-2xl border transition-all duration-300 hover-lift ${
                      purchased ? 'border-green-500/20 bg-green-500/5' : 'border-primary/10'
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <h3 className="text-2xl font-bold mb-2 gradient-text">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.price}
                      </span>
                    </div>

                    {purchased ? (
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl font-medium">
                          <CheckCircle className="w-5 h-5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all hover-lift focus-ring shadow-xl ${
                          canAfford
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Purchasing...</span>
                          </div>
                        ) : canAfford ? (
                          'Buy Now'
                        ) : (
                          'Insufficient Points'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Badges Section */}
          <div>
            <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Special Badges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {storeItems.filter(item => item.category === 'badges').map((item) => {
                const purchased = isItemPurchased(item.id)
                const canAfford = userPoints >= item.price

                return (
                  <div
                    key={item.id}
                    className={`glass p-8 rounded-3xl shadow-2xl border transition-all duration-300 hover-lift ${
                      purchased ? 'border-green-500/20 bg-green-500/5' : 'border-primary/10'
                    }`}
                  >
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">{item.icon}</div>
                      <h3 className="text-2xl font-bold mb-2 gradient-text">{item.name}</h3>
                      <p className="text-muted-foreground mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-center space-x-2 mb-6">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {item.price}
                      </span>
                    </div>

                    {purchased ? (
                      <div className="text-center">
                        <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl font-medium">
                          <CheckCircle className="w-5 h-5" />
                          <span>Purchased</span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford || purchasing === item.id}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all hover-lift focus-ring shadow-xl ${
                          canAfford
                            ? 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-glow'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            <span>Purchasing...</span>
                          </div>
                        ) : canAfford ? (
                          'Buy Now'
                        ) : (
                          'Insufficient Points'
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Customization Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold mb-8 gradient-text text-center">Customize Your Profile</h2>
          <div className="space-y-12">
            {/* Selected Hat */}
            <div className="glass p-8 rounded-3xl shadow-2xl border border-primary/10">
              <h3 className="text-2xl font-bold mb-6 gradient-text">Selected Hat</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedHat ? getHatIcon(selectedHat) : '🎩'}</div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedHat ? getHatName(selectedHat) : 'Default Hat'}
                    </p>
                    <p className="text-muted-foreground">Your current hat selection</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => selectHat(null)}
                    className={`p-3 rounded-2xl transition-all hover-lift ${
                      selectedHat === null
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌
                  </button>
                  {getPurchasedHats().map((hatId) => (
                    <button
                      key={hatId}
                      onClick={() => selectHat(hatId)}
                      className={`p-3 rounded-2xl transition-all hover-lift ${
                        selectedHat === hatId
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getHatIcon(hatId)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Avatar Frame */}
            <div className="glass p-8 rounded-3xl shadow-2xl border border-primary/10">
              <h3 className="text-2xl font-bold mb-6 gradient-text">Selected Avatar Frame</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedAvatarFrame ? getFrameIcon(selectedAvatarFrame) : '👤'}</div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedAvatarFrame ? getFrameName(selectedAvatarFrame) : 'Default Frame'}
                    </p>
                    <p className="text-muted-foreground">Your current frame selection</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => selectAvatarFrame(null)}
                    className={`p-3 rounded-2xl transition-all hover-lift ${
                      selectedAvatarFrame === null
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌
                  </button>
                  {getPurchasedFrames().map((frameId) => (
                    <button
                      key={frameId}
                      onClick={() => selectAvatarFrame(frameId)}
                      className={`p-3 rounded-2xl transition-all hover-lift ${
                        selectedAvatarFrame === frameId
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getFrameIcon(frameId)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Text Color */}
            <div className="glass p-8 rounded-3xl shadow-2xl border border-primary/10">
              <h3 className="text-2xl font-bold mb-6 gradient-text">Selected Text Color</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedTextColor ? getColorIcon(selectedTextColor) : '🎨'}</div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedTextColor ? getColorName(selectedTextColor) : 'Default Color'}
                    </p>
                    <p className="text-muted-foreground">Your current text color selection</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => selectTextColor(null)}
                    className={`p-3 rounded-2xl transition-all hover-lift ${
                      selectedTextColor === null
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌
                  </button>
                  {getPurchasedColors().map((colorId) => (
                    <button
                      key={colorId}
                      onClick={() => selectTextColor(colorId)}
                      className={`p-3 rounded-2xl transition-all hover-lift ${
                        selectedTextColor === colorId
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getColorIcon(colorId)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Background Effect */}
            <div className="glass p-8 rounded-3xl shadow-2xl border border-primary/10">
              <h3 className="text-2xl font-bold mb-6 gradient-text">Selected Background Effect</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedBackgroundEffect ? getBackgroundIcon(selectedBackgroundEffect) : '🌟'}</div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedBackgroundEffect ? getBackgroundName(selectedBackgroundEffect) : 'Default Background'}
                    </p>
                    <p className="text-muted-foreground">Your current background effect selection</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => selectBackgroundEffect(null)}
                    className={`p-3 rounded-2xl transition-all hover-lift ${
                      selectedBackgroundEffect === null
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌
                  </button>
                  {getPurchasedBackgrounds().map((bgId) => (
                    <button
                      key={bgId}
                      onClick={() => selectBackgroundEffect(bgId)}
                      className={`p-3 rounded-2xl transition-all hover-lift ${
                        selectedBackgroundEffect === bgId
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getBackgroundIcon(bgId)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Badge */}
            <div className="glass p-8 rounded-3xl shadow-2xl border border-primary/10">
              <h3 className="text-2xl font-bold mb-6 gradient-text">Selected Badge</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{selectedBadge ? getBadgeIcon(selectedBadge) : '🏆'}</div>
                  <div>
                    <p className="text-lg font-medium">
                      {selectedBadge ? getBadgeName(selectedBadge) : 'Default Badge'}
                    </p>
                    <p className="text-muted-foreground">Your current badge selection</p>
                  </div>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={() => selectBadge(null)}
                    className={`p-3 rounded-2xl transition-all hover-lift ${
                      selectedBadge === null
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    ❌
                  </button>
                  {getPurchasedBadges().map((badgeId) => (
                    <button
                      key={badgeId}
                      onClick={() => selectBadge(badgeId)}
                      className={`p-3 rounded-2xl transition-all hover-lift ${
                        selectedBadge === badgeId
                          ? 'bg-primary text-white shadow-glow'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {getBadgeIcon(badgeId)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 glass p-12 rounded-3xl shadow-2xl border border-secondary/10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-6 gradient-text">How to Earn Points?</h3>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Earn points by solving programming challenges on the challenges page.
            Each successful challenge gives you points that can be used in the store.
          </p>
          <a
            href="/challenges"
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary via-secondary to-accent text-white px-8 py-4 rounded-2xl font-bold hover:shadow-glow transition-all hover-lift focus-ring"
          >
            <Zap className="w-6 h-6" />
            <span>Start Challenges</span>
          </a>
        </div>
      </div>
    </div>
  )
}