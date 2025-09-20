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

    // Correct Snowflake Cortex Agent API endpoint format from official docs
    const AGENT_ENDPOINT = `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`

    // Simplified request payload structure for Snowflake Cortex Agent
    // Try both complex and simple message formats for compatibility
    const complexPayload = {
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

    const simplePayload = {
      messages: [
        {
          role: "user",
          content: message
        }
      ]
    }

    // Try simple format first, then complex if needed
    const payload = simplePayload

    // Correct headers format for PAT token authentication
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT_TOKEN}`,
      'X-Snowflake-Authorization-Token-Type': 'PROGRAMMATIC_ACCESS_TOKEN'
    }

    console.log('Making request to:', AGENT_ENDPOINT)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    console.log('Headers:', headers)

    // COMPREHENSIVE DEBUGGING - Test multiple endpoints and permissions
    console.log('🔍 COMPREHENSIVE 401 DEBUGGING...')
    console.log('Account:', SNOWFLAKE_ACCOUNT)
    console.log('Database:', DATABASE) 
    console.log('Schema:', SCHEMA)
    console.log('Agent:', AGENT_NAME)
    console.log('Token (first 10 chars):', PAT_TOKEN.substring(0, 10) + '...')
    
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
      
    } catch (listError) {
      console.log('Error listing agents:', listError)
    }

    // Now try the main API call
    try {
      const response = await fetch(AGENT_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      console.log('Main API Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Main API Error:', errorText)
        
        // Return comprehensive debug info including all tests
        return NextResponse.json({ 
          error: `Debug Info - Status: ${response.status}, Error: ${errorText}`,
          debug: {
            endpoint: AGENT_ENDPOINT,
            status: response.status,
            errorText: errorText,
            headers: Object.fromEntries(response.headers.entries()),
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