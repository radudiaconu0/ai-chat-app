// composables/useLLM.ts
import OpenAI from 'openai'

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

export const useLLM = () => {
  const config = useRuntimeConfig()
  console.log(config.openAiKey)
  
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: config.public.openAiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Chat App",
    },
    dangerouslyAllowBrowser: true // For client-side usage
  })

  // Available models on OpenRouter
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

  // Get models by capability
  const getModelsByCapability = (capability: string) => {
    return models.filter(model => model.capabilities.includes(capability))
  }

  // Calculate cost estimate
  const calculateCost = (model: LLMModel, promptTokens: number, completionTokens: number = 0) => {
    const promptCost = (promptTokens / 1000) * (model.pricing.prompt / 1000)
    const completionCost = (completionTokens / 1000) * (model.pricing.completion / 1000)
    return promptCost + completionCost
  }

  // Count tokens (rough estimate)
  const estimateTokens = (text: string) => {
    return Math.ceil(text.length / 4) // Rough estimate: 1 token ≈ 4 characters
  }

  // Send chat message
  const sendMessage = async (
    messages: Array<{ role: string; content: string }>,
    modelId: string,
    options: {
      temperature?: number
      maxTokens?: number
      stream?: boolean
    } = {}
  ) => {
    const {
      temperature = 0.7,
      maxTokens = 4000,
      stream = true
    } = options

    try {
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
        stream
      })

      return completion
    } catch (error) {
      console.error('LLM API Error:', error)
      throw new Error(`Failed to get response from ${modelId}: ${error.message}`)
    }
  }

  // Generate image
  const generateImage = async (
    prompt: string,
    modelId: string = 'openai/dall-e-3',
    options: {
      size?: string
      quality?: string
      style?: string
    } = {}
  ) => {
    const {
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid'
    } = options

    try {
      const response = await openai.images.generate({
        model: modelId,
        prompt,
        size: size as any,
        quality: quality as any,
        style: style as any,
        n: 1
      })

      return response.data[0]
    } catch (error) {
      console.error('Image Generation Error:', error)
      throw new Error(`Failed to generate image: ${error.message}`)
    }
  }

  // Analyze image with vision model
  const analyzeImage = async (
    imageUrl: string,
    prompt: string = "What do you see in this image?",
    modelId: string = 'openai/gpt-4o'
  ) => {
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

      return completion.choices[0].message.content
    } catch (error) {
      console.error('Image Analysis Error:', error)
      throw new Error(`Failed to analyze image: ${error.message}`)
    }
  }

  // Stream response handler
  const handleStreamResponse = async function* (stream: any) {
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (delta?.content) {
          yield {
            content: delta.content,
            finished: false
          }
        }
        
        if (chunk.choices[0]?.finish_reason) {
          yield {
            content: '',
            finished: true,
            finishReason: chunk.choices[0].finish_reason,
            usage: chunk.usage
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      yield {
        content: '',
        finished: true,
        error: error.message
      }
    }
  }

  // Get available models from OpenRouter API
  const fetchAvailableModels = async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${config.public.openrouterApiKey}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch models')
      }
      
      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('Failed to fetch available models:', error)
      return []
    }
  }

  // Prepare messages for API (handle attachments, etc.)
  const prepareMessages = (messages: Message[]) => {
    return messages
      .filter(m => m.role !== 'system' || m.content.trim()) // Remove empty system messages
      .map(message => {
        const baseMessage = {
          role: message.role,
          content: message.content
        }

        // Handle attachments for vision models
        if (message.attachments && message.attachments.length > 0) {
          const imageAttachments = message.attachments.filter(att => att.type === 'image')
          
          if (imageAttachments.length > 0) {
            return {
              role: message.role,
              content: [
                { type: "text", text: message.content },
                ...imageAttachments.map(img => ({
                  type: "image_url",
                  image_url: { url: img.url }
                }))
              ]
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