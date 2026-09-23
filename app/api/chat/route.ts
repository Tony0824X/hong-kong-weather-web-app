import { createOpenAI } from '@ai-sdk/openai'
import { APICallError, generateText, RetryError } from 'ai'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://hong-kong-weather-web-app.vercel.app',
    'X-Title': 'Hong Kong Weather',
  },
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const messages = Array.isArray(body?.messages) ? body.messages : []
  if (!messages.length || messages.length > 30 || messages.some((message: unknown) =>
    !message || typeof message !== 'object' || !('role' in message) ||
    !['user', 'assistant'].includes(String(message.role)) || !('content' in message) ||
    typeof message.content !== 'string' || !message.content.trim(),
  )) {
    return NextResponse.json({ error: 'Please send a valid conversation.' }, { status: 400 })
  }

  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    console.error('[chat] OPENROUTER_API_KEY is not configured')
    return NextResponse.json({ error: 'The weather assistant is not configured yet.' }, { status: 503 })
  }

  try {
    const safeMessages = messages
      .map((message: { role: 'user' | 'assistant'; content: string }) => ({
        role: message.role,
        content: message.content.slice(0, 2000),
      }))

    const result = await generateText({
      // Individual free model promotions can expire; this router selects an available free model.
      model: openrouter.chat('openrouter/free'),
      system: 'You are a helpful Hong Kong weather assistant. Answer questions about Hong Kong weather, seasons, typhoons, rain, humidity, clothing, commuting, and outdoor planning. Be concise, practical, and clear. If asked about live conditions or warnings, say the user should check the live dashboard because you do not have direct access to the current feed in this chat. Do not invent current weather data.',
      messages: safeMessages,
      maxOutputTokens: 1024,
      abortSignal: AbortSignal.timeout(45000),
      maxRetries: 1,
    })

    const message = result.text.trim()
    if (!message) {
      return NextResponse.json({ error: 'The weather assistant returned an empty reply. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ message })
  } catch (error) {
    const cause = RetryError.isInstance(error) ? error.lastError : error
    const status = APICallError.isInstance(cause) ? cause.statusCode : undefined
    // Avoid logging conversation contents, response headers, or credentials.
    console.error('[chat] OpenRouter request failed', { status, name: error instanceof Error ? error.name : 'UnknownError' })
    if (status === 429) {
      return NextResponse.json({ error: 'The free weather assistant is busy or has reached its usage limit. Please try again later.' }, { status: 429 })
    }
    if (status === 401 || status === 403 || status === 402) {
      return NextResponse.json({ error: 'The weather assistant needs an OpenRouter account configuration update.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'The weather assistant is temporarily unavailable. Please try again shortly.' }, { status: 503 })
  }
}
