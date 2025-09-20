'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, BarChart3, Search, ArrowLeft, MessageCircle, Trash2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Mode {
  id: 'analytics' | 'research'
  name: string
  icon: React.ReactNode
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [mode, setMode] = useState<'analytics' | 'research'>('analytics')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const modes: Mode[] = [
    { id: 'analytics', name: 'Analytics', icon: <BarChart3 size={16} /> },
    { id: 'research', name: 'Research', icon: <Search size={16} /> }
  ]

  const suggestedQuestions = [
    { text: "Show me daily trip volumes for last week", emoji: "📊", category: "Analytics" },
    { text: "What's the difference between booked vs actual riders?", emoji: "📈", category: "Analytics" },
    { text: "What age groups ride most on weekends?", emoji: "👥", category: "Demographics" }
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const handleSend = async (message?: string) => {
    const messageToSend = message || input
    if (!messageToSend.trim()) return

    const newMessage: Message = { role: 'user', content: messageToSend }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)
    setShowChat(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSend })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.response || 'Sorry, I received an empty response.' 
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = { 
        role: 'assistant', 
        content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    handleSend(question)
  }

  const clearChat = () => {
    setMessages([])
  }

  const goHome = () => {
    setShowChat(false)
  }

  if (!showChat) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-8 py-16">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-normal text-gray-900 mb-4">
              {getGreeting()}
            </h1>
            <h2 className="text-3xl font-normal text-blue-600 mb-12">
              What insights can I help with?
            </h2>
          </div>

          {/* Mode Buttons */}
          <div className="flex justify-center gap-3 mb-8">
            {modes.map((modeOption) => (
              <button
                key={modeOption.id}
                onClick={() => setMode(modeOption.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors ${
                  mode === modeOption.id
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {modeOption.icon}
                {modeOption.name}
              </button>
            ))}
          </div>

          {/* Main Input */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Ava Intelligence..."
                className="w-full px-4 py-4 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
            <div className="text-center text-sm text-gray-500 italic mt-2">
              Mode: {mode.charAt(0).toUpperCase() + mode.slice(1)} • Sources: Auto
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="max-w-2xl mx-auto space-y-3 mt-12">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question.text)}
                className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 flex items-center gap-3"
              >
                <span className="text-lg">{question.emoji}</span>
                <span className="text-gray-700">{question.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={goHome}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Home
            </button>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle size={20} />
                Ava - Fetii AI Chat
              </h3>
              <p className="text-sm text-gray-500">Sources: Auto</p>
            </div>
          </div>
          
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-4 justify-start">
              <div className="max-w-3xl p-4 bg-gray-100 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-gray-600">Ava is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
              placeholder="Hi! Ask me anything about your ride-share data..."
              disabled={loading}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}