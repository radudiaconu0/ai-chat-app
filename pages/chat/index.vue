<!-- pages/chat/index.vue -->
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
                :src="currentUser?.avatar"
                :alt="currentUser?.name || currentUser?.email"
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
              class="group relative p-3 rounded-lg cursor-pointer transition-colors text-gray-300 hover:bg-gray-700"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">
                  {{ chat.title || 'New Chat' }}
                </div>
                <div class="text-xs opacity-70 truncate">
                  {{ getModelName(chat.model) }} • {{ formatDate(chat.updatedAt) }}
                </div>
              </div>
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

    <!-- Main Area -->
    <div class="flex-1 flex items-center justify-center bg-gray-900">
      <div class="text-center max-w-md mx-auto px-6">
        <UIcon name="i-heroicons-chat-bubble-left-right" class="w-20 h-20 mx-auto mb-6 text-primary-500" />
        <h2 class="text-2xl font-bold text-white mb-4">Welcome to AI Chat</h2>
        <p class="text-gray-400 mb-8">
          Select an existing chat from the sidebar or start a new conversation with any AI model.
        </p>

        <div class="space-y-4">
          <UButton
              size="lg"
              color="primary"
              @click="createNewChat"
              :loading="isCreatingChat"
              icon="i-heroicons-plus"
          >
            Start Your First Chat
          </UButton>

          <div class="grid grid-cols-2 gap-3">
            <UButton
                variant="outline"
                color="gray"
                size="sm"
                @click="createChatWithModel('anthropic/claude-3.7-sonnet')"
                class="text-left"
            >
              <div>
                <div class="font-medium">Claude 3.5</div>
                <div class="text-xs opacity-70">Anthropic</div>
              </div>
            </UButton>

            <UButton
                variant="outline"
                color="gray"
                size="sm"
                @click="createChatWithModel('openai/gpt-4o')"
                class="text-left"
            >
              <div>
                <div class="font-medium">GPT-4o</div>
                <div class="text-xs opacity-70">OpenAI</div>
              </div>
            </UButton>

            <UButton
                variant="outline"
                color="gray"
                size="sm"
                @click="createChatWithModel('google/gemini-pro-1.5')"
                class="text-left"
            >
              <div>
                <div class="font-medium">Gemini Pro</div>
                <div class="text-xs opacity-70">Google</div>
              </div>
            </UButton>

            <UButton
                variant="outline"
                color="gray"
                size="sm"
                @click="createChatWithModel('meta-llama/llama-3.1-405b-instruct')"
                class="text-left"
            >
              <div>
                <div class="font-medium">Llama 3.1</div>
                <div class="text-xs opacity-70">Meta</div>
              </div>
            </UButton>
          </div>
        </div>

        <!-- Features -->
        <div class="mt-12 pt-8 border-t border-gray-700">
          <h3 class="text-lg font-semibold text-white mb-4">Features</h3>
          <div class="grid grid-cols-1 gap-3 text-sm">
            <div class="flex items-center text-gray-300">
              <UIcon name="i-heroicons-bolt" class="w-4 h-4 mr-2 text-primary-500" />
              Local-first for instant responses
            </div>
            <div class="flex items-center text-gray-300">
              <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2 text-primary-500" />
              Real-time sync across windows
            </div>
            <div class="flex items-center text-gray-300">
              <UIcon name="i-heroicons-paper-clip" class="w-4 h-4 mr-2 text-primary-500" />
              File attachments supported
            </div>
            <div class="flex items-center text-gray-300">
              <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 mr-2 text-primary-500" />
              100+ AI models available
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Meta
useHead({
  title: 'Chat - AI Chat'
})

// Composables
const { models } = useLLM()
const { chats, loadChats, createChatWithSync } = useCrossTabSync()

// Auth
const user = useSupabaseUser()
const demoUser = process.client ? JSON.parse(localStorage.getItem('demoUser') || 'null') : null
const currentUser = user.value || demoUser

// State
const isCreatingChat = ref(false)

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
    click: () => console.log('Settings')
  }],
  [{
    label: 'Sign out',
    icon: 'i-heroicons-arrow-right-on-rectangle',
    click: () => signOut()
  }]
]

// Helper functions
const getModelName = (modelId) => {
  const model = models.find(m => m.id === modelId)
  return model ? model.name : modelId
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString()
}

// Actions
const createNewChat = async () => {
  await createChatWithModel('anthropic/claude-3.7-sonnet')
}

const createChatWithModel = async (modelId) => {
  if (!currentUser) return

  try {
    isCreatingChat.value = true

    let localUser

    if (currentUser.isDemo) {
      // For demo users, just use a hardcoded ID
      localUser = { id: 1 }
    } else {
      // For real users, try to get from database
      const { getUserBySupabaseId, createUser } = useDatabase()
      localUser = await getUserBySupabaseId(currentUser.id)
      
      // If user doesn't exist in local DB, create them
      if (!localUser) {
        console.log('Creating new local user for:', currentUser.email)
        const userId = await createUser(currentUser.id, currentUser.email, currentUser.name || currentUser.email)
        localUser = { id: userId }
      }
    }

    console.log('Local user:', localUser) // Debug log

    if (localUser && localUser.id) {
      const chatId = await createChatWithSync(localUser.id, modelId)
      navigateTo(`/chat/${chatId}`)
    } else {
      console.error('Failed to get or create local user')
      throw new Error('Failed to get or create local user')
    }
  } catch (error) {
    console.error('Error creating chat:', error)
    // Show user-friendly error
    alert('Failed to create chat. Please try again.')
  } finally {
    isCreatingChat.value = false
  }
}

const selectChat = (chatId) => {
  navigateTo(`/chat/${chatId}`)
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

// Initialize
onMounted(async () => {
  if (currentUser) {
    const { getUserBySupabaseId, createUser } = useDatabase()

    let localUser
    if (currentUser?.isDemo) {
      localUser = { id: 1 }
    } else {
      localUser = await getUserBySupabaseId(currentUser.id)
      if (!localUser) {
        const userId = await createUser(currentUser.id, currentUser.email, currentUser.name)
        localUser = { id: userId }
      }
    }

    await loadChats(localUser.id)
  }
})
</script>