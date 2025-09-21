import { NextRequest, NextResponse } from 'next/server'

// Function to clean up object references and format properly
function cleanObjectReferences(text: string): string {
  // Replace [object Object] patterns with more readable format
  text = text.replace(/\[object Object\]/g, '[Data Reference]')
  
  // Remove trailing object references that aren't useful
  text = text.replace(/(\[Data Reference\],?)+\s*$/, '')
  text = text.replace(/(\[object Object\],?)+\s*$/, '')
  
  // Clean up other common object patterns
  text = text.replace(/\[object\s+\w+\]/g, '[Data Reference]')
  
  return text.trim()
}

// Function to separate thinking from final response (enhanced for Snowflake Intelligence format)
function parseThinkingAndResponse(text: string): { thinking: string | null, response: string } {
  // Clean the text first
  text = cleanObjectReferences(text)
  
  console.log('Parsing text, looking for thinking patterns...')
  
  // Look for the last occurrence of a final summary to separate thinking from response
  const finalSummaryPatterns = [
    /\n(I found the most recent week of trip data available[\s\S]*)/,
    /\n(The data for your requested[\s\S]*)/,
    /\n(I found that the data[\s\S]*)/,
    /\n(Here are the daily trip volumes[\s\S]*)/,
    /\n(Based on the analysis[\s\S]*)/
  ]
  
  for (const pattern of finalSummaryPatterns) {
    const match = text.match(pattern)
    if (match) {
      const responseStart = text.indexOf(match[1])
      const thinkingContent = text.substring(0, responseStart).trim()
      const responseContent = match[1].trim()
      
      console.log('Found final summary pattern, splitting...')
      console.log('Thinking length:', thinkingContent.length)
      console.log('Response length:', responseContent.length)
      
      if (thinkingContent.length > 50) {
        return {
          thinking: thinkingContent,
          response: responseContent
        }
      }
    }
  }
  
  // Look for the comprehensive thinking process that includes:
  // - Planning steps
  // - SQL executions  
  // - Analysis between queries
  // - Multiple iterations
  
  // Pattern for detailed thinking process (look for planning, executing, analyzing sections)
  const detailedThinkingPattern = /([\s\S]*?)(?:\n\n(?:I found that|Here are|The data shows|Based on the analysis|In summary)[\s\S]*)/
  const match = text.match(detailedThinkingPattern)
  
  if (match && match[1]) {
    const thinkingContent = match[1].trim()
    const responseContent = text.replace(match[1], '').trim()
    
    console.log('Found detailed thinking pattern')
    
    // Check if thinking contains substantive analysis steps
    if (thinkingContent.length > 100 && 
        (thinkingContent.includes('Planning') || 
         thinkingContent.includes('Executing') ||
         thinkingContent.includes('Analysis') ||
         thinkingContent.includes('SQL') ||
         thinkingContent.includes('query'))) {
      return {
        thinking: thinkingContent,
        response: responseContent || 'Analysis completed.'
      }
    }
  }

  // Enhanced patterns for different thinking formats
  const patterns = [
    // Snowflake Intelligence detailed format
    /(Planning the next steps[\s\S]*?)(?:\n\n(?:I found|Here are|The data|Based on|In summary))/,
    // Multi-step analysis format
    /((?:Planning|Executing|Analyzing)[\s\S]*?)(?:\n\n(?:I found|Here are|The data|Based on|In summary))/,
    // ChatGPT-style thinking tags
    /<thinking>([\s\S]*?)<\/thinking>/,
    // Alternative thinking patterns
    /(?:^|\n)(?:Thinking|Analysis|Reasoning):\s*([\s\S]*?)(?:\n(?:Response|Answer|Result):|$)/,
    // SQL and analysis pattern
    /([\s\S]*?(?:SQL|query|analysis)[\s\S]*?)(?:\n\n(?:I found|Here are|The data|Based on|In summary))/i,
    // Double newline separation with substantial content
    /([\s\S]{200,}?)\n\n((?:I found|Here are|The data|Based on|In summary)[\s\S]*)/
  ]

  for (const pattern of patterns) {
    const patternMatch = text.match(pattern)
    if (patternMatch) {
      const thinking = patternMatch[1]?.trim()
      const remaining = text.replace(patternMatch[0], patternMatch[2] || '').trim()
      
      if (thinking && thinking.length > 50) {
        return {
          thinking: thinking,
          response: remaining || text.split('\n\n').pop()?.trim() || text
        }
      }
    }
  }

  // Fallback: if we can't find structured thinking, check for any substantial content before final summary
  const lines = text.split('\n')
  let thinkingLines: string[] = []
  let responseLines: string[] = []
  let foundFinalSummary = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Look for final summary indicators
    if (line.match(/^(?:I found that|Here are|The data shows|Based on the analysis|In summary|Key findings)/i)) {
      foundFinalSummary = true
    }
    
    if (foundFinalSummary) {
      responseLines.push(lines[i])
    } else if (line.length > 0) {
      thinkingLines.push(lines[i])
    }
  }

  // If we found substantial thinking content
  if (thinkingLines.length > 5 && responseLines.length > 0) {
    return {
      thinking: thinkingLines.join('\n').trim(),
      response: responseLines.join('\n').trim()
    }
  }

  // Final fallback: no structured thinking detected
  return {
    thinking: null,
    response: text
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Hardcoded configuration - no environment variables needed
    const PAT_TOKEN = "eyJraWQiOiI5OTQ2OTc2Mjk3IiwiYWxnIjoiRVMyNTYifQ.eyJwIjoiMzg4NTUxNzI6Mzg4NTUzMDAiLCJpc3MiOiJTRjoyMDEwIiwiZXhwIjoxNzg5ODczODg5fQ.46w3EFxi4OJQhWpOk0BLBgLZgxqC1_1LkqzibPKImJaKYwxQ6SsspeYLszF87k52iVlBZjsgRGrYAuF582eBiA"
    const SNOWFLAKE_ACCOUNT = 'NBHIMLC-WB58290'
    const AGENT_NAME = 'AVA'
    const DATABASE = 'SNOWFLAKE_INTELLIGENCE'
    const SCHEMA = 'AGENTS'

    // Original :run endpoint (will be replaced by dynamic endpoint testing)
    const ORIGINAL_AGENT_ENDPOINT = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`

    // Will be set by endpoint testing logic
    let WORKING_ENDPOINT = ''
    let CURRENT_THREAD_ID = '0' // Will be updated with real thread ID

    // First, create a thread
    console.log('🔄 STEP 1: Creating a new thread...')
    const createThreadEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/threads`

    try {
      const threadResponse = await fetch(createThreadEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        },
        body: JSON.stringify({
          origin_application: 'ava_chatbot'
        })
      })

      console.log('Thread creation response status:', threadResponse.status)

      if (threadResponse.ok) {
        const threadId = await threadResponse.text()
        CURRENT_THREAD_ID = threadId.replace(/"/g, '') // Remove quotes if present
        console.log('✅ Thread created successfully:', CURRENT_THREAD_ID)
      } else {
        const threadError = await threadResponse.text()
        console.log('❌ Thread creation failed:', threadError)
        console.log('🔄 Continuing with thread_id: 0 as fallback')
      }
    } catch (threadError) {
      console.log('❌ Thread creation error:', threadError)
      console.log('🔄 Continuing with thread_id: 0 as fallback')
    }

    // Build conversation history for context
    const messages = []
    
    // Add conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      for (const historyMessage of conversationHistory) {
        if (historyMessage.role === 'user') {
          messages.push({
            role: "user",
            content: [
              {
                type: "text",
                text: historyMessage.content
              }
            ]
          })
        } else if (historyMessage.role === 'assistant' && historyMessage.content) {
          messages.push({
            role: "assistant",
            content: [
              {
                type: "text",
                text: historyMessage.content
              }
            ]
          })
        }
      }
    }
    
    // Add the current message
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: message
        }
      ]
    })

    const payload = { messages }

    // Correct headers format for PAT token authentication
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT_TOKEN}`,
      'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
    }

        console.log('Making request to:', WORKING_ENDPOINT)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    console.log('Headers:', headers)
    console.log('Request method: POST')
    console.log('Content-Length:', JSON.stringify(payload).length)

    // COMPREHENSIVE DEBUGGING - Test multiple endpoints and permissions
    console.log('🔍 COMPREHENSIVE 400 DEBUGGING...')
    console.log('Account:', SNOWFLAKE_ACCOUNT)
    console.log('Database:', DATABASE)
    console.log('Schema:', SCHEMA)
    console.log('Agent:', AGENT_NAME)
    console.log('Token (first 10 chars):', PAT_TOKEN.substring(0, 10) + '...')
    console.log('Payload validation:')
    console.log('- messages structure:', JSON.stringify(payload.messages, null, 2))
    console.log('- Payload keys:', Object.keys(payload))
    console.log('- Final payload:', JSON.stringify(payload, null, 2))
    console.log('- Using specific agent endpoint (no thread management needed)')
    
    // Test 1: Test thread creation permissions
    const testThreadEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/threads`
    console.log('TEST 1: Testing thread creation permissions:', testThreadEndpoint)

    try {
      const testThreadResponse = await fetch(testThreadEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        },
        body: JSON.stringify({
          origin_application: 'test_permissions'
        })
      })
      console.log('Thread creation test status:', testThreadResponse.status)
      if (testThreadResponse.ok) {
        const testThreadId = await testThreadResponse.text()
        console.log('✅ Thread creation permissions: OK (Thread ID:', testThreadId, ')')
      } else {
        const testThreadError = await testThreadResponse.text()
        console.log('❌ Thread creation permissions: FAILED')
        console.log('Thread creation error:', testThreadError)
      }
    } catch (testThreadError) {
      console.log('❌ Thread creation permissions test error:', testThreadError)
    }

    // Test 3: List databases (basic permissions)
    const dbEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases`
    console.log('TEST 3: Basic database access:', dbEndpoint)
    
    try {
      const dbResponse = await fetch(dbEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        }
      })
      console.log('Database list status:', dbResponse.status)
      console.log('Database response headers:', Array.from(dbResponse.headers.entries()).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}))
      const dbText = await dbResponse.text()
      console.log('Database response:', dbText.substring(0, 200) + '...')
    } catch (dbError) {
      console.log('Database test error:', dbError)
    }
    
    // Test 5: List existing threads
    const listThreadsEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/threads`
    console.log('TEST 5: List existing threads:', listThreadsEndpoint)

    try {
      const threadsResponse = await fetch(listThreadsEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        }
      })

      console.log('List threads response status:', threadsResponse.status)
      const threadsText = await threadsResponse.text()
      console.log('Existing threads:', threadsText)

      if (threadsResponse.ok) {
        try {
          const threads = JSON.parse(threadsText)
          console.log('✅ Found', threads.length, 'existing threads')
          if (threads.length > 0) {
            console.log('📋 Available thread IDs:', threads.map((t: any) => t.thread_id))
          }
        } catch (parseError) {
          console.log('Failed to parse threads list:', parseError)
        }
      }
    } catch (threadsError) {
      console.log('Error listing threads:', threadsError)
    }

    // Test 6: List agents
    const listEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents`
    console.log('TEST 6: List agents:', listEndpoint)

    try {
      const listResponse = await fetch(listEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        }
      })

      console.log('List agents response status:', listResponse.status)
      const listText = await listResponse.text()
      console.log('Available agents:', listText)

      if (listResponse.ok) {
        try {
          const agents = JSON.parse(listText)
          const avaAgent = agents.find((agent: any) => agent.name === AGENT_NAME)
          if (avaAgent) {
            console.log('✅ AVA agent found:', JSON.stringify(avaAgent, null, 2))
            console.log('AVA agent tools:', avaAgent.tools || 'No tools defined')
          } else {
            console.log('❌ AVA agent NOT found in the list')
          }
        } catch (parseError) {
          console.log('Failed to parse agents list:', parseError)
        }
      }

    } catch (listError) {
      console.log('Error listing agents:', listError)
    }

    // Test 3: Test AVA agent with correct endpoint and permissions
    console.log('TEST 3: Testing AVA agent with proper permissions...')

    // Test the specific AVA agent endpoint first (most likely to work now)
    const avaAgentEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`

    // Test different payload formats for the specific AVA agent endpoint
    const payloadTests = [
      {
        name: 'AVA Agent Format with Thread',
        payload: {
          thread_id: parseInt(CURRENT_THREAD_ID) || 0,
          parent_message_id: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: message
                }
              ]
            }
          ],
          tool_choice: {
            type: "auto",
            name: ["Fetii_Cortex_Analyst", "Address_Venue_Search"]
          }
        }
      },
      {
        name: 'Standard Format with Thread',
        payload: {
          thread_id: parseInt(CURRENT_THREAD_ID) || 0,
          parent_message_id: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: message
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Minimal Format with Thread',
        payload: {
          thread_id: parseInt(CURRENT_THREAD_ID) || 0,
          parent_message_id: 0,
          messages: [
            {
              role: "user",
              content: message
            }
          ]
        }
      }
    ]

    // Test the payload formats with the AVA agent endpoint
    for (const test of payloadTests) {
      try {
        console.log(`\n🔄 Testing ${test.name} payload format:`)
        console.log('Payload:', JSON.stringify(test.payload, null, 2))

        const testResponse = await fetch(avaAgentEndpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PAT_TOKEN}`,
            'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
          },
          body: JSON.stringify(test.payload)
        })

        console.log(`${test.name} response status:`, testResponse.status)

        if (testResponse.ok) {
          console.log(`✅ ${test.name} WORKED! Using AVA agent endpoint.`)
          WORKING_ENDPOINT = avaAgentEndpoint
          const responseText = await testResponse.text()
          console.log('Response preview:', responseText.substring(0, 200) + '...')
          break
        } else {
          const errorText = await testResponse.text()
          console.log(`❌ ${test.name} failed:`, errorText.substring(0, 200) + '...')

          if (testResponse.status === 404) {
            console.log('❌ AVA agent not found - check agent name and database/schema')
            break
          }
        }
      } catch (testError) {
        console.log(`Error testing ${test.name}:`, testError)
      }
    }

    // Test 4: Test generic cortex endpoint as fallback if AVA agent fails
    console.log('\nTEST 4: Testing generic cortex endpoint as fallback...')

    // Test 8: Get specific agent details if needed
    const agentDetailsEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}`
    console.log('TEST 8: Get AVA agent details:', agentDetailsEndpoint)

    try {
      const agentResponse = await fetch(agentDetailsEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${PAT_TOKEN}`,
          'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
        }
      })

      console.log('Agent details response status:', agentResponse.status)
      const agentText = await agentResponse.text()
      console.log('AVA agent details:', agentText)

    } catch (agentError) {
      console.log('Error getting agent details:', agentError)
    }

    // Remove thread creation - not needed for :run endpoint
    // Thread management is handled by thread_id and parent_message_id in payload

    // Use ONLY the specific agent endpoint (research shows generic endpoint causes Thread 0 error)
    const endpoints = [
      // CORRECT: Specific agent endpoint (this is the only one that should work)
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`
    ]

    let response: Response | null = null
    let errorText = ''
    let finalEndpoint = ''

    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })

        finalEndpoint = endpoint
        console.log(`Endpoint ${endpoint} returned status: ${response.status}`)

        if (response.ok || response.status === 400) {
          // Stop trying if we get a definitive response (success or client error)
          break
        }
      } catch (fetchError) {
        console.log(`Endpoint ${endpoint} failed:`, fetchError)
        continue
      }
    }

    if (!response) {
      throw new Error('All endpoints failed')
    }

    WORKING_ENDPOINT = finalEndpoint // Update for debugging

    // If using generic endpoint, set the working endpoint to the generic one
    if (!WORKING_ENDPOINT) {
      WORKING_ENDPOINT = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/agent:run`
    }

    // If we got a 400 error, try different payload formats as fallback
    if (response.status === 400) {
      console.log('🔄 Trying different payload formats as fallback...')

      // Try 1: Legacy schema format
      const legacyPayload = {
        model: "claude-4-sonnet",
        messages: [
          { role: "user", content: message }
        ]
      }

      try {
        console.log('Trying legacy schema payload:', JSON.stringify(legacyPayload, null, 2))
        response = await fetch(WORKING_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify(legacyPayload)
        })
        console.log('Legacy payload response status:', response.status)

        if (response.ok) {
          console.log('✅ Legacy schema worked!')
        } else {
          console.log('❌ Legacy schema failed, trying simplified format...')

          // Try 2: Simplified format without thread management
          const simplePayload = {
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: message
                  }
                ]
              }
            ]
          }

          console.log('Trying simplified payload:', JSON.stringify(simplePayload, null, 2))
          response = await fetch(WORKING_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify(simplePayload)
          })
          console.log('Simplified payload response status:', response.status)
        }
      } catch (formatError) {
        console.log('All payload formats failed:', formatError)
      }
    }

    // Continue with existing logic...
    try {

      console.log('Main API Response status:', response.status)
      console.log('Response headers:', Array.from(response.headers.entries()).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Main API Error:', errorText)
        
        // Return comprehensive debug info including all tests
        return NextResponse.json({ 
          error: `Debug Info - Status: ${response.status}, Error: ${errorText}`,
          debug: {
            endpoint: WORKING_ENDPOINT,
            status: response.status,
            errorText: errorText,
            headers: Array.from(response.headers.entries()).reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {}),
            account: SNOWFLAKE_ACCOUNT,
            database: DATABASE,
            schema: SCHEMA,
            agent: AGENT_NAME,
            tokenPreview: PAT_TOKEN.substring(0, 10) + '...'
          }
        }, { status: response.status })
      }

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    const contentType = response.headers.get('content-type')
    console.log('Content-Type:', contentType)

    // Create a streaming response that starts immediately
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (data: any) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        }

        try {
          // Send initial thinking indicator while processing
          sendChunk({
            type: 'thinking',
            content: 'Processing your request...',
            done: false
          })

          // Now get the actual response from Snowflake
          let fullResponse = ''
          
          // Handle different response types
          if (contentType?.includes('text/plain') || contentType?.includes('text/event-stream')) {
            const text = await response.text()
            console.log('Streaming response:', text)
            
            const lines = text.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const dataContent = line.slice(6)
                  
                  if (dataContent.trim() === '[DONE]' || !dataContent.trim()) {
                    continue
                  }
                  
                  const data = JSON.parse(dataContent)
                  
                  if (data.choices && data.choices.length > 0) {
                    const choice = data.choices[0]
                    if (choice.delta && choice.delta.content) {
                      fullResponse += choice.delta.content
                    } else if (choice.message && choice.message.content) {
                      fullResponse += choice.message.content
                    }
                  } else if (data.content) {
                    fullResponse += data.content
                  } else if (data.text) {
                    fullResponse += data.text
                  }
                } catch (parseError) {
                  console.warn('Failed to parse SSE line:', line, parseError)
                  continue
                }
              }
            }
            
            if (!fullResponse) {
              fullResponse = text
            }
          } else {
            // Handle JSON response
            const data = await response.json()
            console.log('JSON response:', JSON.stringify(data, null, 2))
            console.log('Response keys:', Object.keys(data))
            
            if (data.choices && data.choices.length > 0) {
              fullResponse = data.choices[0]?.message?.content || 'No content in response'
            } else if (data.content) {
              fullResponse = data.content
            } else if (data.text) {
              fullResponse = data.text
            } else if (data.response) {
              fullResponse = data.response
            } else {
              fullResponse = JSON.stringify(data, null, 2)
            }
          }

          // Parse the final response
          console.log('Full response length:', fullResponse.length)
          console.log('Full response preview:', fullResponse.substring(0, 500) + '...')
          
          const parsed = parseThinkingAndResponse(fullResponse)
          
          console.log('Parsed thinking length:', parsed.thinking?.length || 0)
          console.log('Parsed thinking preview:', parsed.thinking?.substring(0, 200) + '...')
          console.log('Parsed response length:', parsed.response.length)
          console.log('Parsed response preview:', parsed.response.substring(0, 200) + '...')
          
          // Send the actual agent thinking (the real detailed process)
          if (parsed.thinking) {
            sendChunk({
              type: 'thinking',
              content: parsed.thinking,
              done: false
            })
          } else {
            // Fallback if no detailed thinking found
            sendChunk({
              type: 'thinking',
              content: 'Analysis completed - processing response...',
              done: false
            })
          }
          
          await new Promise(resolve => setTimeout(resolve, 300))

          // Stream the response in chunks for better performance
          const responseText = parsed.response
          const chunkSize = 50 // Characters per chunk
          let currentResponse = ''
          
          for (let i = 0; i < responseText.length; i += chunkSize) {
            currentResponse = responseText.substring(0, i + chunkSize)
            const isLastChunk = i + chunkSize >= responseText.length
            
            sendChunk({
              type: 'response',
              content: currentResponse,
              thinking: parsed.thinking,
              done: isLastChunk
            })
            
            if (!isLastChunk) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }

        } catch (error) {
          console.error('Streaming error:', error)
          sendChunk({
            type: 'error',
            content: 'Error processing request',
            done: true
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ 
        error: `Fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}` 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ 
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}