'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { CheckCircle, XCircle, Code, FileText, Target, Zap, AlertTriangle, Lightbulb, Settings, ZoomIn, ZoomOut, Palette, AlignLeft, Save, RotateCcw } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import * as monaco from 'monaco-editor'

declare global {
  interface Window {
    updateUserPoints?: (points: number) => void;
  }
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  points: number;
  code: string;
  created_at: string;
}

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

interface MaliciousPattern {
  line: number;
  message: string;
}

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const languages = [
  { id: 'javascript', name: 'JavaScript', icon: '/icons/icons8-javascript-48.png' },
  { id: 'python', name: 'Python', icon: '/icons/icons8-python-48.png' },
  { id: 'java', name: 'Java', icon: '/icons/icons8-java-logo-48.png' },
  { id: 'cpp', name: 'C++', icon: '/icons/icons8-c++-48.png' },
]

export default function ChallengesPage() {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript')
  const [userCode, setUserCode] = useState<string>('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showHint, setShowHint] = useState(false)
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([])
  const [challenges, setChallenges] = useState<any[]>([])
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState<{[key: string]: number}>({
    javascript: 0,
    python: 0,
    java: 0,
    cpp: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  // Loading states
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Editor settings state
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    theme: 'custom-dark',
    wordWrap: 'on' as 'on' | 'off',
    minimap: false,
    showToolbar: true,
    autoSave: true,
    allowMaliciousPaste: false
  })
  const [showSearchReplace, setShowSearchReplace] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  // Typing statistics
  const [typingStats, setTypingStats] = useState({
    charactersTyped: 0,
    wordsTyped: 0,
    linesTyped: 0,
    errorsCount: 0,
    startTime: null as Date | null,
    typingSpeed: 0, // WPM
    accuracy: 100 // percentage
  })

  // Language-specific background elements
  const getLanguageBackgroundElements = (language: string) => {
    switch (language) {
      case 'javascript':
        return {
          bgColor: 'from-yellow-400/10 via-orange-400/10 to-red-400/10',
          floatingElements: [
            { icon: '/icons/icons8-javascript-48.png', filter: 'brightness-75 hue-rotate-15', size: 'w-8 h-8', position: 'top-20 left-20' },
            { icon: '/icons/icons8-javascript-48.png', filter: 'brightness-75 saturate-150', size: 'w-6 h-6', position: 'bottom-32 right-32' },
            { icon: '/icons/icons8-javascript-48.png', filter: 'brightness-75 contrast-125', size: 'w-10 h-10', position: 'top-1/2 left-1/4' },
          ],
          codeSnippet: `function hello() {\n  return "Hello JS!";\n}`
        }
      case 'python':
        return {
          bgColor: 'from-blue-400/10 via-green-400/10 to-yellow-400/10',
          floatingElements: [
            { icon: '/icons/icons8-python-48.png', filter: 'brightness-75 hue-rotate-120', size: 'w-8 h-8', position: 'top-20 right-20' },
            { icon: '/icons/icons8-python-48.png', filter: 'brightness-75 sepia-50', size: 'w-6 h-6', position: 'bottom-32 left-32' },
            { icon: '/icons/icons8-python-48.png', filter: 'brightness-75 opacity-80', size: 'w-10 h-10', position: 'top-1/3 right-1/4' },
          ],
          codeSnippet: `def hello():\n    return "Hello Python!"`
        }
      case 'java':
        return {
          bgColor: 'from-red-400/10 via-orange-400/10 to-yellow-400/10',
          floatingElements: [
            { icon: '/icons/icons8-java-logo-48.png', filter: 'brightness-75 hue-rotate-30', size: 'w-8 h-8', position: 'top-20 left-20' },
            { icon: '/icons/icons8-java-logo-48.png', filter: 'brightness-75 grayscale-20', size: 'w-6 h-6', position: 'bottom-32 right-32' },
            { icon: '/icons/icons8-java-logo-48.png', filter: 'brightness-75 invert-10', size: 'w-10 h-10', position: 'top-1/2 left-1/4' },
          ],
          codeSnippet: `public String hello() {\n    return "Hello Java!";\n}`
        }
      case 'cpp':
        return {
          bgColor: 'from-blue-400/10 via-purple-400/10 to-pink-400/10',
          floatingElements: [
            { icon: '/icons/icons8-c++-48.png', filter: 'brightness-75 hue-rotate-240', size: 'w-8 h-8', position: 'top-20 right-20' },
            { icon: '/icons/icons8-c++-48.png', filter: 'brightness-75 blur-px', size: 'w-6 h-6', position: 'bottom-32 left-32' },
            { icon: '/icons/icons8-c++-48.png', filter: 'brightness-75 drop-shadow-sm', size: 'w-10 h-10', position: 'top-1/3 right-1/4' },
          ],
          codeSnippet: `std::string hello() {\n    return "Hello C++!";\n}`
        }
      default:
        return {
          bgColor: 'from-primary/10 to-secondary/10',
          floatingElements: [],
          codeSnippet: ''
        }
    }
  }

  const languageElements = getLanguageBackgroundElements(selectedLanguage)

  // Function to fetch challenges from database
  const fetchChallenges = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: true })

      if (fetchError) {
        console.error('Error fetching challenges:', fetchError)
        setError('Failed to load challenges. Please try again.')
        return
      }

      setChallenges(data || [])
    } catch (err) {
      console.error('Error fetching challenges:', err)
      setError('Failed to load challenges. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch completed challenges from database
  const fetchCompletedChallenges = async () => {
    try {
      setLoadingCompleted(true)

      // Get user ID from localStorage or authentication
      const userId = localStorage.getItem('user_id')

      // If no valid user ID, skip fetching completed challenges
      if (!userId || userId === 'anonymous') {
        console.log('No valid user ID found, skipping completed challenges fetch')
        setCompletedChallenges([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_challenges')
        .select('challenge_id')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (fetchError) {
        console.error('Error fetching completed challenges:', fetchError)
        // Don't show error for completed challenges, just set empty array
        setCompletedChallenges([])
        return
      }

      // Extract challenge IDs from the results
      const completedIds = data?.map(item => item.challenge_id) || []
      setCompletedChallenges(completedIds)
    } catch (err) {
      console.error('Error fetching completed challenges:', err)
      setCompletedChallenges([])
    } finally {
      setLoadingCompleted(false)
    }
  }

  // Function to check and reload data if needed
  const checkAndReloadData = async () => {
    try {
      // Check if challenges data is valid
      if (!challenges || challenges.length === 0) {
        console.log('Challenges data is empty, reloading...')
        await fetchChallenges()
      }

      // Check if completed challenges data is valid
      if (completedChallenges.length === 0) {
        console.log('Completed challenges data is empty, reloading...')
        await fetchCompletedChallenges()
      }

      // Check if current challenge exists
      const currentLangChallenges = challenges.filter(challenge => challenge.language === selectedLanguage)
      const currentIndex = currentChallengeIndex[selectedLanguage] || 0
      
      if (!currentLangChallenges[currentIndex]) {
        console.log('Current challenge not found, resetting to first challenge...')
        setCurrentChallengeIndex(prev => ({
          ...prev,
          [selectedLanguage]: 0
        }))
      }
    } catch (error) {
      console.error('Error checking and reloading data:', error)
      // Show user-friendly error message
      toast.error('Failed to load data. Please refresh the page.', {
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: '❌',
      })
    }
  }

  // Load challenges and completed challenges on component mount
  useEffect(() => {
    fetchChallenges()
    fetchCompletedChallenges()
  }, [])

  // Handle page navigation and data reloading
  useEffect(() => {
    const handlePageNavigation = () => {
      // Check if we need to reload data
      if (!loading && challenges.length === 0) {
        console.log('Reloading challenges due to navigation...')
        checkAndReloadData()
      }
    }

    // Listen for navigation events
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again, check if data needs reloading
        handlePageNavigation()
      }
    }

    const handleFocus = () => {
      // Page gained focus, check if data needs reloading
      handlePageNavigation()
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loading, challenges.length])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      console.log('Browser navigation detected, reloading data...')
      fetchChallenges()
      fetchCompletedChallenges()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  const checkForMaliciousCode = (code: string, language: string): MaliciousPattern[] => {
    const maliciousPatterns: MaliciousPattern[] = []
    const lines = code.split('\n')

    lines.forEach((line, index) => {
      const lineNumber = index + 1

      switch (language) {
        case 'javascript':
          // Dangerous JavaScript functions and patterns
          if (/\beval\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: eval() function is not allowed - it can execute arbitrary code"
            })
          }
          if (/\bFunction\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Function constructor is not allowed - it can execute arbitrary code"
            })
          }
          if (/\bsetTimeout\s*\(\s*['"`]/.test(line) || /\bsetInterval\s*\(\s*['"`]/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Executing string code in timers is not allowed"
            })
          }
          if (/\bdocument\.write\s*\(/.test(line) || /\bdocument\.writeln\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: document.write is not allowed - it can modify the page content"
            })
          }
          if (/\blocalStorage\s*\.\s*setItem\s*\(/.test(line) || /\bsessionStorage\s*\.\s*setItem\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Modifying browser storage is not allowed"
            })
          }
          if (/\bXMLHttpRequest\s*\(/.test(line) || /\bfetch\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Network requests are not allowed"
            })
          }
          if (/\bimport\s*\(/.test(line) || /\brequire\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Dynamic imports are not allowed"
            })
          }
          break

        case 'python':
          // Dangerous Python functions and patterns
          if (/\bexec\s*\(/.test(line) || /\beval\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: exec() and eval() functions are not allowed - they can execute arbitrary code"
            })
          }
          if (/\bos\.system\s*\(/.test(line) || /\bos\.popen\s*\(/.test(line) || /\bsubprocess\./.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: System commands are not allowed"
            })
          }
          if (/\bimport\s+os\b/.test(line) || /\bfrom\s+os\s+import/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: OS module is not allowed - it can access system resources"
            })
          }
          if (/\bimport\s+subprocess\b/.test(line) || /\bfrom\s+subprocess\s+import/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: subprocess module is not allowed"
            })
          }
          if (/\bopen\s*\(/.test(line) && !/\bopen\s*\(\s*['"`]/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: File operations are not allowed"
            })
          }
          if (/\b__import__\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Dynamic imports are not allowed"
            })
          }
          if (/\binput\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: User input functions are not allowed"
            })
          }
          break

        case 'java':
          // Dangerous Java functions and patterns
          if (/\bRuntime\.getRuntime\(\)\.exec\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Runtime.exec() is not allowed - it can execute system commands"
            })
          }
          if (/\bProcessBuilder\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: ProcessBuilder is not allowed"
            })
          }
          if (/\bFile\s*\(/.test(line) || /\bFileInputStream\s*\(/.test(line) || /\bFileOutputStream\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: File operations are not allowed"
            })
          }
          if (/\bClass\.forName\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Dynamic class loading is not allowed"
            })
          }
          if (/\bSystem\.exit\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: System.exit() is not allowed"
            })
          }
          break

        case 'cpp':
          // Dangerous C++ functions and patterns
          if (/\bsystem\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: system() function is not allowed - it can execute system commands"
            })
          }
          if (/\bpopen\s*\(/.test(line) || /\b_execl\s*\(/.test(line) || /\b_execv\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Process execution functions are not allowed"
            })
          }
          if (/\bfopen\s*\(/.test(line) || /\bfprintf\s*\(/.test(line) || /\bfscanf\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: File operations are not allowed"
            })
          }
          if (/\bremove\s*\(/.test(line) || /\brename\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: File manipulation functions are not allowed"
            })
          }
          if (/\bmalloc\s*\(/.test(line) && /\bfree\s*\(/.test(line)) {
            maliciousPatterns.push({
              line: lineNumber,
              message: "⚠️ SECURITY VIOLATION: Manual memory management is restricted"
            })
          }
          break
      }

      // Cross-language dangerous patterns
      if (/\bdelete\s+/.test(line) && language === 'javascript') {
        maliciousPatterns.push({
          line: lineNumber,
          message: "⚠️ SECURITY VIOLATION: 'delete' operator is not allowed"
        })
      }

      if (/\bwindow\s*\.\s*/.test(line) || /\bdocument\s*\.\s*/.test(line)) {
        maliciousPatterns.push({
          line: lineNumber,
          message: "⚠️ SECURITY VIOLATION: Direct DOM manipulation is not allowed"
        })
      }

      // Check for suspicious strings that might contain malicious code
      if (line.includes('script') && (line.includes('<') || line.includes('>'))) {
        maliciousPatterns.push({
          line: lineNumber,
          message: "⚠️ SECURITY VIOLATION: HTML/script injection patterns detected"
        })
      }

      // Check for SQL-like patterns
      if (/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE)\b/i.test(line)) {
        maliciousPatterns.push({
          line: lineNumber,
          message: "⚠️ SECURITY VIOLATION: SQL commands are not allowed"
        })
      }
    })

    return maliciousPatterns
  }

  // Prevent copying code from the entire page
  useEffect(() => {
    const handleCopy = (e: Event) => {
      // Allow copying only from the editor if we allow it
      const target = e.target as HTMLElement
      if (target && target.closest('.monaco-editor')) {
        // You can allow copying from the editor if you want, but here we prevent it
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleCut = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleContextMenu = (e: Event) => {
      const target = e.target as HTMLElement
      // Allow context menu in some places if necessary
      if (target && target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Cmd+C on the entire page
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const target = e.target as HTMLElement
        if (target && target.closest('.monaco-editor')) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      // منع Ctrl+A لتحديد الكل
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    // Add event listeners
    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('keydown', handleKeyDown, true)

    // Cleanup when component unmounts
    return () => {
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('cut', handleCut, true)
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [])

  const getHint = (language: string): { basic: string, advanced: string, examples: string[] } => {
    switch (language) {
      case 'javascript':
        return {
          basic: 'JavaScript functions use the "function" keyword, followed by a name, parentheses (), and curly braces {}. Remember to use "return" to send back a result.',
          advanced: 'For string returns, use single or double quotes. Functions should be properly closed with matching braces.',
          examples: [
            'function hello() { return "Hello, World!"; }',
            'const greeting = () => "Hello, World!";',
            'function sayHello() { return \'Hello, World!\'; }'
          ]
        }
      case 'python':
        return {
          basic: 'Python functions use "def" keyword, followed by function name, parentheses (), and a colon. Code must be indented properly.',
          advanced: 'Python is sensitive to indentation. Use 4 spaces for each indentation level. Functions end when indentation returns to the previous level.',
          examples: [
            'def hello():\n    return "Hello, World!"',
            'def greeting():\n    message = "Hello, World!"\n    return message',
            'def say_hello():\n    return "Hello, World!"'
          ]
        }
      case 'java':
        return {
          basic: 'Java methods need public static modifiers, return type (String), method name, parentheses (), and curly braces {}.',
          advanced: 'Java is strongly typed - specify exact return types. Methods must be inside classes. Use proper semicolons.',
          examples: [
            'public static String hello() {\n    return "Hello, World!";\n}',
            'public static String greeting() {\n    String message = "Hello, World!";\n    return message;\n}',
            'public static String sayHello() {\n    return "Hello, World!";\n}'
          ]
        }
      case 'cpp':
        return {
          basic: 'C++ functions need return type (std::string), function name, parentheses (), and curly braces {}. Include necessary headers.',
          advanced: 'Use std::string for string returns. Functions must be properly declared and defined. Remember semicolons after statements.',
          examples: [
            'std::string hello() {\n    return "Hello, World!";\n}',
            'std::string greeting() {\n    std::string message = "Hello, World!";\n    return message;\n}',
            'std::string sayHello() {\n    return "Hello, World!";\n}'
          ]
        }
      default:
        return {
          basic: 'Check the expected code format and try to match it exactly',
          advanced: 'Pay attention to syntax rules for your chosen language',
          examples: []
        }
    }
  }

  // Editor control functions
  const increaseFontSize = () => {
    setEditorSettings(prev => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 2, 24)
    }))
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize: Math.min(editorSettings.fontSize + 2, 24) })
    }
  }

  const decreaseFontSize = () => {
    setEditorSettings(prev => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 2, 10)
    }))
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize: Math.max(editorSettings.fontSize - 2, 10) })
    }
  }

  const toggleTheme = () => {
    const newTheme = editorSettings.theme === 'custom-dark' ? 'vs-light' : 'custom-dark'
    setEditorSettings(prev => ({
      ...prev,
      theme: newTheme
    }))
    if (editorRef.current) {
      editorRef.current.updateOptions({ theme: newTheme })
    }
  }

  const toggleWordWrap = () => {
    const newWordWrap = editorSettings.wordWrap === 'on' ? 'off' : 'on'
    setEditorSettings(prev => ({
      ...prev,
      wordWrap: newWordWrap
    }))
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap: newWordWrap })
    }
  }

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run()
      toast.success('Code formatted successfully!', {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: '✨',
      })
    }
  }

  const saveCode = () => {
    // Save to localStorage for persistence
    localStorage.setItem(`challenge_${currentChallenge?.id}_code`, userCode)
    setLastSaved(new Date())
    toast.success('Code saved successfully!', {
      duration: 2000,
      style: {
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        color: '#fff',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: 'bold',
      },
      icon: '💾',
    })
  }

  const resetCode = () => {
    setUserCode('')
    setIsCorrect(null)
    setErrors([])
    setSuggestions([])
    toast.success('Code reset successfully!', {
      duration: 2000,
      style: {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#fff',
        borderRadius: '12px',
        padding: '16px',
        fontSize: '14px',
        fontWeight: 'bold',
      },
      icon: '🔄',
    })
  }

  const goToLine = (line: number) => {
    if (editorRef.current) {
      editorRef.current.revealLine(line)
      editorRef.current.setPosition({ lineNumber: line, column: 1 })
      editorRef.current.focus()
    }
  }

  const findAndReplace = () => {
    if (!editorRef.current || !searchText) return

    const model = editorRef.current.getModel()
    if (!model) return

    const matches = model.findMatches(searchText, false, false, false, null, false)
    if (matches.length > 0) {
      model.pushEditOperations([], [{
        range: matches[0].range,
        text: replaceText
      }], () => null)

      toast.success(`Replaced ${matches.length} occurrence(s)!`, {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: '🔍',
      })
    } else {
      toast.error('No matches found!', {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 'bold',
        },
        icon: '❌',
      })
    }
  }

  const updateTypingStats = (newCode: string) => {
    const now = new Date()
    const timeDiff = typingStats.startTime ? (now.getTime() - typingStats.startTime.getTime()) / 1000 / 60 : 0 // minutes

    // Count words (approximate)
    const words = newCode.trim().split(/\s+/).filter(word => word.length > 0).length
    const lines = newCode.split('\n').length

    // Calculate typing speed (WPM)
    const typingSpeed = timeDiff > 0 ? Math.round(words / timeDiff) : 0

    // Calculate accuracy (simple approximation)
    const totalChars = newCode.length
    const currentErrors = errors.length
    const accuracy = totalChars > 0 ? Math.max(0, Math.round(((totalChars - currentErrors) / totalChars) * 100)) : 100

    setTypingStats(prev => ({
      ...prev,
      charactersTyped: newCode.length,
      wordsTyped: words,
      linesTyped: lines,
      errorsCount: currentErrors,
      startTime: prev.startTime || now,
      typingSpeed,
      accuracy
    }))
  }

  // Get current challenge based on selected language and current index
  const currentChallenge = challenges.filter(challenge => challenge.language === selectedLanguage)[currentChallengeIndex[selectedLanguage]] || null
  const currentLang = languages.find(lang => lang.id === selectedLanguage)

  // Get challenges for current language
  const languageChallenges = challenges.filter(challenge => challenge.language === selectedLanguage)

  // Auto-save functionality
  useEffect(() => {
    if (editorSettings.autoSave && userCode && currentChallenge) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`challenge_${currentChallenge.id}_code`, userCode)
        setLastSaved(new Date())
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId)
    }
  }, [userCode, currentChallenge, editorSettings.autoSave])

  // Load saved code when challenge changes
  useEffect(() => {
    if (currentChallenge && editorSettings.autoSave) {
      const savedCode = localStorage.getItem(`challenge_${currentChallenge.id}_code`)
      if (savedCode && !userCode) {
        setUserCode(savedCode)
      }
    }
  }, [currentChallenge, editorSettings.autoSave])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveCode()
      }

      // Ctrl/Cmd + Shift + F: Format
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        formatCode()
      }

      // Ctrl/Cmd + F: Toggle search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
        e.preventDefault()
        setShowSearchReplace(!showSearchReplace)
      }

      // Ctrl/Cmd + Shift + R: Reset
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        resetCode()
      }

      // Ctrl/Cmd + Plus/Minus: Font size
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        increaseFontSize()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        decreaseFontSize()
      }

      // Ctrl/Cmd + Shift + T: Toggle theme
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        toggleTheme()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSearchReplace])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Code className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold gradient-text mb-2">Loading Challenges...</h2>
          <p className="text-muted-foreground">Please wait while we fetch the latest challenges</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-error to-error/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-error mb-2">Failed to Load Challenges</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchChallenges}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Show no challenges available
  if (!currentChallenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-warning to-warning/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-warning mb-2">No Challenges Available</h2>
          <p className="text-muted-foreground mb-4">No challenges are currently available for {currentLang?.name}. Please check back later.</p>
          <button
            onClick={fetchChallenges}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
          >
            Refresh
          </button>
        </div>
      </div>
    )
  }

  // Real-time code validation
  const validateCode = (code: string) => {
    const newErrors: ValidationError[] = []
    const newSuggestions: string[] = []

    if (!code.trim()) {
      newSuggestions.push("Start writing your code!")
      setErrors(newErrors)
      setSuggestions(newSuggestions)
      return
    }

    // Check for malicious/dangerous code patterns
    const maliciousPatterns = checkForMaliciousCode(code, selectedLanguage)
    if (maliciousPatterns.length > 0) {
      maliciousPatterns.forEach(pattern => {
        newErrors.push({
          line: pattern.line,
          message: pattern.message,
          severity: 'error'
        })
      })
    }

    // Language-specific validation
    switch (selectedLanguage) {
      case 'javascript':
        // Check for common JavaScript errors
        if (code.includes('function') && !code.includes('return')) {
          newErrors.push({
            line: 1,
            message: "Function should return a value",
            severity: 'error'
          })
        }
        if (code.includes('console.log') && !code.includes('return')) {
          newSuggestions.push("Consider returning the result instead of just logging it")
        }
        if (code.includes('var ')) {
          newSuggestions.push("Consider using 'const' or 'let' instead of 'var'")
        }
        break

      case 'python':
        // Check for common Python errors
        if (code.includes('def ') && !code.includes('return')) {
          newErrors.push({
            line: 1,
            message: "Function should return a value",
            severity: 'error'
          })
        }
        if (code.includes('print(') && !code.includes('return')) {
          newSuggestions.push("Consider returning the result instead of just printing it")
        }
        if (!code.includes(':')) {
          newErrors.push({
            line: 1,
            message: "Function definition needs a colon",
            severity: 'error'
          })
        }
        break

      case 'java':
        // Check for common Java errors
        if (code.includes('public static void main') && !code.includes('System.out.println')) {
          newSuggestions.push("Consider adding output to see your results")
        }
        if (code.includes('class ') && !code.includes('{')) {
          newErrors.push({
            line: 1,
            message: "Class definition needs opening brace",
            severity: 'error'
          })
        }
        break

      case 'cpp':
        // Check for common C++ errors
        if (code.includes('#include') && !code.includes('int main')) {
          newErrors.push({
            line: 1,
            message: "Missing main function",
            severity: 'error'
          })
        }
        if (code.includes('cout') && !code.includes('<<')) {
          newErrors.push({
            line: 1,
            message: "Missing output operator",
            severity: 'error'
          })
        }
        break
    }

    // General syntax checks
    const lines = code.split('\n')
    lines.forEach((line, index) => {
      // Check for unmatched brackets
      const openBrackets = (line.match(/\{/g) || []).length
      const closeBrackets = (line.match(/\}/g) || []).length
      if (openBrackets > closeBrackets) {
        newErrors.push({
          line: index + 1,
          message: "Unmatched opening brace",
          severity: 'warning'
        })
      } else if (closeBrackets > openBrackets) {
        newErrors.push({
          line: index + 1,
          message: "Unmatched closing brace",
          severity: 'warning'
        })
      }

      // Check for missing semicolons in JS-like languages
      if (['javascript', 'java', 'cpp'].includes(selectedLanguage)) {
        if (line.trim() && !line.trim().endsWith(';') && !line.trim().endsWith('{') && 
            !line.trim().endsWith('}') && !line.trim().startsWith('//') && 
            !line.includes('if') && !line.includes('for') && !line.includes('while')) {
          newSuggestions.push(`Line ${index + 1}: Consider adding semicolon`)
        }
      }
    })

    setErrors(newErrors)
    setSuggestions(newSuggestions)
  }

  // Enhanced code validation with flexible comparison (allows extra spaces and lines)
  const validateSolution = (userCode: string, expectedCode: string, language: string): { isCorrect: boolean, feedback: string[] } => {
    const feedback: string[] = []
    
    const flexibleMatch = (user: string, expected: string): boolean => {
      // Remove all whitespace for basic comparison
      const userClean = user.replace(/\s/g, '')
      const expectedClean = expected.replace(/\s/g, '')
      return userClean === expectedClean
    }

    // Language-specific validation with more flexibility
    switch (language) {
      case 'javascript':
        // Check if it's a valid function that returns "Hello, World!" (more flexible)
        const jsPattern = /function\s+helloWorld\s*\(\s*\)\s*\{\s*return\s*["']hello,\s*world!["']\s*;\s*\}/i
        const jsFlexiblePattern = /function\s+helloWorld\s*\(\s*\)\s*\{[\s\S]*return\s*["']hello,\s*world!["']\s*;[\s\S]*\}/i
        
        // Check for sum function
        const sumPattern = /function\s+sum\s*\(\s*a\s*,\s*b\s*\)\s*\{\s*return\s*a\s*\+\s*b\s*;\s*\}/i
        const sumFlexiblePattern = /function\s+sum\s*\(\s*[\w\s,]*\)\s*\{[\s\S]*return\s*[\w\s]*\+[\s\S]*\}/i
        
        // Check for isEven function
        const evenPattern = /function\s+isEven\s*\(\s*num\s*\)\s*\{\s*return\s*num\s*%\s*2\s*===\s*0\s*;\s*\}/i
        const evenFlexiblePattern = /function\s+isEven\s*\(\s*[\w\s]*\)\s*\{[\s\S]*return\s*[\w\s]*%\s*2\s*===\s*0[\s\S]*\}/i
        
        // Check for reverse string function
        const reversePattern = /function\s+reverseString\s*\(\s*str\s*\)\s*\{\s*return\s*str\.split\(['"`]\s*\)\.reverse\(\)\.join\(['"`]\s*\);\s*\}/i
        
        // Check for find max function
        const maxPattern = /function\s+findMax\s*\(\s*arr\s*\)\s*\{\s*return\s*Math\.max\(\.\.\.arr\);\s*\}/i
        
        // Check for fizzbuzz function
        const fizzPattern = /function\s+fizzBuzz\s*\(\s*n\s*\)\s*\{[\s\S]*if\s*\([\s\S]*n\s*%\s*15[\s\S]*return\s*["']FizzBuzz["'][\s\S]*if\s*\([\s\S]*n\s*%\s*3[\s\S]*return\s*["']Fizz["'][\s\S]*if\s*\([\s\S]*n\s*%\s*5[\s\S]*return\s*["']Buzz["'][\s\S]*return\s*n\.toString\(\)[\s\S]*\}/i
        
        if (jsPattern.test(userCode.replace(/\s+/g, ' ')) || jsFlexiblePattern.test(userCode) ||
            sumPattern.test(userCode.replace(/\s+/g, ' ')) || sumFlexiblePattern.test(userCode) ||
            evenPattern.test(userCode.replace(/\s+/g, ' ')) || evenFlexiblePattern.test(userCode) ||
            reversePattern.test(userCode.replace(/\s+/g, ' ')) ||
            maxPattern.test(userCode.replace(/\s+/g, ' ')) ||
            fizzPattern.test(userCode) ||
            flexibleMatch(userCode, expectedCode)) {
          return { isCorrect: true, feedback: ['Perfect! Your solution is correct!'] }
        }
        
        // Check for common mistakes
        if (!userCode.includes('function')) {
          feedback.push('You need to define a function')
        }
        if (!userCode.includes('return')) {
          feedback.push('Your function needs to return a value')
        }
        break

      case 'python':
        // Check if it's a valid function that returns "Hello, World!" (more flexible)
        const pyPattern = /def\s+hello_world\s*\(\s*\)\s*:\s*return\s*["']hello,\s*world!["']/i
        const pyFlexiblePattern = /def\s+hello_world\s*\(\s*\)\s*:[\s\S]*return\s*["']hello,\s*world!["'][\s\S]*/i
        
        // Check for sum function
        const pySumPattern = /def\s+sum_numbers\s*\([\s\S]*\)\s*:\s*return\s*[\w\s]*\+[\s\S]*/i
        
        // Check for is_even function
        const pyEvenPattern = /def\s+is_even\s*\([\s\S]*\)\s*:\s*return\s*[\w\s]*%\s*2\s*==\s*0[\s\S]*/i
        
        // Check for reverse_string function
        const pyReversePattern = /def\s+reverse_string\s*\([\s\S]*\)\s*:\s*return\s*[\w\s]*\[::-1\][\s\S]*/i
        
        // Check for find_maximum function
        const pyMaxPattern = /def\s+find_maximum\s*\([\s\S]*\)\s*:\s*return\s*max\([\s\S]*\)[\s\S]*/i
        
        // Check for squares_list function
        const pySquaresPattern = /def\s+squares_list\s*\(\s*\)\s*:\s*return\s*\[[\s\S]*for[\s\S]*in[\s\S]*range[\s\S]*\][\s\S]*/i
        
        if (pyPattern.test(userCode.replace(/\s+/g, ' ')) || pyFlexiblePattern.test(userCode) ||
            pySumPattern.test(userCode) || pyEvenPattern.test(userCode) ||
            pyReversePattern.test(userCode) || pyMaxPattern.test(userCode) ||
            pySquaresPattern.test(userCode) || flexibleMatch(userCode, expectedCode)) {
          return { isCorrect: true, feedback: ['Excellent! Your solution is correct!'] }
        }
        
        // Check for common mistakes
        if (!userCode.includes('def ')) {
          feedback.push('You need to define a function with "def"')
        }
        if (!userCode.includes('return')) {
          feedback.push('Your function needs to return a value')
        }
        if (!userCode.includes(':')) {
          feedback.push('Python functions need a colon ":" after the function definition')
        }
        break

      case 'java':
        // Check if it's a valid method that returns "Hello, World!" (more flexible)
        const javaPattern = /public\s+static\s+String\s+helloWorld\s*\(\s*\)\s*\{\s*return\s*["']hello,\s*world!["']\s*;\s*\}/i
        const javaFlexiblePattern = /public\s+static\s+String\s+helloWorld\s*\(\s*\)\s*\{[\s\S]*return\s*["']hello,\s*world!["']\s*;[\s\S]*\}/i
        
        // Check for sum method
        const javaSumPattern = /public\s+static\s+int\s+sum\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*\+[\s\S]*\}/i
        
        // Check for isEven method
        const javaEvenPattern = /public\s+static\s+boolean\s+isEven\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*%\s*2\s*==\s*0[\s\S]*\}/i
        
        // Check for getLength method
        const javaLengthPattern = /public\s+static\s+int\s+getLength\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*\.length\(\)[\s\S]*\}/i
        
        // Check for arraySum method
        const javaArraySumPattern = /public\s+static\s+int\s+arraySum\s*\([\s\S]*\)\s*\{[\s\S]*for\s*\([\s\S]*:\s*[\w\s]*\)[\s\S]*sum\s*\+=[\s\S]*return\s*sum[\s\S]*\}/i
        
        // Check for concatenate method
        const javaConcatPattern = /public\s+static\s+String\s+concatenate\s*\([\s\S]*\)\s*\{[\s\S]*StringBuilder[\s\S]*append[\s\S]*return[\s\S]*toString\(\)[\s\S]*\}/i
        
        if (javaPattern.test(userCode.replace(/\s+/g, ' ')) || javaFlexiblePattern.test(userCode) ||
            javaSumPattern.test(userCode) || javaEvenPattern.test(userCode) ||
            javaLengthPattern.test(userCode) || javaArraySumPattern.test(userCode) ||
            javaConcatPattern.test(userCode) || flexibleMatch(userCode, expectedCode)) {
          return { isCorrect: true, feedback: ['Great! Your solution is correct!'] }
        }
        
        // Check for common mistakes
        if (!userCode.includes('public static')) {
          feedback.push('You need a public static method')
        }
        if (!userCode.includes('return')) {
          feedback.push('Your method needs to return a value')
        }
        break

      case 'cpp':
        // Check if it's a valid function that returns "Hello, World!" (more flexible)
        const cppPattern = /std::string\s+helloWorld\s*\(\s*\)\s*\{\s*return\s*["']hello,\s*world!["']\s*;\s*\}/i
        const cppFlexiblePattern = /std::string\s+helloWorld\s*\(\s*\)\s*\{[\s\S]*return\s*["']hello,\s*world!["']\s*;[\s\S]*\}/i
        
        // Check for sum function
        const cppSumPattern = /int\s+sum\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*\+[\s\S]*\}/i
        
        // Check for isEven function
        const cppEvenPattern = /bool\s+isEven\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*%\s*2\s*==\s*0[\s\S]*\}/i
        
        // Check for getLength function
        const cppLengthPattern = /int\s+getLength\s*\([\s\S]*\)\s*\{[\s\S]*return\s*[\w\s]*\.length\(\)[\s\S]*\}/i
        
        // Check for vectorSum function
        const cppVectorSumPattern = /int\s+vectorSum\s*\([\s\S]*\)\s*\{[\s\S]*for\s*\([\s\S]*:\s*[\w\s]*\)[\s\S]*sum\s*\+=[\s\S]*return\s*sum[\s\S]*\}/i
        
        // Check for swap function
        const cppSwapPattern = /void\s+swap\s*\([\s\S]*\)\s*\{[\s\S]*int\s+temp\s*=[\s\S]*\*[\w\s]*=[\s\S]*\*[\w\s]*=[\s\S]*temp[\s\S]*\}/i
        
        if (cppPattern.test(userCode.replace(/\s+/g, ' ')) || cppFlexiblePattern.test(userCode) ||
            cppSumPattern.test(userCode) || cppEvenPattern.test(userCode) ||
            cppLengthPattern.test(userCode) || cppVectorSumPattern.test(userCode) ||
            cppSwapPattern.test(userCode) || flexibleMatch(userCode, expectedCode)) {
          return { isCorrect: true, feedback: ['Awesome! Your solution is correct!'] }
        }
        
        // Check for common mistakes
        if (!userCode.includes('std::string') && !userCode.includes('int') && !userCode.includes('bool') && !userCode.includes('void')) {
          feedback.push('You need a function with proper return type')
        }
        if (!userCode.includes('return') && !userCode.includes('void')) {
          feedback.push('Your function needs to return a value')
        }
        break
    }

    // If no specific validation passed, check if code is very close
    const userLines = userCode.trim().split('\n').map(line => line.trim()).filter(line => line)
    const expectedLines = expectedCode.trim().split('\n').map(line => line.trim()).filter(line => line)
    
    if (userLines.length === expectedLines.length) {
      const similarity = userLines.reduce((acc, line, index) => {
        const expectedLine = expectedLines[index]
        if (line.toLowerCase().includes(expectedLine.toLowerCase().split(' ')[0])) {
          return acc + 1
        }
        return acc
      }, 0) / userLines.length

      if (similarity > 0.7) {
        feedback.push('You&apos;re very close! Check your syntax and spacing')
      }
    }

    return { isCorrect: false, feedback }
  }

  const handleCodeChange = (value: string | undefined) => {
    const code = value || ''
    
    // Check for malicious code in real-time
    const maliciousPatterns = checkForMaliciousCode(code, selectedLanguage)
    if (maliciousPatterns.length > 0) {
      // Show immediate warning
      toast.error('🚫 Security Violation: Dangerous code pattern detected!', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 'bold',
          boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)',
        },
        icon: '⚠️',
      })
      
      // Don't update the code if it contains malicious patterns
      return
    }
    
    setUserCode(code)
    
    // Update typing statistics
    updateTypingStats(code)
    
    // Real-time validation
    validateCode(code)
    
    // Enhanced solution validation
    if (code.trim()) {
      const validation = validateSolution(code, currentChallenge.code.replace(/\\n/g, '\n'), selectedLanguage)
      const wasCorrect = isCorrect
      setIsCorrect(validation.isCorrect)
      
      // Update suggestions with validation feedback
      if (!validation.isCorrect && validation.feedback.length > 0) {
        setSuggestions(prev => [...prev, ...validation.feedback])
      } else if (validation.isCorrect) {
        setSuggestions([]) // Clear suggestions when correct
      }

      // Auto-grant points when solution becomes correct
      if (validation.isCorrect && !wasCorrect && typeof window !== 'undefined' && window.updateUserPoints) {
        window.updateUserPoints(currentChallenge.points);
        toast.success(`🎉 Congratulations! You earned ${currentChallenge.points} points!`, {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          },
          icon: '🎯',
        });

        // Move to next challenge after a delay
        setTimeout(() => {
          const nextIndex = (currentChallengeIndex[selectedLanguage] + 1) % languageChallenges.length;
          setCurrentChallengeIndex(prev => ({
            ...prev,
            [selectedLanguage]: nextIndex
          }));

          // Reset form for next challenge
          setUserCode('');
          setIsCorrect(null);
          setErrors([]);
          setSuggestions([]);
          setShowHint(false);

          // Show next challenge message
          if (nextIndex === 0) {
            toast.success('🔄 All challenges completed! Starting over from the beginning.', {
              duration: 5000,
              style: {
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)',
              },
              icon: '🔄',
            });
          } else {
            toast.success(`➡️ Moving to next challenge!`, {
              duration: 3000,
              style: {
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3)',
              },
              icon: '➡️',
            });
          }
        }, 2000); // Wait 2 seconds before moving to next challenge
      }
    } else {
      setIsCorrect(null)
    }
  }

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof import('monaco-editor')) => {
    editorRef.current = editor

    // Configure Monaco for better error display
    monacoInstance.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
      }
    })

    editor.updateOptions({
      theme: editorSettings.theme,
      fontSize: editorSettings.fontSize,
      minimap: { enabled: editorSettings.minimap },
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: editorSettings.wordWrap,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true
      },
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      contextmenu: false,
      selectOnLineNumbers: false,
      selectionHighlight: false,
      occurrencesHighlight: "off",
      codeLens: false,
      glyphMargin: false,
      folding: false,
      renderLineHighlight: 'none',
      hideCursorInOverviewRuler: true,
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
    })

    // منع نسخ الكود
    editor.onKeyDown((e: import('monaco-editor').IKeyboardEvent) => {
      // منع Ctrl+C, Cmd+C, Ctrl+Insert
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 45)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
      // منع Ctrl+A لتحديد الكل
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 65) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    })

    // منع النسخ من خلال القائمة السياقية
    editor.onContextMenu(() => {
      // Monaco editor context menu event doesn't have preventDefault/stopPropagation
      // Instead, we return null to prevent the default context menu
      return null
    })

    // منع النسخ من خلال حدث copy
    editor.onDidChangeModelContent(() => {
      // لا نحتاج إلى فعل شيء هنا، فقط للتأكد من عدم النسخ
    })

    // إضافة event listener للـ DOM element
    const editorElement = editor.getDomNode()
    if (editorElement) {
      editorElement.addEventListener('copy', (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      })
      editorElement.addEventListener('cut', (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      })
      editorElement.addEventListener('paste', (e: Event) => {
        const pasteEvent = e as ClipboardEvent
        const pastedText = pasteEvent.clipboardData?.getData('text') || ''
        
        // Check if pasted content contains malicious code (only if protection is enabled)
        if (!editorSettings.allowMaliciousPaste) {
          const maliciousPatterns = checkForMaliciousCode(pastedText, selectedLanguage)
          if (maliciousPatterns.length > 0) {
            e.preventDefault()
            e.stopPropagation()
            
            // Show warning to user
            toast.error('🚫 Security Violation: Malicious code detected in pasted content!', {
              duration: 5000,
              style: {
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 10px 25px rgba(220, 38, 38, 0.3)',
              },
              icon: '⚠️',
            })
            
            return false
          }
        }
      })
      editorElement.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        return false
      })
    }
  }

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId)
    setUserCode('')
    setIsCorrect(null)
    setErrors([])
    setSuggestions([])
    setShowHint(false)
    // Keep the current challenge index for each language
  }



  return (
    <div className={`min-h-screen bg-background relative overflow-hidden bg-gradient-to-br ${languageElements.bgColor}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Language-specific Floating Elements */}
      {languageElements.floatingElements.map((element, index) => (
        <div
          key={index}
          className={`hidden sm:block absolute ${element.position} ${element.size} opacity-20 animate-pulse rounded-lg overflow-hidden`}
          style={{ animationDelay: `${index * 0.5}s` }}
        >
          <Image
            src={element.icon}
            alt="Language icon"
            width={32}
            height={32}
            className={`w-full h-full object-contain ${element.filter}`}
          />
        </div>
      ))}

      {/* Default Floating Elements */}
      <div className="hidden sm:block absolute top-20 left-20 w-16 h-16 bg-primary/10 rounded-full blur-xl animate-pulse"></div>
      <div className="hidden sm:block absolute bottom-20 right-20 w-24 h-24 bg-secondary/10 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="hidden md:block absolute top-1/2 left-1/4 w-12 h-12 bg-accent/10 rounded-full blur-xl animate-pulse delay-500"></div>
      <div className="hidden lg:block absolute top-1/3 right-1/4 w-20 h-20 bg-primary/5 rounded-full blur-xl animate-pulse delay-2000"></div>

      {/* Language-specific Code-like Background Elements */}
      <div className="hidden lg:block absolute top-10 right-10 opacity-10">
        <div className="text-xs font-mono text-primary transform rotate-12">
          {languageElements.codeSnippet.split('\n').map((line, index) => (
            <div key={index}>{line || '\u00A0'}</div>
          ))}
        </div>
      </div>
      <div className="hidden xl:block absolute bottom-10 left-10 opacity-10">
        <div className="text-xs font-mono text-secondary transform -rotate-12">
          function solve() {'{'}<br/>
          &nbsp;&nbsp;return &quot;success&quot;;<br/>
          {`}`}
        </div>
      </div>

      <div className="relative px-6 py-8 max-lg:px-4" style={{ userSelect: 'none' }}>
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0 mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl shadow-2xl shadow-primary/25 animate-pulse">
              <Code className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold gradient-text mb-2">Programming Challenges</h1>
              <p className="text-base sm:text-lg text-muted-foreground">Sharpen your coding skills with interactive challenges</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                <div className="flex items-center space-x-2 text-sm text-primary">
                  <Target className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Real-time feedback</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-secondary">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Instant validation</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-accent">
                  <Code className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Multiple languages</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Info Banner */}
        {selectedLanguage && (
          <div className="mb-6 md:mb-8">
            <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-primary/10 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                    <Image
                      src={currentLang?.icon || ''}
                      alt={currentLang?.name || 'Language'}
                      width={32}
                      height={32}
                      className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text">
                      {currentLang?.name} Challenges
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {selectedLanguage === 'javascript' && `Dynamic and versatile - &quot;perfect&quot; for web development! 🚀`}
                      {selectedLanguage === 'python' && `Simple and powerful - great for data science and automation! 🐍`}
                      {selectedLanguage === 'java' && `Robust and enterprise-ready - built for scalability! ☕`}
                      {selectedLanguage === 'cpp' && `High-performance and efficient - ideal for system programming! ⚡`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6 md:mb-8">
          <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-primary/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
                  <Code className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text">Choose Your Language</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Select your preferred programming language to begin</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" />
                <span>Choose your preferred programming language</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-lg:grid-cols-2">
              {languages.map((lang, index) => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`group p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover-lift focus-ring transform hover:scale-105 max-lg:p-2 ${
                    selectedLanguage === lang.id
                      ? `border-primary bg-gradient-to-br from-primary/20 to-secondary/20 text-primary shadow-2xl shadow-primary/25 ${
                          selectedLanguage === 'javascript' ? 'ring-2 ring-yellow-400/50' :
                          selectedLanguage === 'python' ? 'ring-2 ring-green-400/50' :
                          selectedLanguage === 'java' ? 'ring-2 ring-red-400/50' :
                          selectedLanguage === 'cpp' ? 'ring-2 ring-blue-400/50' : ''
                        }`
                      : 'border-border hover:border-primary/50 bg-card/50 hover:bg-card/80'
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                    <div className={`w-8 h-8 sm:w-10 lg:w-12 sm:h-10 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 max-lg:w-6 max-lg:h-6 ${
                      selectedLanguage === lang.id
                        ? `bg-gradient-to-br from-primary to-secondary text-white ${
                            selectedLanguage === 'javascript' ? 'shadow-yellow-400/50' :
                            selectedLanguage === 'python' ? 'shadow-green-400/50' :
                            selectedLanguage === 'java' ? 'shadow-red-400/50' :
                            selectedLanguage === 'cpp' ? 'shadow-blue-400/50' : ''
                          }`
                        : 'bg-gradient-to-br from-card to-card/80 group-hover:from-primary/20 group-hover:to-secondary/20'
                    }`}>
                      <Image
                        src={lang.icon}
                        alt={lang.name}
                        width={32}
                        height={32}
                        className="w-5 h-5 sm:w-6 lg:w-8 sm:h-6 lg:h-8 object-contain max-lg:w-4 max-lg:h-4"
                      />
                    </div>
                    <span className="font-semibold text-center text-sm sm:text-base max-lg:text-xs">{lang.name}</span>
                    {selectedLanguage === lang.id && (
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse max-lg:w-1 max-lg:h-1 ${
                        selectedLanguage === 'javascript' ? 'bg-yellow-400' :
                        selectedLanguage === 'python' ? 'bg-green-400' :
                        selectedLanguage === 'java' ? 'bg-red-400' :
                        selectedLanguage === 'cpp' ? 'bg-blue-400' : 'bg-primary'
                      }`}></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Challenge Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 max-lg:gap-4">
          {/* Challenge Description */}
          <div className="space-y-4 lg:space-y-6">
            <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-secondary/10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                  <div className="w-10 h-10 sm:w-12 lg:w-14 sm:h-10 lg:h-14 bg-gradient-to-br from-secondary to-accent rounded-2xl flex items-center justify-center shadow-lg max-lg:w-8 max-lg:h-8">
                    <FileText className="w-5 h-5 sm:w-6 lg:w-7 sm:h-6 lg:h-7 text-white max-lg:w-4 max-lg:h-4" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text max-lg:text-base">{currentChallenge.title}</h2>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-2">
                      <span className="flex items-center space-x-2 text-sm">
                        <Image
                          src={currentLang?.icon || ''}
                          alt={currentChallenge.language}
                          width={20}
                          height={20}
                          className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                        />
                        <span className="font-medium text-primary text-xs sm:text-sm max-lg:text-xs">{currentChallenge.language}</span>
                      </span>
                      <span className="flex items-center space-x-2 text-sm">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                        <span className="font-medium text-secondary text-xs sm:text-sm max-lg:text-xs">{currentChallenge.difficulty}</span>
                      </span>
                      <span className="flex items-center space-x-2 text-sm">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
                        <span className="font-medium text-accent text-xs sm:text-sm max-lg:text-xs">{currentChallenge.points} points</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">{currentChallenge.points}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Reward Points</div>
                </div>
              </div>
              <p className="text-muted-foreground mb-6 sm:mb-8 text-base sm:text-lg leading-relaxed max-lg:text-sm">{currentChallenge.description}</p>

              {/* Expected Output */}
              <div className="bg-gradient-to-r from-card/80 to-card/60 p-6 rounded-2xl border border-border/50 shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-success to-success/80 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="gradient-text">Expected Code</span>
                </h3>
                <pre className="text-sm text-success bg-success/10 p-4 rounded-xl overflow-x-auto border border-success/20 font-mono whitespace-pre-wrap">
                  <code>{currentChallenge.code.replace(/\\n/g, '\n')}</code>
                </pre>
              </div>
            </div>

            {/* Security Notice */}
            <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-warning/20 bg-gradient-to-r from-warning/5 to-warning/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-warning to-warning/80 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-warning">Security Protection Active</h3>
                </div>
              </div>
              <div className="space-y-3 text-sm sm:text-base text-warning/80">
                <p className="font-medium">🛡️ This environment is protected against malicious code:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-1">•</span>
                    <span>System commands and file operations are blocked</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-1">•</span>
                    <span>Network requests and external connections are not allowed</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-1">•</span>
                    <span>Code execution functions (eval, exec, etc.) are prohibited</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-warning mt-1">•</span>
                    <span>Browser storage manipulation is restricted</span>
                  </li>
                </ul>
                <p className="text-xs sm:text-sm text-muted-foreground mt-3">
                  Focus on writing clean, safe code that solves the challenge requirements.
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-accent/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center max-lg:w-6 max-lg:h-6">
                    <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold gradient-text">How to Solve</h3>
                </div>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center space-x-2 text-primary hover:text-primary-dark transition-colors text-sm bg-primary/10 hover:bg-primary/20 px-3 py-2 sm:px-4 sm:py-2 rounded-xl w-fit"
                >
                  <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                </button>
              </div>
              
              {showHint && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-6 mb-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-primary mb-3">💡 Language-Specific Hints:</p>
                      <div className="space-y-4">
                        <div>
                          <p className="font-semibold text-primary mb-2">Basic Structure:</p>
                          <p className="text-primary/80 leading-relaxed">{getHint(selectedLanguage).basic}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-primary mb-2">Advanced Tips:</p>
                          <p className="text-primary/80 leading-relaxed">{getHint(selectedLanguage).advanced}</p>
                        </div>
                        {getHint(selectedLanguage).examples.length > 0 && (
                          <div>
                            <p className="font-semibold text-primary mb-2">Examples:</p>
                            <div className="space-y-2">
                              {getHint(selectedLanguage).examples.map((example, index) => (
                                <pre key={index} className="bg-primary/5 p-3 rounded-lg text-sm font-mono text-primary border border-primary/20">
                                  <code>{example}</code>
                                </pre>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 rounded-xl bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0 max-lg:w-8 max-lg:h-8">
                    <span className="text-white font-bold text-lg max-lg:text-base">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Write Your Code</p>
                    <p className="text-muted-foreground">Write the code in the editor that exactly matches the expected result.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-xl bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary to-accent rounded-xl flex items-center justify-center flex-shrink-0 max-lg:w-8 max-lg:h-8">
                    <span className="text-white font-bold text-lg max-lg:text-base">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Run & Validate</p>
                    <p className="text-muted-foreground">Write the code that matches the expected result and get instant validation.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 rounded-xl bg-card/50 hover:bg-card/80 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center flex-shrink-0 max-lg:w-8 max-lg:h-8">
                    <span className="text-white font-bold text-lg max-lg:text-base">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Earn Points</p>
                    <p className="text-muted-foreground">Once correct, you&apos;ll earn points and unlock the next challenge.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="glass p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-primary/10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 lg:mb-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                  <Code className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold gradient-text">Your Code</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">Write your solution in the editor below</p>
                </div>
              </div>
              {/* Real-time Status Indicator */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                {userCode && (
                  <>
                    {errors.length === 0 ? (
                      <div className="flex items-center space-x-2 text-success bg-success/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold">Syntax OK</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-error bg-error/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold">{errors.length} Error{errors.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {isCorrect && (
                      <div className="flex items-center space-x-2 text-success bg-success/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl">
                        <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-semibold">Solution Ready</span>
                      </div>
                    )}
                    {/* Code Stats */}
                    <div className="text-xs text-muted-foreground bg-card/50 px-2 py-1 sm:px-3 sm:py-2 rounded-lg border text-center">
                      {userCode.split('\n').length} lines • {userCode.length} chars
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Editor Toolbar */}
            <div className="bg-gradient-to-r from-card/80 to-card/60 p-4 rounded-2xl border border-border/50 mb-4 shadow-lg">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Font Size Controls */}
                <div className="flex items-center space-x-1 bg-card/50 rounded-lg p-1">
                  <button
                    onClick={decreaseFontSize}
                    className="p-2 hover:bg-primary/20 rounded-lg transition-colors group"
                    title="Decrease font size"
                  >
                    <ZoomOut className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                  <span className="px-3 py-1 text-sm font-mono bg-primary/10 text-primary rounded">
                    {editorSettings.fontSize}px
                  </span>
                  <button
                    onClick={increaseFontSize}
                    className="p-2 hover:bg-primary/20 rounded-lg transition-colors group"
                    title="Increase font size"
                  >
                    <ZoomIn className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center space-x-2 px-3 py-2 bg-card/50 hover:bg-primary/20 rounded-lg transition-colors group"
                  title="Toggle theme"
                >
                  <Palette className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary">
                    {editorSettings.theme === 'custom-dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                {/* Word Wrap Toggle */}
                <button
                  onClick={toggleWordWrap}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors group ${
                    editorSettings.wordWrap === 'on'
                      ? 'bg-primary/20 text-primary'
                      : 'bg-card/50 hover:bg-primary/20 text-muted-foreground group-hover:text-primary'
                  }`}
                  title="Toggle word wrap"
                >
                  <span className="text-sm">Wrap</span>
                </button>

                {/* Format Code */}
                <button
                  onClick={formatCode}
                  className="flex items-center space-x-2 px-3 py-2 bg-card/50 hover:bg-primary/20 rounded-lg transition-colors group"
                  title="Format code"
                >
                  <AlignLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  <span className="text-sm text-muted-foreground group-hover:text-primary">Format</span>
                </button>

                {/* Save Code */}
                <button
                  onClick={saveCode}
                  className="flex items-center space-x-2 px-3 py-2 bg-card/50 hover:bg-success/20 rounded-lg transition-colors group"
                  title="Save code"
                >
                  <Save className="w-4 h-4 text-muted-foreground group-hover:text-success" />
                  <span className="text-sm text-muted-foreground group-hover:text-success">Save</span>
                </button>

                {/* Reset Code */}
                <button
                  onClick={resetCode}
                  className="flex items-center space-x-2 px-3 py-2 bg-card/50 hover:bg-warning/20 rounded-lg transition-colors group"
                  title="Reset code"
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-warning" />
                  <span className="text-sm text-muted-foreground group-hover:text-warning">Reset</span>
                </button>

                {/* Allow Malicious Paste Toggle */}
                <button
                  onClick={() => {
                    const newValue = !editorSettings.allowMaliciousPaste
                    setEditorSettings(prev => ({
                      ...prev,
                      allowMaliciousPaste: newValue
                    }))
                    if (newValue) {
                      toast.error('⚠️ Malicious code paste enabled - Use with caution!', {
                        duration: 4000,
                        style: {
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '16px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                        },
                        icon: '⚠️',
                      })
                    } else {
                      toast.success('🛡️ Malicious code protection re-enabled', {
                        duration: 2000,
                        style: {
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '16px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                        },
                        icon: '🛡️',
                      })
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors group ${
                    editorSettings.allowMaliciousPaste
                      ? 'bg-warning/20 text-warning border border-warning/50'
                      : 'bg-card/50 hover:bg-primary/20 text-muted-foreground group-hover:text-primary'
                  }`}
                  title={editorSettings.allowMaliciousPaste ? "Disable malicious code protection" : "Allow malicious code paste (dangerous)"}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {editorSettings.allowMaliciousPaste ? 'Protection Off' : 'Protected'}
                  </span>
                </button>

                {/* Typing Statistics */}
                {typingStats.charactersTyped > 0 && (
                  <div className="text-xs text-muted-foreground bg-card/50 px-3 py-2 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <span>⚡ {typingStats.typingSpeed} WPM</span>
                      <span>•</span>
                      <span>🎯 {typingStats.accuracy}%</span>
                    </div>
                  </div>
                )}

                {/* Keyboard Shortcuts Help */}
                <div className="relative group">
                  <button
                    className="p-2 bg-card/50 hover:bg-primary/20 rounded-lg transition-colors group"
                    title="Keyboard shortcuts"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl z-50 min-w-max">
                    <div className="text-xs font-semibold text-foreground mb-2">Keyboard Shortcuts</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+S</kbd> Save code</div>
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+Shift+F</kbd> Format code</div>
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+F</kbd> Find & replace</div>
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+Shift+R</kbd> Reset code</div>
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+/-</kbd> Font size</div>
                      <div><kbd className="bg-primary/20 px-1 rounded">Ctrl+Shift+T</kbd> Toggle theme</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Replace Panel */}
              {showSearchReplace && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Search text..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full px-3 py-2 bg-card/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Replace with..."
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        className="w-full px-3 py-2 bg-card/50 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <button
                      onClick={findAndReplace}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Typing Statistics Panel */}
            {typingStats.charactersTyped > 0 && (
              <div className="bg-gradient-to-r from-card/80 to-card/60 p-4 rounded-2xl border border-border/50 mb-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold gradient-text">Typing Statistics</span>
                  <button
                    onClick={() => setTypingStats(prev => ({ ...prev, startTime: null, charactersTyped: 0, wordsTyped: 0, linesTyped: 0, errorsCount: 0, typingSpeed: 0, accuracy: 100 }))}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{typingStats.charactersTyped}</div>
                    <div className="text-xs text-muted-foreground">Characters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-secondary">{typingStats.wordsTyped}</div>
                    <div className="text-xs text-muted-foreground">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">{typingStats.typingSpeed}</div>
                    <div className="text-xs text-muted-foreground">WPM</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-success">{typingStats.accuracy}%</div>
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-card/80 to-card/60 rounded-2xl border border-border/50 overflow-hidden shadow-2xl" style={{ userSelect: 'none' }}>
              <MonacoEditor
                height="300px"
                language={selectedLanguage}
                value={userCode}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                theme={editorSettings.theme}
                options={{
                  minimap: { enabled: editorSettings.minimap },
                  fontSize: editorSettings.fontSize,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: editorSettings.wordWrap,
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  guides: {
                    bracketPairs: true,
                    indentation: true
                  },
                  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace'
                }}
              />
            </div>

            {/* Real-time Feedback */}
            {(errors.length > 0 || suggestions.length > 0 || userCode) && (
              <div className="mt-6 space-y-4">
                {/* Progress Bar */}
                {userCode && (
                  <div className="bg-gradient-to-r from-card/80 to-card/60 p-6 rounded-2xl border border-border/50 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-semibold gradient-text">Solution Progress</span>
                      <span className="text-sm text-muted-foreground bg-card/50 px-3 py-1 rounded-lg">
                        {Math.round((userCode.length / currentChallenge.code.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-border rounded-full h-3 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-primary via-secondary to-accent h-3 rounded-full transition-all duration-500 shadow-lg"
                        style={{ width: `${Math.min((userCode.length / currentChallenge.code.length) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="bg-gradient-to-r from-error/10 to-error/5 border border-error/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-error to-error/80 rounded-xl flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-error">Errors Found</span>
                      <span className="bg-error/20 text-error px-3 py-1 rounded-full text-sm font-semibold">
                        {errors.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {errors.map((error, index) => (
                        <div
                          key={index}
                          onClick={() => goToLine(error.line)}
                          className="flex items-start space-x-3 text-sm bg-error/10 p-3 rounded-xl hover:bg-error/20 cursor-pointer transition-colors border border-error/20 hover:border-error/40"
                        >
                          <span className="text-error font-mono text-xs bg-error/20 px-2 py-1 rounded-lg border border-error/30 flex-shrink-0">
                            Line {error.line}
                          </span>
                          <span className="text-error flex-1">{error.message}</span>
                          <div className="text-error/60 text-xs flex-shrink-0">
                            Click to jump →
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-warning to-warning/80 rounded-xl flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-warning">Suggestions</span>
                      <span className="bg-warning/20 text-warning px-3 py-1 rounded-full text-sm font-semibold">
                        {suggestions.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 text-sm bg-warning/10 p-4 rounded-xl border border-warning/20 hover:bg-warning/20 transition-colors"
                        >
                          <span className="text-warning text-lg flex-shrink-0">💡</span>
                          <span className="text-warning flex-1 leading-relaxed">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}



            {/* Result */}
            {isCorrect !== null && (
              <div className={`mt-4 sm:mt-6 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border-2 ${
                isCorrect 
                  ? 'bg-gradient-to-r from-success/10 to-success/5 border-success/20' 
                  : 'bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                    isCorrect ? 'bg-gradient-to-br from-success to-success/80' : 'bg-gradient-to-br from-warning to-warning/80'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg sm:text-2xl font-bold mb-4">
                      {isCorrect ? '🎉 Excellent! Your solution is correct!' : 'Almost there! Here are some tips:'}
                    </p>
                    {isCorrect ? (
                      <div className="space-y-4">
                        <p className="text-lg text-success/80">You earned {currentChallenge.points} points!</p>
                        <div className="bg-gradient-to-r from-success/20 to-success/10 p-6 rounded-2xl border border-success/30">
                          <p className="text-lg font-bold text-success mb-3">✅ Your code successfully:</p>
                          <ul className="text-success/80 space-y-2">
                            <li className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Defines the correct function/method</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Returns the exact string &quot;Hello, &apos;World!&quot;</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4" />
                              <span>Uses proper syntax and formatting</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-warning/20 to-warning/10 p-6 rounded-2xl border border-warning/30">
                          <p className="text-lg font-bold text-warning mb-3">💡 Common issues to check:</p>
                          <ul className="text-warning/80 space-y-2">
                            <li className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>Function/method name and signature</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>Return statement with correct string</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>Proper syntax (brackets, semicolons, etc.)</span>
                            </li>
                            <li className="flex items-center space-x-2">
                              <Target className="w-4 h-4" />
                              <span>{`Exact string match: &quot;Hello, &apos;World!&quot;`}</span>
                            </li>
                          </ul>
                        </div>
                        <div className="text-sm text-muted-foreground bg-card/50 p-4 rounded-xl border">
                          💪 Keep trying! Programming is about learning from mistakes.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}