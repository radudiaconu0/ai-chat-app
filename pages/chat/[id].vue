<!-- pages/chat/[id].vue -->
<template>
  <div class="h-screen bg-gray-900 flex">
    <!-- Sidebar -->
    <div class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-2">
            <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 text-primary-500" />
            <span class="font-semibold text-white">AI Chat</span>
          </div>

          <UDropdownMenu :items="userMenuItems" :popper="{ placement: 'bottom-start' }">
            <UAvatar
                :src="user?.user_metadata?.avatar_url"
                :alt="user?.user_metadata?.full_name || user?.email"
                size="sm"
                class="cursor-pointer"
            />
          </UDropdownMenu>
        </div>

        <UButton
            block
            color="primary"
            icon="i-heroicons-plus"
            @click="createNewChat"
            :loading="isCreatingChat"
        >
          New Chat
        </UButton>
      </div>

      <!-- Chat List -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-2">
          <div
              v-for="chat in chats"
              :key="chat.id"
              @click="selectChat(chat.id)"
              class="group relative p-3 rounded-lg cursor-pointer transition-colors"
              :class="{
              'bg-primary-600 text-white': chat.id === currentChatId,
              'text-gray-300 hover:bg-gray-700': chat.id !== currentChatId
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">
                  {{ chat.title || 'New Chat' }}
                </div>
                <div class="text-xs opacity-70 truncate">
                  {{ chat.model }} • {{ formatDate(chat.updatedAt) }}
                </div>
              </div>

              <UDropdownMenu
                  v-if="chat.id === currentChatId"
                  :items="chatMenuItems"
                  @click.stop
                  :popper="{ placement: 'bottom-end' }"
              >
                <UButton
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-ellipsis-vertical"
                    class="opacity-0 group-hover:opacity-100"
                />
              </UDropdownMenu>
            </div>
          </div>

          <div v-if="!chats.length" class="text-center text-gray-500 py-8">
            <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mx-auto mb-2" />
            <p>No chats yet</p>
            <p class="text-sm">Start a conversation!</p>
          </div>
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
                class="w-48"
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

            <UBadge
                v-if="isAnyoneTyping"
                color="blue"
                variant="subtle"
                size="sm"
            >
              <div class="flex items-center">
                <div class="typing-indicator mr-2">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Other window typing...
              </div>
            </UBadge>
          </div>

          <div class="flex items-center space-x-2">
            <UButton
                variant="ghost"
                color="gray"
                icon="i-heroicons-share"
                @click="shareChat"
            >
              Share
            </UButton>

            <UButton
                variant="ghost"
                color="gray"
                icon="i-heroicons-cog-6-tooth"
                @click="openSettings"
            >
              Settings
            </UButton>
          </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4"
      >
        <div v-if="!messages.length" class="text-center text-gray-500 py-16">
          <UIcon name="i-heroicons-sparkles" class="w-16 h-16 mx-auto mb-4 text-primary-500" />
          <h3 class="text-xl font-semibold mb-2">Start a conversation</h3>
          <p>Ask anything, upload files, or generate images</p>
        </div>

        <div
            v-for="message in messages"
            :key="message.id"
            class="flex"
            :class="{
            'justify-end': message.role === 'user',
            'justify-start': message.role === 'assistant'
          }"
        >
          <div
              class="max-w-3xl rounded-2xl px-4 py-3"
              :class="{
              'bg-primary-600 text-white rounded-tr-md': message.role === 'user',
              'bg-gray-700 text-white rounded-tl-md': message.role === 'assistant'
            }"
          >
            <!-- Message Header -->
            <div v-if="message.role === 'assistant'" class="flex items-center mb-2 text-xs text-gray-300">
              <UIcon name="i-heroicons-cpu-chip" class="w-3 h-3 mr-1" />
              {{ getModelName(message.model) }}
              <span v-if="message.tokens" class="ml-2">
                • {{ message.tokens }} tokens
              </span>
              <span v-if="message.cost" class="ml-2">
                • ${{ message.cost.toFixed(4) }}
              </span>
            </div>

            <!-- Attachments -->
            <div v-if="message.attachments?.length" class="mb-3">
              <div class="grid grid-cols-2 gap-2">
                <div
                    v-for="attachment in message.attachments"
                    :key="attachment.id"
                    class="relative"
                >
                  <img
                      v-if="attachment.type === 'image'"
                      :src="attachment.url"
                      :alt="attachment.filename"
                      class="rounded-lg max-w-full h-32 object-cover"
                  />

                  <div
                      v-else
                      class="flex items-center p-2 rounded-lg"
                  >
                    <UIcon name="i-heroicons-document" class="w-4 h-4 mr-2" />
                    <span class="text-xs truncate">{{ attachment.filename }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Message Content -->
            <div class="prose prose-sm max-w-none">
              <div v-if="message.streaming" class="flex items-center">
                <span v-html="formatMessage(message.content)"></span>
                <div class="typing-indicator ml-2">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div v-else v-html="formatMessage(message.content)"></div>
            </div>

            <!-- Error State -->
            <div v-if="message.error" class="mt-2">
              <UAlert
                  icon="i-heroicons-exclamation-triangle"
                  color="red"
                  variant="subtle"
                  title="Error generating response"
                  :description="message.content"
              />
            </div>

            <!-- Message Actions -->
            <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>{{ formatTime(message.createdAt) }}</span>

              <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                <UButton
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-clipboard"
                    @click="copyMessage(message.content)"
                />

                <UButton
                    v-if="message.role === 'assistant'"
                    variant="ghost"
                    color="gray"
                    size="xs"
                    icon="i-heroicons-arrow-path"
                    @click="regenerateMessage(message)"
                />

                <UButton
                  v-if="message.id"
                  variant="ghost"
                  color="gray"
                  size="xs"
                  icon="i-heroicons-hand-thumb-up"
                  @click="reactToMessage(message.id, '👍')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-4 border-t border-gray-700 bg-gray-800">
        <div class="flex items-end space-x-2">
          <!-- File Upload -->
          <UButton
              variant="ghost"
              color="gray"
              icon="i-heroicons-paper-clip"
              @click="triggerFileUpload"
          />

          <!-- Input Field -->
          <div class="flex-1">
            <UTextarea
                v-model="messageInput"
                placeholder="Type your message... (Shift+Enter for new line)"
                :rows="1"
                autoresize
                :maxrows="5"
                @keydown="handleKeydown"
                @input="handleTyping"
                class="resize-none"
                :ui="{
                base: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-primary-500'
              }"
            />

            <!-- Attachment Preview -->
            <div v-if="attachments.length" class="mt-2 flex flex-wrap gap-2">
              <div
                  v-for="(attachment, index) in attachments"
                  :key="index"
                  class="relative inline-flex items-center rounded-lg p-2"
              >
                <UIcon name="i-heroicons-document" class="w-4 h-4 mr-2" />
                <span class="text-xs">{{ attachment.name }}</span>
                <UButton
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-mark"
                    @click="removeAttachment(index)"
                    class="ml-2"
                />
              </div>
            </div>
          </div>

          <!-- Send Button -->
          <UButton
              color="primary"
              icon="i-heroicons-paper-airplane"
              :disabled="!messageInput.trim() && !attachments.length"
              :loading="isSending"
              @click="sendMessage"
          />
        </div>

        <!-- Model Info -->
        <div class="mt-2 text-xs text-gray-500">
          Model: {{ getModelName(selectedModel) }}
          <span v-if="getModelCost(selectedModel)">
            • ${{ getModelCost(selectedModel) }}/1K tokens
          </span>
        </div>
      </div>
    </div>

    <!-- Hidden File Input -->
    <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md"
        class="hidden"
        @change="handleFileUpload"
    />
  </div>
</template>

<script setup lang="ts">
// Meta
useHead({
  title: 'Chat - AI Chat'
})

// Composables
const route = useRoute()
const user = useSupabaseUser()
const { models, sendMessage: callLLM, handleStreamResponse, prepareMessages } = useLLM()
const {
  messages,
  chats,
  currentChatId,
  isAnyoneTyping,
  loadMessages,
  loadChats,
  addMessageWithSync,
  updateMessageWithSync,
  createChatWithSync,
  deleteChatWithSync,
  broadcastStreamingChunk,
  broadcastTyping
} = useCrossTabSync()

// Reactive state
const selectedModel = ref('anthropic/claude-3.5-sonnet')
const messageInput = ref('')
const attachments = ref([])
const isSending = ref(false)
const isCreatingChat = ref(false)
const isOnline = useOnline()
const messagesContainer = ref(null)
const fileInput = ref(null)

// Demo mode support
const demoUser = import.meta.client ? JSON.parse(localStorage.getItem('demoUser') || 'null') : null
const currentUser = user.value || demoUser

// Redirect if not authenticated
// if (!currentUser) {
//   navigateTo('/login')
// }

// Model options for select
const modelOptions = computed(() =>
    models.filter(m => m.capabilities.includes('text')).map(model => ({
      value: model.id,
      label: `${model.name} (${model.provider})`
    }))
)

// User menu items
const userMenuItems = [
  [{
    label: currentUser?.name || currentUser?.email || 'User',
    slot: 'account',
    disabled: true
  }],
  [{
    label: 'Settings',
    icon: 'i-heroicons-cog-6-tooth',
    click: () => openSettings()
  }],
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: () => signOut()
  }]
]

// Chat menu items
const chatMenuItems = [
  [{
    label: 'Rename',
    icon: 'i-heroicons-pencil',
    click: () => renameChat()
  }, {
    label: 'Share',
    icon: 'i-heroicons-share',
    click: () => shareChat()
  }],
  [{
    label: 'Delete',
    icon: 'i-heroicons-trash',
    click: () => deleteCurrentChat()
  }]
]

// Initialize
onMounted(async () => {
  const chatId = parseInt(route.params.id)

  if (chatId && !isNaN(chatId)) {
    currentChatId.value = chatId
    await loadMessages(chatId)

    // Load chat details for model selection
    const { getChat } = useDatabase()
    const chat = await getChat(chatId)
    if (chat) {
      selectedModel.value = chat.model
    }
  }

  // Load user's chats
  if (currentUser) {
    const { getUserBySupabaseId, createUser } = useDatabase()

    let localUser
    if (currentUser?.isDemo) {
      localUser = { id: 1 } // Demo user ID
    } else {
      localUser = await getUserBySupabaseId(currentUser.id)
      if (!localUser) {
        const userId = await createUser(currentUser.id, currentUser.email, currentUser.name)
        localUser = { id: userId }
      }
    }

    await loadChats(localUser.id)
  }

  // Auto-scroll to bottom
  nextTick(() => {
    scrollToBottom()
  })
})

// Helper functions
const getModelName = (modelId) => {
  const model = models.find(m => m.id === modelId)
  return model ? model.name : modelId
}

const getModelCost = (modelId) => {
  const model = models.find(m => m.id === modelId)
  return model ? (model.pricing.prompt / 1000).toFixed(3) : null
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatMessage = (content) => {
  // Simple markdown-like formatting
  return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>')
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Chat actions
const createNewChat = async () => {
  // if (!currentUser) return

  try {
    isCreatingChat.value = true

    const { getUserBySupabaseId } = useDatabase()
    let localUser

    if (currentUser?.isDemo) {
      localUser = { id: 1 }
    } else {
      localUser = await getUserBySupabaseId(currentUser.id)
    }

    if (localUser) {
      const chatId = await createChatWithSync(localUser.id, selectedModel.value)
      navigateTo(`/chat/${chatId}`)
    }
  } catch (error) {
    console.error('Error creating chat:', error)
  } finally {
    isCreatingChat.value = false
  }
}

const selectChat = (chatId) => {
  navigateTo(`/chat/${chatId}`)
}

const updateChatModel = async () => {
  if (currentChatId.value) {
    const { db } = useDatabase()
    await db.chats.update(currentChatId.value, { model: selectedModel.value })
  }
}

// Message actions
const sendMessage = async () => {
  if ((!messageInput.value.trim() && !attachments.value.length) || isSending.value) return

  try {
    isSending.value = true

    // Add user message
    const userMessage = {
      chatId: currentChatId.value,
      content: messageInput.value,
      role: 'user',
      attachments: attachments.value.map(file => ({
        filename: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: file.size
      }))
    }
    await addMessageWithSync(userMessage);
// Clear input
    messageInput.value = ''
    attachments.value = []

    // Scroll to bottom
    await nextTick(() => scrollToBottom())

    // Create assistant message placeholder
    const assistantMessage = {
      chatId: currentChatId.value,
      content: '',
      role: 'assistant',
      model: selectedModel.value,
      streaming: true
    }

    const assistantMessageId = await addMessageWithSync(assistantMessage)

    // Prepare messages for API
    const apiMessages = prepareMessages(messages.value.filter(m => !m.streaming))

    // Send to LLM
    const stream = await callLLM(apiMessages, selectedModel.value, { stream: true })

    let fullContent = ''
    let tokenCount = 0

    for await (const chunk of handleStreamResponse(stream)) {
      if (chunk.content) {
        fullContent += chunk.content
        tokenCount++

        // Update message locally and broadcast
        await updateMessageWithSync(assistantMessageId, {
          content: fullContent,
          streaming: !chunk.finished
        })

        // Broadcast to other windows
        broadcastStreamingChunk(assistantMessageId, fullContent, currentChatId.value)

        // Auto-scroll
        nextTick(() => scrollToBottom())
      }

      if (chunk.finished) {
        // Calculate cost estimate
        const model = models.find(m => m.id === selectedModel.value)
        const estimatedCost = model ? (tokenCount / 1000) * (model.pricing.completion / 1000) : 0

        await updateMessageWithSync(assistantMessageId, {
          streaming: false,
          tokens: tokenCount,
          cost: estimatedCost,
          error: !!chunk.error
        })

        if (chunk.error) {
          console.error('LLM Error:', chunk.error)
        }
      }
    }

  } catch (error) {
    console.error('Error sending message:', error)

    // Update with error
    await updateMessageWithSync(assistantMessageId, {
      content: 'Error: Failed to get response from AI model.',
      streaming: false,
      error: true
    })
  } finally {
    isSending.value = false
  }
}

// Input handling
const handleKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

let typingTimeout
const handleTyping = () => {
  broadcastTyping(true, currentChatId.value)

  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    broadcastTyping(false, currentChatId.value)
  }, 1000)
}

// File handling
const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileUpload = (event) => {
  const files = Array.from(event.target.files)
  attachments.value.push(...files)
}

const removeAttachment = (index) => {
  attachments.value.splice(index, 1)
}

// Message actions
const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    // Show toast notification
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

const regenerateMessage = async (message) => {
  // Implementation for regenerating a message
  console.log('Regenerating message:', message.id)
}

const reactToMessage = async (messageId, emoji) => {
  // Implementation for message reactions
  console.log('React to message:', messageId, emoji)
}

// Other actions
const shareChat = () => {
  console.log('Share chat')
}

const openSettings = () => {
  console.log('Open settings')
}

const renameChat = () => {
  console.log('Rename chat')
}

const deleteCurrentChat = async () => {
  if (currentChatId.value) {
    await deleteChatWithSync(currentChatId.value)
    navigateTo('/chat')
  }
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

// Watch for route changes
watch(() => route.params.id, async (newId) => {
  if (newId && !isNaN(parseInt(newId))) {
    currentChatId.value = parseInt(newId)
    await loadMessages(currentChatId.value)

    // Load chat model
    const { getChat } = useDatabase()
    const chat = await getChat(currentChatId.value)
    if (chat) {
      selectedModel.value = chat.model
    }
  }
})

// Watch messages for auto-scroll
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })
</script>

<style scoped>
.typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  height: 6px;
  width: 6px;
  border-radius: 50%;
  background-color: #9ca3af;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* .prose code {
  @apply bg-gray-600 px-1 rounded text-sm;
} */
</style>