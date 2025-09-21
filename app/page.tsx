'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Search, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  isStreaming?: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'analytics' | 'research'>('analytics')
  const [collapsedThinking, setCollapsedThinking] = useState<Record<number, boolean>>({})
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

    // Add a streaming assistant message immediately
    const streamingMessageIndex = messages.length + 1
    const streamingMessage: Message = { 
      role: 'assistant', 
      content: '',
      thinking: '',
      isStreaming: true
    }
    setMessages(prev => [...prev, streamingMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: messageToSend,
          conversationHistory: messages.slice(-6) // Send last 6 messages for context (3 exchanges)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.debug) {
          const debugInfo = JSON.stringify(data.debug, null, 2)
          throw new Error(`${data.error || `HTTP error! status: ${response.status}`}\n\nDEBUG INFO:\n${debugInfo}`)
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('text/event-stream') || contentType?.includes('text/plain')) {
        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No reader available')

        const decoder = new TextDecoder()
        let buffer = ''
        let currentThinking = ''
        let currentResponse = ''
        let inThinking = false

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const dataContent = line.slice(6)
                if (dataContent.trim() === '[DONE]' || !dataContent.trim()) continue

                const data = JSON.parse(dataContent)

                if (data.type === 'thinking') {
                  currentThinking = data.content
                } else if (data.type === 'response') {
                  currentResponse = data.content
                  if (data.thinking) {
                    currentThinking = data.thinking
                  }
                }

                // Update the streaming message in real-time
                setMessages(prev => prev.map((msg, idx) => 
                  idx === streamingMessageIndex ? {
                    ...msg,
                    thinking: currentThinking,
                    content: currentResponse,
                    isStreaming: !data.done
                  } : msg
                ))

                if (data.done) {
                  break
                }

              } catch (parseError) {
                console.warn('Failed to parse SSE line:', line, parseError)
              }
            }
          }
        }

        // Mark as complete
        setMessages(prev => prev.map((msg, idx) => 
          idx === streamingMessageIndex ? {
            ...msg,
            isStreaming: false
          } : msg
        ))

      } else {
        // Handle regular JSON response
        const data = await response.json()
        
        const finalMessage: Message = { 
          role: 'assistant', 
          content: data.response || 'Sorry, I received an empty response.',
          thinking: data.thinking || undefined,
          isStreaming: false
        }
        
        setMessages(prev => prev.map((msg, idx) => 
          idx === streamingMessageIndex ? finalMessage : msg
        ))
      }

    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = { 
        role: 'assistant', 
        content: `🔍 [DEBUG] API Error - Latest code deployed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isStreaming: false
      }
      setMessages(prev => prev.map((msg, idx) => 
        idx === streamingMessageIndex ? errorMessage : msg
      ))
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
                    className={`max-w-3xl rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white p-4'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.role === 'assistant' && (message.thinking || message.isStreaming) && (
                      <div className="bg-gray-50 border border-gray-200 rounded-t-lg">
                        <button
                          onClick={() => setCollapsedThinking(prev => ({
                            ...prev,
                            [index]: !prev[index]
                          }))}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
                        >
                          <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            💭 Thinking
                            {message.isStreaming && (
                              <div className="animate-pulse flex gap-1">
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
                            {message.thinking && !message.isStreaming && (
                              <span className="text-gray-400">({message.thinking.split('\n').filter(line => line.trim()).length} lines)</span>
                            )}
                          </div>
                          {(!collapsedThinking[index] || message.isStreaming) ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        {(!collapsedThinking[index] || message.isStreaming || (!collapsedThinking.hasOwnProperty(index))) && (
                          <div className="px-3 pb-3 border-t border-gray-200">
                            <div className="whitespace-pre-wrap text-xs text-gray-600 mt-2">
                              {message.thinking || (message.isStreaming ? 'Starting analysis...' : '')}
                              {message.isStreaming && (
                                <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`whitespace-pre-wrap text-sm ${message.role === 'assistant' ? 'p-4' : ''}`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              
{/* Removed loading indicator - thinking is shown in the message box */}
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