import { NextRequest, NextResponse } from 'next/server'

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

    // Minimal payload for generic cortex endpoint
    const payload = {
      thread_id: 0,
      parent_message_id: 0,
      messages: [
        {
          role: "user",
          content: message // Simple string instead of complex content array
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
    console.log('- thread_id type:', typeof payload.thread_id, 'value:', payload.thread_id)
    console.log('- parent_message_id type:', typeof payload.parent_message_id, 'value:', payload.parent_message_id)
    console.log('- messages structure:', JSON.stringify(payload.messages, null, 2))
    console.log('- Payload keys:', Object.keys(payload))
    
    // Test 1: List databases (basic permissions)
    const dbEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases`
    console.log('TEST 1: Basic database access:', dbEndpoint)
    
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
    
    // Test 2: List agents
    const listEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents`
    console.log('TEST 2: List agents:', listEndpoint)

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

    // Test 3: Test minimal payload with generic endpoint first
    const minimalTestEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/agent:run`
    const minimalTestPayload = {
      thread_id: 0,
      parent_message_id: 0,
      messages: [
        {
          role: "user",
          content: "test message"
        }
      ]
    }

    console.log('TEST 3: Testing minimal payload with generic endpoint')
    try {
      const testResponse = await fetch(minimalTestEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(minimalTestPayload)
      })

      console.log('Minimal test response status:', testResponse.status)
      const testText = await testResponse.text()
      console.log('Minimal test response:', testText.substring(0, 500) + '...')

      if (testResponse.ok) {
        console.log('✅ Minimal payload works! Using generic endpoint.')
        WORKING_ENDPOINT = minimalTestEndpoint
      } else {
        console.log('❌ Minimal payload failed, trying specific agent endpoint')
      }
    } catch (testError) {
      console.log('Error testing minimal payload:', testError)
    }

    // Test 4: Get specific agent details if needed
    const agentDetailsEndpoint = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}`
    console.log('TEST 4: Get AVA agent details:', agentDetailsEndpoint)

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

    // Test multiple endpoint variations - start with generic endpoint since it worked before
    const endpoints = [
      // Generic cortex endpoint (worked before)
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/agent:run`,
      // Specific agent endpoint
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`,
      // Alternative endpoint format
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}/run`
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

    // If we got a 400 error, try a minimal payload as fallback
    if (response.status === 400) {
      console.log('🔄 Trying minimal payload fallback...')
      const minimalPayload = {
        thread_id: 0,
        parent_message_id: 0,
        messages: [
          {
            role: "user",
            content: message // Simple string format
          }
        ]
      }

      try {
        console.log('Minimal payload:', JSON.stringify(minimalPayload, null, 2))
        response = await fetch(WORKING_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify(minimalPayload)
        })
        console.log('Minimal payload response status:', response.status)
      } catch (minimalError) {
        console.log('Minimal payload also failed:', minimalError)
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
      
      return NextResponse.json({ response: fullResponse })
      
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
      
      return NextResponse.json({ response: responseText })
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