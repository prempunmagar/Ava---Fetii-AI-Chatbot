'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Search, MessageCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'analytics' | 'research'>('analytics')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (message?: string) => {
    const messageToSend = message || input
    if (!messageToSend.trim()) return

    const newMessage: Message = { role: 'user', content: messageToSend }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)

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

  const handleResearch = () => {
    setMode(mode === 'research' ? 'analytics' : 'research')
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Ava</h1>
            <span className="text-sm text-gray-500">Fetii AI Analytics</span>
          </div>
          <div className="text-sm text-gray-500">
            Mode: {mode === 'analytics' ? 'Analytics' : 'Research'}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="mb-8">
                <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Hi! I'm Ava, your analytics assistant
                </h2>
                <p className="text-gray-600">
                  Ask me about your ride-share data, trip patterns, or venue insights
                </p>
              </div>
              
              {/* Suggested Questions */}
              <div className="w-full max-w-2xl space-y-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Try these questions:</h3>
                {[
                  "Show me daily trip volumes for last week",
                  "What's the difference between booked vs actual riders?", 
                  "What age groups ride most on weekends?"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(question)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Chat Messages
            <div className="p-4 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl p-4 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl p-4 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-gray-600">Ava is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                placeholder="Ask about your ride-share data..."
                disabled={loading}
                className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-sm"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  onClick={handleResearch}
                  className={`p-2 rounded-md transition-colors ${
                    mode === 'research' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Toggle Research Mode"
                >
                  <Search size={16} />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-400"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}