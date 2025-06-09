// composables/useCrossTabSync.ts
export const useCrossTabSync = () => {
    const { db } = useDatabase()
    const channel = new BroadcastChannel('chat-sync')

    // Reactive state
    const messages = ref<Message[]>([])
    const chats = ref<Chat[]>([])
    const currentChatId = ref<number | null>(null)

    // Listen for cross-tab messages
    channel.onmessage = async (event) => {
        const { type, chatId, data, windowId } = event.data

        // Ignore messages from the same window
        if (windowId === window.name) return

        switch (type) {
            case 'MESSAGE_ADDED':
                if (chatId === currentChatId.value) {
                    // Add message to current chat
                    messages.value.push(data.message)
                    // Also save to IndexedDB if not already there
                    const existing = await db.messages.get(data.message.id)
                    if (!existing) {
                        await db.messages.put(data.message)
                    }
                }
                break

            case 'MESSAGE_UPDATED':
                if (chatId === currentChatId.value) {
                    // Update existing message
                    const index = messages.value.findIndex(m => m.id === data.messageId)
                    if (index !== -1) {
                        Object.assign(messages.value[index], data.updates)
                    }
                    // Update in IndexedDB
                    await db.messages.update(data.messageId, data.updates)
                }
                break

            case 'STREAMING_CHUNK':
                if (chatId === currentChatId.value) {
                    // Update streaming message content
                    const index = messages.value.findIndex(m => m.id === data.messageId)
                    if (index !== -1) {
                        messages.value[index].content = data.fullContent
                    }
                }
                break

            case 'CHAT_CREATED':
                // Add new chat to list
                chats.value.unshift(data.chat)
                break

            case 'CHAT_UPDATED':
                // Update chat in list
                const chatIndex = chats.value.findIndex(c => c.id === data.chat.id)
                if (chatIndex !== -1) {
                    Object.assign(chats.value[chatIndex], data.chat)
                }
                break

            case 'CHAT_DELETED':
                // Remove chat from list
                chats.value = chats.value.filter(c => c.id !== data.chatId)
                break

            case 'TYPING_INDICATOR':
                // Handle typing indicators from other windows
                handleTypingIndicator(data)
                break
        }
    }

    // Broadcast functions
    const broadcastChange = (type: string, data: any, chatId?: number) => {
        channel.postMessage({
            type,
            chatId: chatId || currentChatId.value,
            data,
            windowId: window.name || `window-${Date.now()}`,
            timestamp: Date.now()
        })
    }

    const broadcastMessageAdded = (message: Message) => {
        broadcastChange('MESSAGE_ADDED', { message }, message.chatId)
    }

    const broadcastMessageUpdated = (messageId: number, updates: Partial<Message>, chatId: number) => {
        broadcastChange('MESSAGE_UPDATED', { messageId, updates }, chatId)
    }

    const broadcastStreamingChunk = (messageId: number, fullContent: string, chatId: number) => {
        broadcastChange('STREAMING_CHUNK', { messageId, fullContent }, chatId)
    }

    const broadcastChatCreated = (chat: Chat) => {
        broadcastChange('CHAT_CREATED', { chat })
    }

    const broadcastChatUpdated = (chat: Chat) => {
        broadcastChange('CHAT_UPDATED', { chat })
    }

    const broadcastChatDeleted = (chatId: number) => {
        broadcastChange('CHAT_DELETED', { chatId })
    }

    const broadcastTyping = (isTyping: boolean, chatId: number) => {
        broadcastChange('TYPING_INDICATOR', {
            isTyping,
            windowId: window.name,
            timestamp: Date.now()
        }, chatId)
    }

    // Load functions
    const loadMessages = async (chatId: number) => {
        currentChatId.value = chatId
        messages.value = await db.messages
            .where('chatId')
            .equals(chatId)
            .sortBy('createdAt')
    }

    const loadChats = async (userId: number) => {
        chats.value = await db.chats
            .where('userId')
            .equals(userId)
            .reverse()
            .sortBy('updatedAt')
    }

    // Enhanced database operations with sync
    const addMessageWithSync = async (message: Omit<Message, 'id'>): Promise<number> => {
        const messageId = await db.messages.add({
            ...message,
            createdAt: new Date(),
            synced: false
        })

        const fullMessage = await db.messages.get(messageId)
        if (fullMessage) {
            messages.value.push(fullMessage)
            broadcastMessageAdded(fullMessage)
        }

        return messageId
    }

    const updateMessageWithSync = async (messageId: number, updates: Partial<Message>): Promise<void> => {
        await db.messages.update(messageId, {
            ...updates,
            synced: false
        })

        const message = await db.messages.get(messageId)
        if (message) {
            const index = messages.value.findIndex(m => m.id === messageId)
            if (index !== -1) {
                Object.assign(messages.value[index], updates)
            }
            broadcastMessageUpdated(messageId, updates, message.chatId)
        }
    }

    const createChatWithSync = async (userId: number, model: string, title?: string): Promise<number> => {
        const chatId = await db.chats.add({
            userId,
            title: title || 'New Chat',
            model,
            settings: { temperature: 0.7, maxTokens: 4000 },
            isShared: false,
            createdAt: new Date(),
            updatedAt: new Date()
        })

        const chat = await db.chats.get(chatId)
        if (chat) {
            chats.value.unshift(chat)
            broadcastChatCreated(chat)
        }

        return chatId
    }

    const deleteChatWithSync = async (chatId: number): Promise<void> => {
        await db.transaction('rw', db.chats, db.messages, db.attachments, () => {
            db.chats.delete(chatId)
            db.messages.where('chatId').equals(chatId).delete()
        })

        chats.value = chats.value.filter(c => c.id !== chatId)
        broadcastChatDeleted(chatId)
    }

    // Typing indicator management
    const typingIndicators = ref<Map<string, { isTyping: boolean, timestamp: number }>>(new Map())

    const handleTypingIndicator = (data: any) => {
        const { windowId, isTyping, timestamp } = data
        typingIndicators.value.set(windowId, { isTyping, timestamp })

        // Clean up old typing indicators
        setTimeout(() => {
            const current = typingIndicators.value.get(windowId)
            if (current && current.timestamp === timestamp) {
                typingIndicators.value.delete(windowId)
            }
        }, 5000)
    }

    const isAnyoneTyping = computed(() => {
        return Array.from(typingIndicators.value.values()).some(indicator => indicator.isTyping)
    })

    // Cleanup
    onUnmounted(() => {
        channel.close()
    })

    // Set window name for identification
    if (!window.name) {
        window.name = `chat-window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    return {
        // Reactive state
        messages,
        chats,
        currentChatId,
        typingIndicators,
        isAnyoneTyping,

        // Load functions
        loadMessages,
        loadChats,

        // Enhanced operations with sync
        addMessageWithSync,
        updateMessageWithSync,
        createChatWithSync,
        deleteChatWithSync,

        // Broadcast functions
        broadcastStreamingChunk,
        broadcastTyping,

        // Direct access for special cases
        broadcastChange
    }
}