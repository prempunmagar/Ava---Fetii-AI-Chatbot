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

// Function to separate thinking from final response
function parseThinkingAndResponse(text: string): { thinking: string | null, response: string } {
  // Clean the text first
  text = cleanObjectReferences(text)
  // Common patterns for thinking sections
  const patterns = [
    // ChatGPT-style thinking tags
    /<thinking>([\s\S]*?)<\/thinking>/,
    // Alternative thinking patterns
    /(?:^|\n)(?:Thinking|Analysis|Reasoning):\s*([\s\S]*?)(?:\n(?:Response|Answer|Result):|$)/,
    // Numbered thinking patterns
    /(?:^|\n)1\.\s*(?:Thinking|Analysis):([\s\S]*?)(?:\n(?:\d+\.|Response:|Answer:)|$)/,
    // Bracket patterns
    /\[thinking\]([\s\S]*?)\[\/thinking\]/,
    // Double newline separation (common in AI responses)
    /([\s\S]*?)\n\n([\s\S]*)/
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const thinking = match[1]?.trim()
      const remaining = text.replace(match[0], '').trim()
      
      if (thinking && thinking.length > 20) { // Only consider substantial thinking
        return {
          thinking: thinking,
          response: remaining || text.split('\n\n').pop()?.trim() || text
        }
      }
    }
  }

  // If no clear thinking pattern, look for sections that seem like reasoning
  const lines = text.split('\n')
  let thinkingLines: string[] = []
  let responseLines: string[] = []
  let foundResponseStart = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if this line starts the final response
    if (line.match(/^(?:Based on|Therefore|In conclusion|Final answer|Response|Answer):/i) ||
        (i > 0 && line.length > 0 && !line.match(/^(?:Let me|I need to|First|Next|However|Additionally)/i))) {
      foundResponseStart = true
    }
    
    if (foundResponseStart) {
      responseLines.push(lines[i])
    } else if (line.length > 0) {
      thinkingLines.push(lines[i])
    }
  }

  // If we found a reasonable split
  if (thinkingLines.length > 2 && responseLines.length > 0) {
    return {
      thinking: thinkingLines.join('\n').trim(),
      response: responseLines.join('\n').trim()
    }
  }

  // Fallback: no thinking detected
  return {
    thinking: null,
    response: text
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

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

    // Try without thread management first (many agents work without it)
    const payload = {
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

    // Handle different response types
    if (contentType?.includes('text/plain') || contentType?.includes('text/event-stream')) {
      // Handle streaming response
      const text = await response.text()
      console.log('Streaming response:', text)
      
      let fullResponse = ''
      const lines = text.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const dataContent = line.slice(6) // Remove 'data: ' prefix
            
            if (dataContent.trim() === '[DONE]' || !dataContent.trim()) {
              continue
            }
            
            const data = JSON.parse(dataContent)
            
            // Extract content from different possible response structures
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
        fullResponse = text // Fallback to raw text if no structured content found
      }
      
      // Parse thinking vs response
      const parsed = parseThinkingAndResponse(fullResponse)
      return NextResponse.json({ 
        thinking: parsed.thinking,
        response: parsed.response 
      })
      
    } else {
      // Handle JSON response
      const data = await response.json()
      console.log('JSON response:', data)
      
      let responseText = ''
      
      if (data.choices && data.choices.length > 0) {
        responseText = data.choices[0]?.message?.content || 'No content in response'
      } else if (data.content) {
        responseText = data.content
      } else if (data.text) {
        responseText = data.text
      } else if (data.response) {
        responseText = data.response
      } else {
        responseText = JSON.stringify(data, null, 2)
      }
      
      // Parse thinking vs response
      const parsed = parseThinkingAndResponse(responseText)
      return NextResponse.json({ 
        thinking: parsed.thinking,
        response: parsed.response 
      })
    }

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