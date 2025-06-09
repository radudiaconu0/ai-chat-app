// server/api/chat.post.ts
import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
    try {
        const body = await readBody(event)
        const { messages, model, temperature = 0.7, maxTokens = 4000, stream = true } = body

        const config = useRuntimeConfig()

        // Check if API key is available (try both config locations)
        const apiKey = config.openrouterApiKey || config.public.openrouterApiKey || config.public.openAiKey
        if (!apiKey) {
            throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in your environment variables.')
        }

        // Initialize OpenAI client with OpenRouter
        const openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: apiKey,
            defaultHeaders: {
                "HTTP-Referer": getRequestURL(event).origin,
                "X-Title": "AI Chat App",
            }
        })

        if (stream) {
            // Set headers for Server-Sent Events
            setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
            setHeader(event, 'Cache-Control', 'no-cache')
            setHeader(event, 'Connection', 'keep-alive')
            setHeader(event, 'Access-Control-Allow-Origin', '*')
            setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
            try {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    stream: true
                })

                // Create a readable stream manually
                const encoder = new TextEncoder()

                const readableStream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of completion) {
                                const delta = chunk.choices[0]?.delta
                                if (delta?.content) {
                                    const data = JSON.stringify({
                                        content: delta.content,
                                        finished: false
                                    })
                                    controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                                }

                                const finishReason = chunk.choices[0]?.finish_reason
                                if (finishReason) {
                                    const data = JSON.stringify({
                                        content: '',
                                        finished: true,
                                        finishReason: finishReason,
                                        usage: chunk.usage
                                    })
                                    controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                                    controller.close()
                                    break
                                }
                            }
                        } catch (streamError) {
                            console.error('Streaming error:', streamError)
                            const errorData = JSON.stringify({
                                content: '',
                                finished: true,
                                error: streamError.message || 'Streaming error occurred'
                            })
                            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
                            controller.close()
                        }
                    }
                })

                return new Response(readableStream, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive'
                    }
                })

            } catch (openaiError) {
                console.error('OpenAI API Error:', openaiError)

                // Return error as stream
                const encoder = new TextEncoder()
                const errorData = JSON.stringify({
                    content: '',
                    finished: true,
                    error: openaiError.message || 'Failed to get AI response'
                })

                return new Response(`data: ${errorData}\n\n`, {
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    }
                })
            }
        } else {
            // Non-streaming response
            try {
                const completion = await openai.chat.completions.create({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    stream: false
                })

                return {
                    content: completion.choices[0]?.message?.content || '',
                    usage: completion.usage,
                    finished: true
                }
            } catch (openaiError) {
                console.error('OpenAI API Error:', openaiError)
                throw createError({
                    statusCode: 500,
                    statusMessage: `OpenAI API Error: ${openaiError.message}`
                })
            }
        }
    } catch (error) {
        console.error('Chat API Error:', error)

        // Provide more specific error information
        const errorMessage = error.message || 'An unexpected error occurred'
        const statusCode = error.status || error.statusCode || 500

        throw createError({
            statusCode,
            statusMessage: `Chat API Error: ${errorMessage}`
        })
    }
})