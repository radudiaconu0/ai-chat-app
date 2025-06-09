// types/database.types.ts
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            attachments: {
                Row: {
                    analysis: string | null
                    created_at: string
                    extracted_text: string | null
                    filename: string
                    id: string
                    message_id: string
                    size: number
                    type: string
                    url: string
                }
                Insert: {
                    analysis?: string | null
                    created_at?: string
                    extracted_text?: string | null
                    filename: string
                    id?: string
                    message_id: string
                    size: number
                    type: string
                    url: string
                }
                Update: {
                    analysis?: string | null
                    created_at?: string
                    extracted_text?: string | null
                    filename?: string
                    id?: string
                    message_id?: string
                    size?: number
                    type?: string
                    url?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "attachments_message_id_fkey"
                        columns: ["message_id"]
                        isOneToOne: false
                        referencedRelation: "messages"
                        referencedColumns: ["id"]
                    }
                ]
            }
            branches: {
                Row: {
                    chat_id: string
                    created_at: string
                    id: string
                    parent_message_id: string
                    title: string
                }
                Insert: {
                    chat_id: string
                    created_at?: string
                    id?: string
                    parent_message_id: string
                    title: string
                }
                Update: {
                    chat_id?: string
                    created_at?: string
                    id?: string
                    parent_message_id?: string
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "branches_chat_id_fkey"
                        columns: ["chat_id"]
                        isOneToOne: false
                        referencedRelation: "chats"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "branches_parent_message_id_fkey"
                        columns: ["parent_message_id"]
                        isOneToOne: false
                        referencedRelation: "messages"
                        referencedColumns: ["id"]
                    }
                ]
            }
            chats: {
                Row: {
                    created_at: string
                    id: string
                    is_shared: boolean | null
                    model: string
                    settings: Json | null
                    share_id: string | null
                    title: string | null
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    is_shared?: boolean | null
                    model: string
                    settings?: Json | null
                    share_id?: string | null
                    title?: string | null
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    is_shared?: boolean | null
                    model?: string
                    settings?: Json | null
                    share_id?: string | null
                    title?: string | null
                    updated_at?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "chats_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            messages: {
                Row: {
                    attachments: Json | null
                    branch_id: string | null
                    chat_id: string
                    content: string
                    cost: number | null
                    created_at: string
                    error: boolean | null
                    id: string
                    model: string | null
                    parent_id: string | null
                    role: string
                    streaming: boolean | null
                    tokens: number | null
                }
                Insert: {
                    attachments?: Json | null
                    branch_id?: string | null
                    chat_id: string
                    content: string
                    cost?: number | null
                    created_at?: string
                    error?: boolean | null
                    id?: string
                    model?: string | null
                    parent_id?: string | null
                    role: string
                    streaming?: boolean | null
                    tokens?: number | null
                }
                Update: {
                    attachments?: Json | null
                    branch_id?: string | null
                    chat_id?: string
                    content?: string
                    cost?: number | null
                    created_at?: string
                    error?: boolean | null
                    id?: string
                    model?: string | null
                    parent_id?: string | null
                    role?: string
                    streaming?: boolean | null
                    tokens?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "messages_chat_id_fkey"
                        columns: ["chat_id"]
                        isOneToOne: false
                        referencedRelation: "chats"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "messages_parent_id_fkey"
                        columns: ["parent_id"]
                        isOneToOne: false
                        referencedRelation: "messages"
                        referencedColumns: ["id"]
                    }
                ]
            }
            users: {
                Row: {
                    avatar_url: string | null
                    created_at: string
                    email: string
                    id: string
                    name: string | null
                    updated_at: string
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string
                    email: string
                    id: string
                    name?: string | null
                    updated_at?: string
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string
                    email?: string
                    id?: string
                    name?: string | null
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "users_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}