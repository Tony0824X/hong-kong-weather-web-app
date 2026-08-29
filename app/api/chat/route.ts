import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://hk-weather.vercel.app',
    'X-Title': 'Hong Kong Weather',
  },
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    if (!messages.length || messages.length > 30) {
      return NextResponse.json({ error: 'Please send a valid conversation.' }, { status: 400 })
    }

    const safeMessages = messages
      .filter((message: { role?: string; content?: string }) =>
        ['user', 'assistant'].includes(message.role ?? '') && typeof message.content === 'string',
      )
      .map((message: { role: 'user' | 'assistant'; content: string }) => ({
        role: message.role,
        content: message.content.slice(0, 2000),
      }))

    const result = await generateText({
      model: openrouter('minimax/minimax-m3:free'),
      system: 'You are a helpful Hong Kong weather assistant. Answer questions about Hong Kong weather, seasons, typhoons, rain, humidity, clothing, commuting, and outdoor planning. Be concise, practical, and clear. If asked about live conditions or warnings, say the user should check the live dashboard because you do not have direct access to the current feed in this chat. Do not invent current weather data.',
      messages: safeMessages,
      maxOutputTokens: 350,
    })

    return NextResponse.json({ message: result.text })
  } catch (error) {
    console.error('[v0] Chat request failed:', error)
    return NextResponse.json({ error: 'The weather assistant is unavailable right now. Please try again.' }, { status: 500 })
  }
}
