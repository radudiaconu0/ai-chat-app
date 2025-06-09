<template>
  <div class="flex h-screen bg-gray-900 text-white">
    <!-- Sidebar -->
    <div class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-bold">AI Chat</h1>
          <UDropdownMenu :items="userMenuItems">
            <UAvatar
                :src="currentUser?.avatar"
                :alt="currentUser?.name || 'User'"
                size="sm"
                class="cursor-pointer"
            />
          </UDropdownMenu>
        </div>

        <UButton
            @click="createNewChat"
            :loading="isCreatingChat"
            class="w-full"
            icon="i-heroicons-plus"
            size="sm"
        >
          New Chat
        </UButton>

        <!-- Online Status -->
        <div class="mt-3 flex items-center justify-between text-xs">
          <div class="flex items-center space-x-2">
            <UIcon
                :name="isOnline ? 'i-heroicons-wifi' : 'i-heroicons-wifi-slash'"
                :class="isOnline ? 'text-green-500' : 'text-red-500'"
                class="w-3 h-3"
            />
            <span class="text-gray-400">
              {{ isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Chat List -->
      <div class="flex-1 overflow-y-auto p-2">
        <div v-if="isLoadingChats" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto" />
          <p class="text-sm text-gray-400 mt-2">Loading chats...</p>
        </div>

        <div v-else-if="chats.length" class="space-y-1">
          <div
              v-for="chat in chats"
              :key="chat.id"
              @click="selectChat(chat.id)"
              :class="[
              'group relative p-3 rounded-lg cursor-pointer transition-colors',
              chat.id === currentChatId ? 'bg-gray-700' : 'hover:bg-gray-700/50'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate">
                  {{ chat.title || 'New Chat' }}
                </h3>
                <p class="text-xs text-gray-400 mt-1">
                  {{ getModelName(chat.model) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatDate(chat.updatedAt) }}
                </p>
              </div>

              <UDropdownMenu :items="getChatMenuItems(chat.id)" :ui="{ content: 'w-32' }">
                <UIcon
                    name="i-heroicons-ellipsis-vertical"
                    class="w-4 h-4 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white cursor-pointer"
                />
              </UDropdownMenu>
            </div>
          </div>
        </div>

        <div v-else class="text-center text-gray-500 py-8">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mx-auto mb-2" />
          <p>No chats yet</p>
          <p class="text-sm">Start a conversation!</p>
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col">
      <!-- Chat Header -->
      <div class="p-4 border-b border-gray-700 bg-gray-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <USelect
                v-model="selectedModel"
                :options="modelOptions"
                placeholder="Select Model"
                class="w-64"
                @change="updateChatModel"
            >
              <template #label>
                <span class="truncate">{{ getModelName(selectedModel) }}</span>
              </template>
            </USelect>

            <UBadge
                :color="isOnline ? 'green' : 'red'"
                variant="subtle"
                size="sm"
            >
              <UIcon
                  :name="isOnline ? 'i-heroicons-wifi' : 'i-heroicons-wifi-slash'"
                  class="w-3 h-3 mr-1"
              />
              {{ isOnline ? 'Online' : 'Offline' }}
            </UBadge>
          </div>

          <div class="flex items-center space-x-2">
            <UButton
                variant="ghost"
                size="sm"
                @click="openSettings"
                icon="i-heroicons-cog-6-tooth"
            >
              Settings
            </UButton>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="isLoadingMessages" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin mx-auto" />
          <p class="text-sm text-gray-400 mt-2">Loading messages...</p>
        </div>

        <div v-else-if="!messages.length" class="text-center py-12">
          <UIcon name="i-heroicons-chat-bubble-left-ellipsis" class="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 class="text-lg font-medium mb-2">Start a conversation</h3>
          <p class="text-gray-400">Send a message to begin chatting with AI</p>
        </div>

        <div v-else>
          <div
              v-for="message in messages"
              :key="message.id"
              :class="[
              'flex mb-6',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            ]"
          >
            <div
                :class="[
                'max-w-3xl rounded-2xl px-4 py-3 relative',
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              ]"
            >
              <!-- Message content -->
              <div v-if="message.content" v-html="formatMessage(message.content)"></div>

              <!-- Attachments -->
              <div v-if="message.attachments?.length" class="mt-2 space-y-2">
                <div
                    v-for="attachment in message.attachments"
                    :key="attachment.id"
                    class="flex items-center space-x-2"
                >
                  <img
                      v-if="attachment.type === 'image'"
                      :src="attachment.url"
                      :alt="attachment.filename"
                      class="max-w-sm rounded-lg"
                  />
                </div>
              </div>

              <!-- Message metadata -->
              <div
                  :class="[
                  'flex items-center justify-between mt-2 pt-2 border-t text-xs',
                  message.role === 'user'
                    ? 'border-blue-500 text-blue-200'
                    : 'border-gray-600 text-gray-400'
                ]"
              >
                <span>{{ formatTime(message.createdAt) }}</span>
                <div class="flex items-center space-x-2">
                  <span v-if="message.model">{{ getModelName(message.model) }}</span>
                  <span v-if="message.tokens">({{ message.tokens }} tokens)</span>
                  <span v-if="message.cost">${{ message.cost.toFixed(4) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Streaming message -->
          <div v-if="streamingMessage" class="flex justify-start mb-6">
            <div class="max-w-3xl rounded-2xl px-4 py-3 bg-gray-700 text-gray-100">
              <div v-html="formatMessage(streamingMessage)"></div>
              <div class="flex items-center mt-2 pt-2 border-t border-gray-600">
                <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin mr-2" />
                <span class="text-xs text-gray-400">AI is typing...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 border-t border-gray-700 bg-gray-800">
        <div class="flex items-end space-x-3">
          <!-- Attachment button -->
          <div class="flex-shrink-0">
            <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileSelect"
            />
            <UButton
                variant="ghost"
                size="sm"
                @click="$refs.fileInput?.click()"
                icon="i-heroicons-paper-clip"
            />
          </div>

          <!-- Message input -->
          <div class="flex-1">
            <UTextarea
                v-model="messageInput"
                placeholder="Type your message..."
                :rows="1"
                autoresize
                @keydown.enter.prevent="sendMessage"
                :disabled="isSending"
                class="min-h-[2.5rem]"
            />

            <!-- Attachments preview -->
            <div v-if="attachments.length" class="mt-2 flex flex-wrap gap-2">
              <div
                  v-for="(file, index) in attachments"
                  :key="index"
                  class="relative bg-gray-700 rounded-lg p-2 flex items-center space-x-2"
              >
                <UIcon name="i-heroicons-photo" class="w-4 h-4" />
                <span class="text-sm truncate max-w-32">{{ file.name }}</span>
                <UButton
                    variant="ghost"
                    size="2xs"
                    @click="removeAttachment(index)"
                    icon="i-heroicons-x-mark"
                />
              </div>
            </div>
          </div>

          <!-- Send button -->
          <div class="flex-shrink-0">
            <UButton
                @click="sendMessage"
                :loading="isSending"
                :disabled="(!messageInput.trim() && !attachments.length) || isSending"
                icon="i-heroicons-paper-airplane"
            >
              Send
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <UModal v-model:open="isSettingsOpen" title="Settings">
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Temperature</label>
            <USlider v-model="chatSettings.temperature" :min="0" :max="2" :step="0.1" />
            <p class="text-xs text-gray-400 mt-1">{{ chatSettings.temperature }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Max Tokens</label>
            <UInput v-model.number="chatSettings.maxTokens" type="number" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">System Prompt</label>
            <UTextarea v-model="chatSettings.systemPrompt" :rows="3" />
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end space-x-2">
          <UButton variant="outline" @click="close">Cancel</UButton>
          <UButton @click="saveSettings">Save</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const route = useRoute()
const { models, getModelsByCapability, prepareMessages, calculateCost } = useLLM()
const {
  createChat,
  getUserChats,
  getChat,
  deleteChat,
  addMessage,
  getChatMessages,
  updateMessage,
  getUserBySupabaseId,
  createUser,
  db
} = useDatabase()

// Authentication
const user = useSupabaseUser()
const demoUser = process.client ? JSON.parse(localStorage.getItem('demoUser') || 'null') : null
const currentUser = user.value || demoUser

// Reactive state
const currentChatId = ref(null)
const selectedModel = ref('anthropic/claude-3.5-sonnet')
const messageInput = ref('')
const attachments = ref([])
const streamingMessage = ref('')

// Data
const chats = ref([])
const messages = ref([])

// UI state
const isLoadingChats = ref(false)
const isLoadingMessages = ref(false)
const isCreatingChat = ref(false)
const isSending = ref(false)
const isSettingsOpen = ref(false)
const isOnline = ref(true)

// Settings
const chatSettings = ref({
  temperature: 0.7,
  maxTokens: 4000,
  systemPrompt: ''
})

// Refs
const messagesContainer = ref(null)
const fileInput = ref(null)

// Computed
const modelOptions = computed(() =>
    getModelsByCapability('text').map(model => ({
      value: model.id,
      label: `${model.name} (${model.provider})`
    }))
)

const userMenuItems = computed(() => [
  [
    {
      label: currentUser?.name || currentUser?.email || 'User',
      type: 'label',
      disabled: true
    }
  ],
  [
    {
      label: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      onSelect: () => openSettings()
    }
  ],
  [
    {
      label: 'Sign out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: () => signOut()
    }
  ]
])

// Methods
const loadChats = async (userId) => {
  try {
    isLoadingChats.value = true
    chats.value = await getUserChats(userId)
  } catch (error) {
    console.error('Error loading chats:', error)
  } finally {
    isLoadingChats.value = false
  }
}

const loadMessages = async (chatId) => {
  try {
    isLoadingMessages.value = true
    messages.value = await getChatMessages(chatId)
    nextTick(() => scrollToBottom())
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    isLoadingMessages.value = false
  }
}

const createNewChat = async () => {
  if (!currentUser) return

  try {
    isCreatingChat.value = true

    let localUser
    if (currentUser.isDemo) {
      localUser = { id: 1 }
    } else {
      localUser = await getUserBySupabaseId(currentUser.id)
      if (!localUser) {
        const userId = await createUser(currentUser.id, currentUser.email, currentUser.name || currentUser.email)
        localUser = { id: userId }
      }
    }

    if (localUser?.id) {
      const chatId = await createChat(localUser.id, selectedModel.value)
      await loadChats(localUser.id)
      navigateTo(`/chat/${chatId}`)
    }
  } catch (error) {
    console.error('Error creating chat:', error)
  } finally {
    isCreatingChat.value = false
  }
}

const selectChat = (chatId) => {
  if (chatId !== currentChatId.value) {
    navigateTo(`/chat/${chatId}`)
  }
}

const updateChatModel = async () => {
  if (currentChatId.value) {
    await db.chats.update(currentChatId.value, { model: selectedModel.value })
  }
}

const sendMessage = async () => {
  if ((!messageInput.value.trim() && !attachments.value.length) || isSending.value) return

  try {
    isSending.value = true
    const userMessageContent = messageInput.value
    const userAttachments = [...attachments.value]

    // Clear input immediately
    messageInput.value = ''
    attachments.value = []

    // Add user message
    await addMessage({
      chatId: currentChatId.value,
      content: userMessageContent,
      role: 'user',
      attachments: userAttachments.map(file => ({
        filename: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: file.size
      }))
    })

    // Refresh messages
    await loadMessages(currentChatId.value)

    // Prepare messages for API
    const apiMessages = prepareMessages(messages.value)

    // Add system prompt if configured
    if (chatSettings.value.systemPrompt) {
      apiMessages.unshift({
        role: 'system',
        content: chatSettings.value.systemPrompt
      })
    }

    // Stream AI response
    streamingMessage.value = ''
    let fullResponse = ''

    try {
      // Try server API first
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: selectedModel.value,
          temperature: chatSettings.value.temperature,
          maxTokens: chatSettings.value.maxTokens,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Server API error: ${response.status}`)
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
                nextTick(() => scrollToBottom())
              } else if (data.finished) {
                // Save AI response
                const selectedModelObj = models.find(m => m.id === selectedModel.value)
                const cost = data.usage && selectedModelObj ? calculateCost(
                    selectedModelObj,
                    data.usage.prompt_tokens || 0,
                    data.usage.completion_tokens || 0
                ) : undefined

                await addMessage({
                  chatId: currentChatId.value,
                  content: fullResponse,
                  role: 'assistant',
                  model: selectedModel.value,
                  tokens: data.usage?.total_tokens,
                  cost
                })

                streamingMessage.value = ''
                await loadMessages(currentChatId.value)

                // Update chat title if needed
                const chat = await getChat(currentChatId.value)
                if (chat && chat.title === 'New Chat' && fullResponse) {
                  const title = userMessageContent.slice(0, 50) + (userMessageContent.length > 50 ? '...' : '')
                  await db.chats.update(currentChatId.value, { title })
                  await loadChats(currentUser.isDemo ? 1 : currentUser.id)
                }

                return // Exit successfully
              } else if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e)
            }
          }
        }
      }
    } catch (apiError) {
      console.error('Server API Error, falling back to client-side:', apiError)

      // Fallback to client-side API call
      try {
        const { sendMessage: llmSendMessage, handleStreamResponse } = useLLM()

        const completion = await llmSendMessage(
            apiMessages,
            selectedModel.value,
            {
              temperature: chatSettings.value.temperature,
              maxTokens: chatSettings.value.maxTokens,
              stream: true
            }
        )

        // Handle streaming response
        if (completion && typeof completion[Symbol.asyncIterator] === 'function') {
          for await (const chunk of handleStreamResponse(completion)) {
            if (chunk.content) {
              streamingMessage.value += chunk.content
              fullResponse += chunk.content
              nextTick(() => scrollToBottom())
            } else if (chunk.finished) {
              // Save AI response
              const selectedModelObj = models.find(m => m.id === selectedModel.value)
              const cost = chunk.usage && selectedModelObj ? calculateCost(
                  selectedModelObj,
                  chunk.usage.prompt_tokens || 0,
                  chunk.usage.completion_tokens || 0
              ) : undefined

              await addMessage({
                chatId: currentChatId.value,
                content: fullResponse,
                role: 'assistant',
                model: selectedModel.value,
                tokens: chunk.usage?.total_tokens,
                cost
              })

              streamingMessage.value = ''
              await loadMessages(currentChatId.value)

              // Update chat title if needed
              const chat = await getChat(currentChatId.value)
              if (chat && chat.title === 'New Chat' && fullResponse) {
                const title = userMessageContent.slice(0, 50) + (userMessageContent.length > 50 ? '...' : '')
                await db.chats.update(currentChatId.value, { title })
                await loadChats(currentUser.isDemo ? 1 : currentUser.id)
              }

              break
            } else if (chunk.error) {
              throw new Error(chunk.error)
            }
          }
        }
      } catch (clientError) {
        console.error('Client-side API Error:', clientError)
        await addMessage({
          chatId: currentChatId.value,
          content: 'Sorry, there was an error processing your request. Please check your API key configuration and try again.',
          role: 'assistant',
          error: true
        })
        await loadMessages(currentChatId.value)
      }
    }

  } catch (error) {
    console.error('Error sending message:', error)
    await addMessage({
      chatId: currentChatId.value,
      content: 'An unexpected error occurred. Please try again.',
      role: 'assistant',
      error: true
    })
    await loadMessages(currentChatId.value)
  } finally {
    isSending.value = false
    streamingMessage.value = ''
  }
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files || [])
  attachments.value.push(...files)
}

const removeAttachment = (index) => {
  attachments.value.splice(index, 1)
}

const getChatMenuItems = (chatId) => [
  [
    {
      label: 'Rename',
      icon: 'i-heroicons-pencil',
      onSelect: () => renameChat(chatId)
    }
  ],
  [
    {
      label: 'Delete',
      icon: 'i-heroicons-trash',
      color: 'error',
      onSelect: () => deleteChatConfirm(chatId)
    }
  ]
]

const renameChat = async (chatId) => {
  const newTitle = prompt('Enter new chat title:')
  if (newTitle) {
    await db.chats.update(chatId, { title: newTitle })
    const userId = currentUser.isDemo ? 1 : currentUser.id
    await loadChats(userId)
  }
}

const deleteChatConfirm = async (chatId) => {
  if (confirm('Are you sure you want to delete this chat?')) {
    await deleteChat(chatId)
    const userId = currentUser.isDemo ? 1 : currentUser.id
    await loadChats(userId)

    if (chatId === currentChatId.value) {
      navigateTo('/chat')
    }
  }
}

const openSettings = () => {
  isSettingsOpen.value = true
}

const saveSettings = async () => {
  if (currentChatId.value) {
    await db.chats.update(currentChatId.value, {
      settings: chatSettings.value
    })
  }
  isSettingsOpen.value = false
}

const signOut = async () => {
  if (currentUser?.isDemo) {
    localStorage.removeItem('demoUser')
  } else {
    const supabase = useSupabaseClient()
    await supabase.auth.signOut()
  }
  navigateTo('/login')
}

// Utility functions
const getModelName = (modelId) => {
  const model = models.find(m => m.id === modelId)
  return model ? model.name : modelId
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatMessage = (content) => {
  return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 rounded bg-gray-600">$1</code>')
      .replace(/\n/g, '<br>')
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Lifecycle
onMounted(async () => {
  const chatId = parseInt(route.params.id)

  if (chatId && !isNaN(chatId)) {
    currentChatId.value = chatId
    await loadMessages(chatId)

    // Load chat details for model selection
    const chat = await getChat(chatId)
    if (chat) {
      selectedModel.value = chat.model
      chatSettings.value = {
        ...chatSettings.value,
        ...(chat.settings || {})
      }
    }
  }

  // Load user's chats
  if (currentUser) {
    let localUser
    if (currentUser.isDemo) {
      localUser = { id: 1 }
    } else {
      localUser = await getUserBySupabaseId(currentUser.id)
      if (!localUser) {
        const userId = await createUser(currentUser.id, currentUser.email, currentUser.name)
        localUser = { id: userId }
      }
    }

    if (localUser) await loadChats(localUser.id)
  }

  // Check online status
  if (process.client) {
    isOnline.value = navigator.onLine
    window.addEventListener('online', () => { isOnline.value = true })
    window.addEventListener('offline', () => { isOnline.value = false })
  }
})

// Watch for route changes
watch(() => route.params.id, async (newId) => {
  if (newId && !isNaN(parseInt(newId))) {
    currentChatId.value = parseInt(newId)
    await loadMessages(parseInt(newId))

    const chat = await getChat(parseInt(newId))
    if (chat) {
      selectedModel.value = chat.model
      chatSettings.value = {
        ...chatSettings.value,
        ...(chat.settings || {})
      }
    }
  }
})
</script>