// composables/useDatabase.ts
import type { Table } from 'dexie';
import Dexie from 'dexie'

export interface User {
    id?: number
    supabaseId: string
    email: string
    name: string
    avatar?: string
    createdAt: Date
}

export interface Chat {
    id?: number
    title?: string
    userId: number
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
}

export interface Message {
    id?: number
    chatId: number
    content: string
    role: 'user' | 'assistant' | 'system'
    model?: string
    parentId?: number
    branchId?: number
    tokens?: number
    cost?: number
    attachments?: Attachment[]
    streaming?: boolean
    error?: boolean
    createdAt: Date
    synced: boolean
}

export interface Attachment {
    id?: number
    messageId: number
    filename: string
    url: string
    type: 'image' | 'pdf' | 'document'
    size: number
    extractedText?: string
    analysis?: string
}

export interface Branch {
    id?: number
    chatId: number
    title: string
    parentMessageId: number
    createdAt: Date
}

class ChatDatabase extends Dexie {
    users!: Table<User>
    chats!: Table<Chat>
    messages!: Table<Message>
    attachments!: Table<Attachment>
    branches!: Table<Branch>

    constructor() {
        super('ChatDatabase')

        this.version(1).stores({
            users: '++id, supabaseId, email',
            chats: '++id, userId, createdAt, updatedAt',
            messages: '++id, chatId, parentId, branchId, createdAt, synced',
            attachments: '++id, messageId',
            branches: '++id, chatId, parentMessageId'
        })

        // Add hooks for automatic timestamps
        this.chats.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date()
            obj.updatedAt = new Date()
        })

        this.chats.hook('updating', function (modifications, primKey, obj, trans) {
            modifications.updatedAt = new Date()
        })

        this.messages.hook('creating', function (primKey, obj, trans) {
            obj.createdAt = new Date()
            obj.synced = false
        })
    }
}

export const db = new ChatDatabase()

// Database operations composable
export const useDatabase = () => {
    // Chat operations
    const createChat = async (userId: number, model: string, title?: string): Promise<number> => {
        return await db.chats.add({
            userId,
            title: title || 'New Chat',
            model,
            settings: {
                temperature: 0.7,
                maxTokens: 4000
            },
            isShared: false,
            createdAt: new Date(),
            updatedAt: new Date()
        })
    }

    const getUserChats = async (userId: number): Promise<Chat[]> => {
        return await db.chats
            .where('userId')
            .equals(userId)
            .reverse()
            .sortBy('updatedAt')
    }

    const getChat = async (chatId: number): Promise<Chat | undefined> => {
        return await db.chats.get(chatId)
    }

    const deleteChat = async (chatId: number): Promise<void> => {
        await db.transaction('rw', db.chats, db.messages, db.attachments, () => {
            db.chats.delete(chatId)
            db.messages.where('chatId').equals(chatId).delete()
            db.attachments.where('messageId').anyOf(
                db.messages.where('chatId').equals(chatId).primaryKeys()
            ).delete()
        })
    }

    // Message operations
    const addMessage = async (message: Omit<Message, 'id'>): Promise<number> => {
        return await db.messages.add({
            ...message,
            createdAt: new Date(),
            synced: false
        })
    }

    const getChatMessages = async (chatId: number, branchId?: number): Promise<Message[]> => {
        let query = db.messages.where('chatId').equals(chatId)

        if (branchId !== undefined) {
            query = query.and(m => m.branchId === branchId)
        } else {
            query = query.and(m => !m.branchId) // Main branch
        }

        return await query.orderBy('createdAt').toArray()
    }

    const updateMessage = async (messageId: number, updates: Partial<Message>): Promise<void> => {
        await db.messages.update(messageId, {
            ...updates,
            synced: false
        })
    }

    const getMessageById = async (messageId: number): Promise<Message | undefined> => {
        return await db.messages.get(messageId)
    }

    // User operations
    const createUser = async (supabaseId: string, email: string, name: string): Promise<number> => {
        return await db.users.add({
            supabaseId,
            email,
            name,
            createdAt: new Date()
        })
    }

    const getUserBySupabaseId = async (supabaseId: string): Promise<User | undefined> => {
        return await db.users.where('supabaseId').equals(supabaseId).first()
    }

    // Attachment operations
    const addAttachment = async (attachment: Omit<Attachment, 'id'>): Promise<number> => {
        return await db.attachments.add(attachment)
    }

    const getMessageAttachments = async (messageId: number): Promise<Attachment[]> => {
        return await db.attachments.where('messageId').equals(messageId).toArray()
    }

    // Branch operations
    const createBranch = async (chatId: number, parentMessageId: number, title: string): Promise<number> => {
        return await db.branches.add({
            chatId,
            parentMessageId,
            title,
            createdAt: new Date()
        })
    }

    const getChatBranches = async (chatId: number): Promise<Branch[]> => {
        return await db.branches.where('chatId').equals(chatId).toArray()
    }

    // Search operations
    const searchMessages = async (query: string, userId: number): Promise<Message[]> => {
        const userChats = await getUserChats(userId)
        const chatIds = userChats.map(chat => chat.id!).filter(Boolean)

        return await db.messages
            .where('chatId')
            .anyOf(chatIds)
            .and(message =>
                message.content.toLowerCase().includes(query.toLowerCase())
            )
            .limit(50)
            .toArray()
    }

    // Statistics
    const getChatStats = async (userId: number) => {
        const chats = await getUserChats(userId)
        const totalMessages = await db.messages
            .where('chatId')
            .anyOf(chats.map(c => c.id!).filter(Boolean))
            .count()

        const totalTokens = await db.messages
            .where('chatId')
            .anyOf(chats.map(c => c.id!).filter(Boolean))
            .and(m => m.tokens !== undefined)
            .toArray()
            .then(messages => messages.reduce((sum, m) => sum + (m.tokens || 0), 0))

        return {
            totalChats: chats.length,
            totalMessages,
            totalTokens
        }
    }

    return {
        // Chat operations
        createChat,
        getUserChats,
        getChat,
        deleteChat,

        // Message operations
        addMessage,
        getChatMessages,
        updateMessage,
        getMessageById,

        // User operations
        createUser,
        getUserBySupabaseId,

        // Attachment operations
        addAttachment,
        getMessageAttachments,

        // Branch operations
        createBranch,
        getChatBranches,

        // Search operations
        searchMessages,
        getChatStats,

        // Direct database access
        db
    }
}