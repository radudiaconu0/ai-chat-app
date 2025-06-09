// composables/useChat.ts
import type { Chat, Message } from '~/composables/useDatabase'

export const useChat = () => {
    const { models, prepareMessages, calculateCost } = useLLM()
    const {
        createChat,
        getUserChats,
        getChat,
        deleteChat,
        addMessage,
        getChatMessages,
        updateMessage,
        db
    } = useDatabase()

    // State
    const currentChatId = ref<number | null>(null)
    const selectedModel = ref('anthropic/claude-3.5-sonnet')
    const chats = ref<Chat[]>([])
    const messages = ref<Message[]>([])
    const isLoadingChats = ref(false)
    const isLoadingMessages = ref(false)
    const isSending = ref(false)
    const streamingMessage = ref('')

    // Chat settings
    const chatSettings = ref({
        temperature: 0.7,
        maxTokens: 4000,
        systemPrompt: ''
    })

    /**
     * Load user's chats from database
     */
    const loadChats = async (userId: number) => {
        try {
            isLoadingChats.value = true
            chats.value = await getUserChats(userId)
        } catch (error) {
            console.error('Error loading chats:', error)
            throw error
        } finally {
            isLoadingChats.value = false
        }
    }

    /**
     * Load messages for a specific chat
     */
    const loadMessages = async (chatId: number) => {
        try {
            isLoadingMessages.value = true
            messages.value = await getChatMessages(chatId)
        } catch (error) {
            console.error('Error loading messages:', error)
            throw error
        } finally {
            isLoadingMessages.value = false
        }
    }

    /**
     * Create a new chat
     */
    const createNewChat = async (userId: number, modelId: string = selectedModel.value) => {
        try {
            const chatId = await createChat(userId, modelId, 'New Chat')
            await loadChats(userId)
            return chatId
        } catch (error) {
            console.error('Error creating chat:', error)
            throw error
        }
    }

    /**
     * Update chat model
     */
    const updateChatModel = async (chatId: number, modelId: string) => {
        try {
            await db.chats.update(chatId, { model: modelId })
            selectedModel.value = modelId
        } catch (error) {
            console.error('Error updating chat model:', error)
            throw error
        }
    }

    /**
     * Send a message and get AI response
     */
    const sendMessage = async (
        chatId: number,
        content: string,
        attachments: File[] = []
    ) => {
        if (isSending.value) return

        try {
            isSending.value = true

            // Add user message to database
            const userMessageId = await addMessage({
                chatId,
                content,
                role: 'user',
                attachments: attachments.map(file => ({
                    filename: file.name,
                    url: URL.createObjectURL(file),
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                    size: file.size
                }))
            })

            // Refresh messages to show user message
            await loadMessages(chatId)

            // Prepare messages for API
            const apiMessages = prepareMessages(messages.value)

            // Add system prompt if configured
            if (chatSettings.value.systemPrompt) {
                apiMessages.unshift({
                    role: 'system',
                    content: chatSettings.value.systemPrompt
                })
            }

            // Stream AI response using server API
            streamingMessage.value = ''
            let fullResponse = ''

            try {
                // Use the server-side API route for better security
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: apiMessages,
                        model: selectedModel.value,
                        temperature: chatSettings.value.temperature,
                        maxTokens: chatSettings.value.maxTokens,
                        stream: true
                    })
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const reader = response.body?.getReader()
                if (!reader) {
                    throw new Error('No response body reader available')
                }

                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() || ''

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6))

                                if (data.content) {
                                    streamingMessage.value += data.content
                                    fullResponse += data.content
                                } else if (data.finished) {
                                    // Save AI response to database
                                    const selectedModelObj = models.find(m => m.id === selectedModel.value)
                                    const cost = data.usage && selectedModelObj ? calculateCost(
                                        selectedModelObj,
                                        data.usage.prompt_tokens || 0,
                                        data.usage.completion_tokens || 0
                                    ) : undefined

                                    await addMessage({
                                        chatId,
                                        content: fullResponse,
                                        role: 'assistant',
                                        model: selectedModel.value,
                                        tokens: data.usage?.total_tokens,
                                        cost
                                    })

                                    streamingMessage.value = ''
                                    await loadMessages(chatId)

                                    // Update chat title if it's the first message
                                    const chat = await getChat(chatId)
                                    if (chat && chat.title === 'New Chat' && fullResponse) {
                                        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
                                        await db.chats.update(chatId, { title })
                                    }

                                    return { content: fullResponse, usage: data.usage }
                                }
                            } catch (e) {
                                console.error('Error parsing streaming data:', e)
                            }
                        }
                    }
                }
            } catch (apiError) {
                console.error('API Error:', apiError)
                // Add error message
                await addMessage({
                    chatId,
                    content: 'Sorry, there was an error processing your request. Please try again.',
                    role: 'assistant',
                    error: true
                })
                await loadMessages(chatId)
                throw apiError
            }

        } catch (error) {
            console.error('Error sending message:', error)
            throw error
        } finally {
            isSending.value = false
            streamingMessage.value = ''
        }
    }

    /**
     * Delete a chat
     */
    const deleteChatById = async (chatId: number, userId: number) => {
        try {
            await deleteChat(chatId)
            await loadChats(userId)
        } catch (error) {
            console.error('Error deleting chat:', error)
            throw error
        }
    }

    /**
     * Rename a chat
     */
    const renameChat = async (chatId: number, newTitle: string, userId: number) => {
        try {
            await db.chats.update(chatId, { title: newTitle })
            await loadChats(userId)
        } catch (error) {
            console.error('Error renaming chat:', error)
            throw error
        }
    }

    /**
     * Update chat settings
     */
    const updateChatSettings = async (chatId: number, settings: typeof chatSettings.value) => {
        try {
            await db.chats.update(chatId, { settings })
            chatSettings.value = { ...settings }
        } catch (error) {
            console.error('Error updating chat settings:', error)
            throw error
        }
    }

    /**
     * Load chat details including settings
     */
    const loadChatDetails = async (chatId: number) => {
        try {
            const chat = await getChat(chatId)
            if (chat) {
                selectedModel.value = chat.model
                chatSettings.value = {
                    temperature: chat.settings?.temperature ?? 0.7,
                    maxTokens: chat.settings?.maxTokens ?? 4000,
                    systemPrompt: chat.settings?.systemPrompt ?? ''
                }
                return chat
            }
            return null
        } catch (error) {
            console.error('Error loading chat details:', error)
            throw error
        }
    }

    return {
        // State
        currentChatId: readonly(currentChatId),
        selectedModel: readonly(selectedModel),
        chats: readonly(chats),
        messages: readonly(messages),
        isLoadingChats: readonly(isLoadingChats),
        isLoadingMessages: readonly(isLoadingMessages),
        isSending: readonly(isSending),
        streamingMessage: readonly(streamingMessage),
        chatSettings: readonly(chatSettings),

        // Actions
        loadChats,
        loadMessages,
        createNewChat,
        updateChatModel,
        sendMessage,
        deleteChatById,
        renameChat,
        updateChatSettings,
        loadChatDetails,

        // Setters for reactive state
        setCurrentChatId: (id: number | null) => { currentChatId.value = id },
        setSelectedModel: (model: string) => { selectedModel.value = model }
    }
}