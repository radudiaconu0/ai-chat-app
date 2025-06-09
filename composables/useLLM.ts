// composables/useLLM.ts
import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  Images,
  ImageGenerateParams,
  ChatCompletionChunk
} from 'openai/resources/index.mjs'

// Import Message and Attachment interfaces from useDatabase.ts
import type { Message, Attachment } from '~/composables/useDatabase'

export interface LLMModel {
  id: string
  name: string
  provider: string
  contextLength: number
  pricing: {
    prompt: number
    completion: number
  }
  capabilities: string[]
}

// Define the shape of the streamed chunk data
export interface StreamChunk {
  content: string;
  finished: boolean;
  finishReason?: string;
  usage?: OpenAI.CompletionUsage;
  error?: string;
}

export const useLLM = () => {
  const config = useRuntimeConfig()

  // Initialize OpenAI client with OpenRouter base URL and API key
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.public.openrouterApiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Chat App",
    },
    dangerouslyAllowBrowser: true
  })

  // Available models on OpenRouter with explicit LLMModel type
  const models: LLMModel[] = [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      contextLength: 200000,
      pricing: { prompt: 3, completion: 15 },
      capabilities: ['text', 'vision', 'code']
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      contextLength: 128000,
      pricing: { prompt: 5, completion: 15 },
      capabilities: ['text', 'vision', 'code']
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      contextLength: 128000,
      pricing: { prompt: 0.15, completion: 0.6 },
      capabilities: ['text', 'vision', 'code']
    },
    {
      id: 'google/gemini-pro-1.5',
      name: 'Gemini Pro 1.5',
      provider: 'Google',
      contextLength: 1000000,
      pricing: { prompt: 1.25, completion: 5 },
      capabilities: ['text', 'vision', 'code']
    },
    {
      id: 'meta-llama/llama-3.1-405b-instruct',
      name: 'Llama 3.1 405B',
      provider: 'Meta',
      contextLength: 32000,
      pricing: { prompt: 2.7, completion: 2.7 },
      capabilities: ['text', 'code']
    },
    {
      id: 'mistralai/mistral-large',
      name: 'Mistral Large',
      provider: 'Mistral',
      contextLength: 32000,
      pricing: { prompt: 2, completion: 6 },
      capabilities: ['text', 'code']
    },
    {
      id: 'openai/dall-e-3',
      name: 'DALL-E 3',
      provider: 'OpenAI',
      contextLength: 0,
      pricing: { prompt: 40, completion: 0 },
      capabilities: ['image-generation']
    }
  ]

  /**
   * Filters the available LLM models by a specific capability.
   */
  const getModelsByCapability = (capability: string): LLMModel[] => {
    return models.filter(model => model.capabilities.includes(capability))
  }

  /**
   * Calculates the estimated cost of an LLM interaction based on token usage and model pricing.
   */
  const calculateCost = (model: LLMModel, promptTokens: number, completionTokens: number = 0): number => {
    const promptCost = (promptTokens / 1000) * model.pricing.prompt
    const completionCost = (completionTokens / 1000) * model.pricing.completion
    return promptCost + completionCost
  }

  /**
   * Estimates the number of tokens in a given text.
   */
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4) // Rough estimate: 1 token ≈ 4 characters
  }

  /**
   * Sends a chat message to the specified LLM model and returns the completion.
   */
  const sendMessage = async (
      messages: ChatCompletionMessageParam[],
      modelId: string,
      options: {
        temperature?: number
        maxTokens?: number
        stream?: boolean
      } = {}
  ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<ChatCompletionChunk>> => {
    const {
      temperature = 0.7,
      maxTokens = 4000,
      stream = true
    } = options

    try {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: messages,
        temperature,
        max_tokens: maxTokens,
        stream
      })

      return completion
    } catch (error: any) {
      console.error('LLM API Error:', error)
      throw new Error(`Failed to get response from ${modelId}: ${error.message}`)
    }
  }

  /**
   * Generates an image using the specified image generation model.
   */
  const generateImage = async (
      prompt: string,
      modelId: string = 'openai/dall-e-3',
      options: {
        size?: ImageGenerateParams['size']
        quality?: ImageGenerateParams['quality']
        style?: ImageGenerateParams['style']
      } = {}
  ): Promise<Images.Image | undefined> => {
    const {
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid'
    } = options

    try {
      const response = await openai.images.generate({
        model: modelId,
        prompt,
        size: size,
        quality: quality,
        style: style,
        n: 1
      })

      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return undefined;
    } catch (error: any) {
      console.error('Image Generation Error:', error)
      throw new Error(`Failed to generate image: ${error.message}`)
    }
  }

  /**
   * Analyzes an image using a vision-capable LLM model.
   */
  const analyzeImage = async (
      imageUrl: string,
      prompt: string = "What do you see in this image?",
      modelId: string = 'openai/gpt-4o'
  ): Promise<string | null | undefined> => {
    try {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000
      })

      return completion.choices[0]?.message?.content
    } catch (error: any) {
      console.error('Image Analysis Error:', error)
      throw new Error(`Failed to analyze image: ${error.message}`)
    }
  }

  /**
   * Handles streaming responses from the LLM, yielding chunks of content.
   */
  const handleStreamResponse = async function* (stream: AsyncIterable<ChatCompletionChunk>): AsyncGenerator<StreamChunk> {
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          yield {
            content: delta.content,
            finished: false
          }
        }

        const finishReason = chunk.choices[0]?.finish_reason
        if (finishReason) {
          yield {
            content: '',
            finished: true,
            finishReason: finishReason,
            usage: chunk.usage
          }
        }
      }
    } catch (error: any) {
      console.error('Stream error:', error)
      yield {
        content: '',
        finished: true,
        error: error.message
      }
    }
  }

  /**
   * Fetches the list of available models from the OpenRouter API.
   */
  const fetchAvailableModels = async (): Promise<any[]> => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.public.openrouterApiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error: any) {
      console.error('Failed to fetch available models:', error)
      return []
    }
  }

  /**
   * Prepares messages for the LLM API, handling attachments for vision models.
   */
  const prepareMessages = (messages: Message[]): ChatCompletionMessageParam[] => {
    return messages
        .filter(m => m.role !== 'system' || (m.content && m.content.trim()))
        .map(message => {
          const baseMessage: ChatCompletionMessageParam = {
            role: message.role,
            content: message.content ?? ''
          }

          // Handle attachments for vision models
          if (message.attachments && message.attachments.length > 0) {
            const imageAttachments = message.attachments.filter(att => att.type === 'image')

            if (imageAttachments.length > 0) {
              const contentParts: ChatCompletionContentPart[] = [
                { type: "text", text: message.content ?? '' }
              ];

              imageAttachments.forEach(img => {
                contentParts.push({
                  type: "image_url",
                  image_url: { url: img.url }
                });
              });

              return {
                role: message.role,
                content: contentParts
              }
            }
          }

          return baseMessage
        })
  }

  return {
    // Models and capabilities
    models,
    getModelsByCapability,

    // Cost calculation
    calculateCost,
    estimateTokens,

    // Core functionality
    sendMessage,
    generateImage,
    analyzeImage,
    handleStreamResponse,
    prepareMessages,

    // API management
    fetchAvailableModels,

    // Direct OpenAI client access for advanced usage
    openai
  }
}