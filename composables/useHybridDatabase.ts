// composables/useHybridDatabase.ts
import type { Database } from '~/types/database.types'

// Supabase types
type SupabaseChat = Database['public']['Tables']['chats']['Row']
type SupabaseMessage = Database['public']['Tables']['messages']['Row']
type SupabaseUser = Database['public']['Tables']['users']['Row']

// Local interfaces (keeping the existing ones for compatibility)
export interface User {
    id?: number
    supabaseId: string
    email: string
    name: string
    avatar?: string
    createdAt: Date
}

export interface Chat {
    id?: number | string  // Can be local number or Supabase UUID
    supabaseId?: string   // Supabase UUID
    title?: string
    userId: number | string
    model: string
    settings: {
        temperature?: number
        maxTokens?: number
        systemPrompt?: string
    }
    isShared: boolean
    shareId?: string
    createdAt: Date
    updatedAt: Date
    synced?: boolean      // Track sync status
}

export interface Message {
    id?: number | string
    supabaseId?: string
    chatId: number | string
    content: string
    role: 'user' | 'assistant' | 'system'
    model?: string
    parentId?: number | string
    branchId?: number | string
    tokens?: number
    cost?: number
    attachments?: Attachment[]
    streaming?: boolean
    error?: boolean
    createdAt: Date
    synced?: boolean
}

export interface Attachment {
    id?: number | string
    supabaseId?: string
    messageId: number | string
    filename: string
    url: string
    type: 'image' | 'pdf' | 'document'
    size: number
    extractedText?: string
    analysis?: string
}

export const useHybridDatabase = () => {
    const supabase = useSupabaseClient<Database>()
    const user = useSupabaseUser()
    const { db } = useDatabase() // Keep using the existing IndexedDB setup

    // Connection status
    const isOnline = ref(true)
    const isSyncing = ref(false)

    // Monitor online status
    if (process.client) {
        isOnline.value = navigator.onLine
        window.addEventListener('online', () => {
            isOnline.value = true
            syncPendingChanges()
        })
        window.addEventListener('offline', () => { isOnline.value = false })
    }

    /**
     * Sync pending local changes to Supabase when coming back online
     */
    const syncPendingChanges = async () => {
        if (!isOnline.value || !user.value || isSyncing.value) return

        try {
            isSyncing.value = true

            // Sync unsynced chats
            const unsyncedChats = await db.chats.where('synced').equals(false).toArray()
            for (const chat of unsyncedChats) {
                await syncChatToSupabase(chat)
            }

            // Sync unsynced messages
            const unsyncedMessages = await db.messages.where('synced').equals(false).toArray()
            for (const message of unsyncedMessages) {
                await syncMessageToSupabase(message)
            }

            console.log('Sync completed successfully')
        } catch (error) {
            console.error('Error syncing pending changes:', error)
        } finally {
            isSyncing.value = false
        }
    }

    /**
     * Create a new chat (stores locally and syncs to Supabase if online)
     */
    const createChat = async (userId: string, model: string, title: string = 'New Chat'): Promise<string> => {
        const chatData = {
            title,
            model,
            settings: {
                temperature: 0.7,
                maxTokens: 4000,
                systemPrompt: ''
            },
            isShared: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            synced: false
        }

        try {
            // Always store locally first
            const localChatId = await db.chats.add({
                ...chatData,
                userId: 1, // Local user ID for IndexedDB
            })

            // Try to sync to Supabase if online and authenticated
            if (isOnline.value && user.value) {
                try {
                    const { data: supabaseChat, error } = await supabase
                        .from('chats')
                        .insert({
                            user_id: user.value.id,
                            title: chatData.title,
                            model: chatData.model,
                            settings: chatData.settings,
                            is_shared: chatData.isShared
                        })
                        .select()
                        .single()

                    if (error) throw error

                    // Update local chat with Supabase ID and mark as synced
                    await db.chats.update(localChatId, {
                        supabaseId: supabaseChat.id,
                        synced: true
                    })

                    return supabaseChat.id
                } catch (supabaseError) {
                    console.error('Failed to sync chat to Supabase:', supabaseError)
                    // Return local ID if Supabase sync fails
                    return localChatId.toString()
                }
            }

            return localChatId.toString()
        } catch (error) {
            console.error('Error creating chat:', error)
            throw error
        }
    }

    /**
     * Get user's chats (merged from local and Supabase)
     */
    const getUserChats = async (userId: string): Promise<Chat[]> => {
        try {
            let allChats: Chat[] = []

            // Get local chats
            const localChats = await db.chats.where('userId').equals(1).reverse().sortBy('updatedAt')
            allChats = localChats.map(chat => ({
                ...chat,
                id: chat.id?.toString() || '',
                userId: userId
            }))

            // Get Supabase chats if online and authenticated
            if (isOnline.value && user.value) {
                try {
                    const { data: supabaseChats, error } = await supabase
                        .from('chats')
                        .select('*')
                        .eq('user_id', user.value.id)
                        .order('updated_at', { ascending: false })

                    if (error) throw error

                    // Merge Supabase chats, avoiding duplicates
                    const localSupabaseIds = new Set(localChats.map(c => c.supabaseId).filter(Boolean))

                    for (const supabaseChat of supabaseChats || []) {
                        if (!localSupabaseIds.has(supabaseChat.id)) {
                            // This is a new chat from Supabase, add to local DB
                            const localId = await db.chats.add({
                                supabaseId: supabaseChat.id,
                                title: supabaseChat.title || 'New Chat',
                                userId: 1,
                                model: supabaseChat.model,
                                settings: supabaseChat.settings as any || {},
                                isShared: supabaseChat.is_shared || false,
                                shareId: supabaseChat.share_id || undefined,
                                createdAt: new Date(supabaseChat.created_at),
                                updatedAt: new Date(supabaseChat.updated_at),
                                synced: true
                            })

                            allChats.push({
                                id: localId.toString(),
                                supabaseId: supabaseChat.id,
                                title: supabaseChat.title || 'New Chat',
                                userId: userId,
                                model: supabaseChat.model,
                                settings: supabaseChat.settings as any || {},
                                isShared: supabaseChat.is_shared || false,
                                shareId: supabaseChat.share_id || undefined,
                                createdAt: new Date(supabaseChat.created_at),
                                updatedAt: new Date(supabaseChat.updated_at),
                                synced: true
                            })
                        }
                    }
                } catch (supabaseError) {
                    console.error('Failed to fetch chats from Supabase:', supabaseError)
                }
            }

            return allChats.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
        } catch (error) {
            console.error('Error getting user chats:', error)
            throw error
        }
    }

    /**
     * Add a message (stores locally and syncs to Supabase if online)
     */
    const addMessage = async (message: Omit<Message, 'id' | 'createdAt' | 'synced'>): Promise<string> => {
        const messageData = {
            ...message,
            createdAt: new Date(),
            synced: false
        }

        try {
            // Always store locally first
            const localMessageId = await db.messages.add(messageData)

            // Try to sync to Supabase if online and authenticated
            if (isOnline.value && user.value) {
                try {
                    // Get the chat's Supabase ID
                    const localChat = await db.chats.get(Number(message.chatId))
                    if (!localChat?.supabaseId) {
                        // Chat not synced yet, message will be synced later
                        return localMessageId.toString()
                    }

                    const { data: supabaseMessage, error } = await supabase
                        .from('messages')
                        .insert({
                            chat_id: localChat.supabaseId,
                            content: messageData.content,
                            role: messageData.role,
                            model: messageData.model,
                            tokens: messageData.tokens,
                            cost: messageData.cost,
                            attachments: messageData.attachments || [],
                            error: messageData.error || false
                        })
                        .select()
                        .single()

                    if (error) throw error

                    // Update local message with Supabase ID and mark as synced
                    await db.messages.update(localMessageId, {
                        supabaseId: supabaseMessage.id,
                        synced: true
                    })

                    return supabaseMessage.id
                } catch (supabaseError) {
                    console.error('Failed to sync message to Supabase:', supabaseError)
                    return localMessageId.toString()
                }
            }

            return localMessageId.toString()
        } catch (error) {
            console.error('Error adding message:', error)
            throw error
        }
    }

    /**
     * Get messages for a chat (merged from local and Supabase)
     */
    const getChatMessages = async (chatId: string): Promise<Message[]> => {
        try {
            let allMessages: Message[] = []

            // Get local messages
            const localMessages = await db.messages.where('chatId').equals(Number(chatId)).sortBy('createdAt')
            allMessages = localMessages.map(msg => ({
                ...msg,
                id: msg.id?.toString() || '',
                chatId: chatId
            }))

            // Get Supabase messages if online and authenticated
            if (isOnline.value && user.value) {
                try {
                    // Get the chat's Supabase ID
                    const localChat = await db.chats.get(Number(chatId))
                    if (localChat?.supabaseId) {
                        const { data: supabaseMessages, error } = await supabase
                            .from('messages')
                            .select('*')
                            .eq('chat_id', localChat.supabaseId)
                            .order('created_at', { ascending: true })

                        if (error) throw error

                        // Merge Supabase messages, avoiding duplicates
                        const localSupabaseIds = new Set(localMessages.map(m => m.supabaseId).filter(Boolean))

                        for (const supabaseMessage of supabaseMessages || []) {
                            if (!localSupabaseIds.has(supabaseMessage.id)) {
                                // This is a new message from Supabase, add to local DB
                                const localId = await db.messages.add({
                                    supabaseId: supabaseMessage.id,
                                    chatId: Number(chatId),
                                    content: supabaseMessage.content,
                                    role: supabaseMessage.role as any,
                                    model: supabaseMessage.model || undefined,
                                    tokens: supabaseMessage.tokens || undefined,
                                    cost: supabaseMessage.cost ? Number(supabaseMessage.cost) : undefined,
                                    attachments: supabaseMessage.attachments as any || [],
                                    error: supabaseMessage.error || false,
                                    createdAt: new Date(supabaseMessage.created_at),
                                    synced: true
                                })

                                allMessages.push({
                                    id: localId.toString(),
                                    supabaseId: supabaseMessage.id,
                                    chatId: chatId,
                                    content: supabaseMessage.content,
                                    role: supabaseMessage.role as any,
                                    model: supabaseMessage.model || undefined,
                                    tokens: supabaseMessage.tokens || undefined,
                                    cost: supabaseMessage.cost ? Number(supabaseMessage.cost) : undefined,
                                    attachments: supabaseMessage.attachments as any || [],
                                    error: supabaseMessage.error || false,
                                    createdAt: new Date(supabaseMessage.created_at),
                                    synced: true
                                })
                            }
                        }
                    }
                } catch (supabaseError) {
                    console.error('Failed to fetch messages from Supabase:', supabaseError)
                }
            }

            return allMessages.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
        } catch (error) {
            console.error('Error getting chat messages:', error)
            throw error
        }
    }

    /**
     * Delete a chat (from both local and Supabase)
     */
    const deleteChat = async (chatId: string): Promise<void> => {
        try {
            const localChat = await db.chats.get(Number(chatId))

            // Delete from Supabase first if online
            if (isOnline.value && user.value && localChat?.supabaseId) {
                try {
                    const { error } = await supabase
                        .from('chats')
                        .delete()
                        .eq('id', localChat.supabaseId)

                    if (error) throw error
                } catch (supabaseError) {
                    console.error('Failed to delete chat from Supabase:', supabaseError)
                    // Continue with local deletion even if Supabase fails
                }
            }

            // Delete locally (this will cascade delete messages and attachments)
            await db.transaction('rw', db.chats, db.messages, db.attachments, async () => {
                const messageIds = await db.messages.where('chatId').equals(Number(chatId)).primaryKeys() as number[]
                await db.attachments.where('messageId').anyOf(messageIds).delete()
                await db.messages.where('chatId').equals(Number(chatId)).delete()
                await db.chats.delete(Number(chatId))
            })
        } catch (error) {
            console.error('Error deleting chat:', error)
            throw error
        }
    }

    /**
     * Update chat (syncs to Supabase if online)
     */
    const updateChat = async (chatId: string, updates: Partial<Chat>): Promise<void> => {
        try {
            const localChat = await db.chats.get(Number(chatId))

            // Update locally
            await db.chats.update(Number(chatId), {
                ...updates,
                updatedAt: new Date(),
                synced: false
            })

            // Update in Supabase if online
            if (isOnline.value && user.value && localChat?.supabaseId) {
                try {
                    const supabaseUpdates: any = {}
                    if (updates.title !== undefined) supabaseUpdates.title = updates.title
                    if (updates.model !== undefined) supabaseUpdates.model = updates.model
                    if (updates.settings !== undefined) supabaseUpdates.settings = updates.settings
                    if (updates.isShared !== undefined) supabaseUpdates.is_shared = updates.isShared

                    const { error } = await supabase
                        .from('chats')
                        .update(supabaseUpdates)
                        .eq('id', localChat.supabaseId)

                    if (error) throw error

                    // Mark as synced
                    await db.chats.update(Number(chatId), { synced: true })
                } catch (supabaseError) {
                    console.error('Failed to update chat in Supabase:', supabaseError)
                }
            }
        } catch (error) {
            console.error('Error updating chat:', error)
            throw error
        }
    }

    /**
     * Helper function to sync a local chat to Supabase
     */
    const syncChatToSupabase = async (chat: any) => {
        if (!user.value) return

        try {
            if (chat.supabaseId) {
                // Update existing chat
                const { error } = await supabase
                    .from('chats')
                    .update({
                        title: chat.title,
                        model: chat.model,
                        settings: chat.settings,
                        is_shared: chat.isShared
                    })
                    .eq('id', chat.supabaseId)

                if (error) throw error
            } else {
                // Create new chat
                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        user_id: user.value.id,
                        title: chat.title,
                        model: chat.model,
                        settings: chat.settings,
                        is_shared: chat.isShared
                    })
                    .select()
                    .single()

                if (error) throw error

                // Update local chat with Supabase ID
                await db.chats.update(chat.id, {
                    supabaseId: data.id,
                    synced: true
                })
            }

            // Mark as synced
            await db.chats.update(chat.id, { synced: true })
        } catch (error) {
            console.error('Error syncing chat to Supabase:', error)
        }
    }

    /**
     * Helper function to sync a local message to Supabase
     */
    const syncMessageToSupabase = async (message: any) => {
        if (!user.value) return

        try {
            const localChat = await db.chats.get(message.chatId)
            if (!localChat?.supabaseId) return // Chat not synced yet

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    chat_id: localChat.supabaseId,
                    content: message.content,
                    role: message.role,
                    model: message.model,
                    tokens: message.tokens,
                    cost: message.cost,
                    attachments: message.attachments || [],
                    error: message.error || false
                })
                .select()
                .single()

            if (error) throw error

            // Update local message with Supabase ID
            await db.messages.update(message.id, {
                supabaseId: data.id,
                synced: true
            })
        } catch (error) {
            console.error('Error syncing message to Supabase:', error)
        }
    }

    return {
        // Status
        isOnline: readonly(isOnline),
        isSyncing: readonly(isSyncing),

        // Core operations
        createChat,
        getUserChats,
        addMessage,
        getChatMessages,
        deleteChat,
        updateChat,

        // Sync operations
        syncPendingChanges,

        // Legacy compatibility (for existing code)
        getChat: async (chatId: string) => {
            const chat = await db.chats.get(Number(chatId))
            return chat ? { ...chat, id: chat.id?.toString() } : undefined
        },

        updateMessage: async (messageId: string, updates: Partial<Message>) => {
            await db.messages.update(Number(messageId), {
                ...updates,
                synced: false
            })
        }
    }
}