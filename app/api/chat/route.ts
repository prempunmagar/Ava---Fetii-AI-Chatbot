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

    // Try multiple Snowflake Cortex Agent API endpoint formats
    const endpoints = [
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/agent:run`,
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/databases/${DATABASE}/schemas/${SCHEMA}/agents/${AGENT_NAME}:run`,
      `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/agents/${AGENT_NAME}:run`
    ]

    // Prepare request payload for Snowflake Cortex Agent
    const payload = {
      model: "llama3.1-70b",
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
      tools: [
        {
          tool_spec: {
            type: "cortex_analyst_text_to_sql",
            name: "analyst1"
          }
        }
      ]
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PAT_TOKEN}`
    }

    let response
    let lastError = ''
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log('Trying endpoint:', endpoint)
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          console.log('Success with endpoint:', endpoint)
          break
        } else {
          const errorText = await response.text()
          lastError = `${endpoint}: ${response.status} - ${errorText}`
          console.log('Failed with endpoint:', lastError)
          continue
        }
      } catch (error) {
        lastError = `${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.log('Error with endpoint:', lastError)
        continue
      }
    }

    if (!response || !response.ok) {
      console.error('All endpoints failed. Last error:', lastError)
      return NextResponse.json({ 
        error: `All Snowflake API endpoints failed. Last error: ${lastError}` 
      }, { status: 401 })
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

  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ 
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}