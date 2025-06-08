<!-- pages/index.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <!-- Navigation -->
    <UContainer>
      <nav class="flex items-center justify-between py-6">
        <div class="flex items-center space-x-2">
          <UIcon name="i-heroicons-cpu-chip" class="w-8 h-8 text-primary-500" />
          <span class="text-xl font-bold text-white">AI Chat</span>
        </div>

        <div class="flex items-center space-x-4">
          <UButton
              v-if="!user"
              variant="ghost"
              color="white"
              @click="navigateTo('/login')"
          >
            Sign In
          </UButton>

          <UButton
              v-if="user"
              variant="solid"
              color="primary"
              @click="navigateTo('/chat')"
          >
            Open Chat
          </UButton>

          <UButton
              v-else
              variant="solid"
              color="primary"
              @click="navigateTo('/login')"
          >
            Get Started
          </UButton>
        </div>
      </nav>
    </UContainer>

    <!-- Hero Section -->
    <UContainer class="py-20">
      <div class="text-center">
        <div class="mb-8">
          <UBadge color="primary" variant="subtle" size="lg">
            🚀 Powered by 100+ AI Models
          </UBadge>
        </div>

        <h1 class="text-5xl md:text-7xl font-bold text-white mb-6">
          Chat with
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            Any AI Model
          </span>
        </h1>

        <p class="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
          Access Claude, GPT-4, Gemini, Llama, and 100+ other AI models in one beautiful interface.
          Local-first, lightning fast, with real-time sync across all your devices.
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <UButton
              size="xl"
              color="primary"
              @click="navigateTo('/login')"
              icon="i-heroicons-rocket-launch"
          >
            Start Chatting
          </UButton>

          <UButton
              size="xl"
              variant="outline"
              color="white"
              @click="scrollToFeatures"
              icon="i-heroicons-play"
          >
            See Demo
          </UButton>
        </div>
      </div>
    </UContainer>

    <!-- Features Grid -->
    <UContainer ref="featuresSection" class="py-20">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-white mb-4">Everything You Need</h2>
        <p class="text-gray-400 text-lg">Powerful features for the ultimate AI chat experience</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <UCard
            v-for="feature in features"
            :key="feature.title"
            class="hover:scale-105 transition-transform duration-200"
            :ui="{
            background: 'bg-gray-800/50 backdrop-blur',
            ring: 'ring-1 ring-gray-700',
            body: { padding: 'p-6' }
          }"
        >
          <div class="text-center">
            <div class="mb-4">
              <UIcon
                  :name="feature.icon"
                  class="w-12 h-12 mx-auto text-primary-500"
              />
            </div>
            <h3 class="text-xl font-semibold text-white mb-2">{{ feature.title }}</h3>
            <p class="text-gray-400">{{ feature.description }}</p>
          </div>
        </UCard>
      </div>
    </UContainer>

    <!-- Model Showcase -->
    <UContainer class="py-20">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold text-white mb-4">Supported AI Models</h2>
        <p class="text-gray-400 text-lg">Choose from the best AI models available</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        <div
            v-for="model in showcaseModels"
            :key="model.name"
            class="text-center p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
        >
          <div class="mb-3">
            <UIcon :name="model.icon" class="w-8 h-8 mx-auto text-gray-300" />
          </div>
          <div class="text-sm font-medium text-white">{{ model.name }}</div>
          <div class="text-xs text-gray-400">{{ model.provider }}</div>
        </div>
      </div>
    </UContainer>

    <!-- Live Demo Section -->
    <UContainer class="py-20">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-white mb-4">See It In Action</h2>
          <p class="text-gray-400 text-lg">Real-time chat interface with multiple AI models</p>
        </div>

        <!-- Mock Chat Interface -->
        <UCard :ui="{
          background: 'bg-gray-800/50 backdrop-blur',
          ring: 'ring-1 ring-gray-700',
          body: { padding: 'p-0' }
        }">
          <!-- Chat Header -->
          <div class="p-4 border-b border-gray-700">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <UAvatar
                    src="https://avatars.githubusercontent.com/u/1234567"
                    size="sm"
                />
                <div>
                  <div class="text-white font-medium">Claude 3.5 Sonnet</div>
                  <div class="text-gray-400 text-sm">Anthropic</div>
                </div>
              </div>

              <UBadge color="green" variant="subtle">
                <UIcon name="i-heroicons-wifi" class="w-3 h-3 mr-1" />
                Online
              </UBadge>
            </div>
          </div>

          <!-- Chat Messages -->
          <div class="p-4 space-y-4 h-64 overflow-y-auto">
            <div class="flex justify-end">
              <div class="bg-primary-600 text-white px-4 py-2 rounded-2xl rounded-tr-md max-w-xs">
                What are the benefits of local-first applications?
              </div>
            </div>

            <div class="flex justify-start">
              <div class="bg-gray-700 text-white px-4 py-2 rounded-2xl rounded-tl-md max-w-sm">
                <div class="typing-indicator" v-if="isTyping">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div v-else>
                  Local-first applications offer several key benefits:

                  • **Instant responsiveness** - No network delays
                  • **Offline functionality** - Works without internet
                  • **Data ownership** - Your data stays on your device
                  • **Better privacy** - No data sent to servers unnecessarily
                </div>
              </div>
            </div>
          </div>

          <!-- Chat Input -->
          <div class="p-4 border-t border-gray-700">
            <div class="flex space-x-2">
              <UInput
                  placeholder="Ask anything..."
                  class="flex-1"
                  readonly
                  :ui="{
                  base: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                }"
              />
              <UButton color="primary" icon="i-heroicons-paper-airplane" />
            </div>
          </div>
        </UCard>
      </div>
    </UContainer>

    <!-- CTA Section -->
    <UContainer class="py-20">
      <UCard :ui="{
        background: 'bg-gradient-to-r from-primary-600 to-primary-700',
        ring: '',
        body: { padding: 'p-12' }
      }">
        <div class="text-center">
          <h2 class="text-3xl font-bold text-white mb-4">
            Ready to Experience the Future of AI Chat?
          </h2>
          <p class="text-primary-100 text-lg mb-8">
            Join thousands of users already chatting with AI models locally and securely.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <UButton
                size="xl"
                color="white"
                @click="navigateTo('/login')"
                icon="i-heroicons-rocket-launch"
            >
              Get Started Free
            </UButton>

            <UButton
                size="xl"
                variant="outline"
                color="white"
                icon="i-simple-icons-github"
                to="https://github.com/yourusername/ai-chat"
                external
            >
              View on GitHub
            </UButton>
          </div>
        </div>
      </UCard>
    </UContainer>

    <!-- Footer -->
    <UContainer class="py-12 border-t border-gray-800">
      <div class="text-center">
        <div class="flex items-center justify-center space-x-2 mb-4">
          <UIcon name="i-heroicons-cpu-chip" class="w-6 h-6 text-primary-500" />
          <span class="text-lg font-bold text-white">AI Chat</span>
        </div>

        <p class="text-gray-400 mb-4">
          Open source, local-first AI chat application
        </p>

        <div class="flex justify-center space-x-6">
          <UButton variant="ghost" color="gray" size="sm" icon="i-simple-icons-github">
            GitHub
          </UButton>
          <UButton variant="ghost" color="gray" size="sm" icon="i-simple-icons-twitter">
            Twitter
          </UButton>
          <UButton variant="ghost" color="gray" size="sm" icon="i-heroicons-document-text">
            Docs
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup>
// Meta;

useHead({
  title: 'AI Chat - Local-First AI Interface',
  meta: [
    { name: 'description', content: 'Chat with 100+ AI models in one beautiful, local-first interface. Access Claude, GPT-4, Gemini, and more.' }
  ]
})

// Auth
const user = useSupabaseUser()

// Features data
const features = [
  {
    title: '100+ AI Models',
    description: 'Access Claude, GPT-4, Gemini, Llama, and many more AI models through one interface.',
    icon: 'i-heroicons-cpu-chip'
  },
  {
    title: 'Local-First',
    description: 'Lightning fast responses with data stored locally. Works offline and syncs when online.',
    icon: 'i-heroicons-bolt'
  },
  {
    title: 'Real-Time Sync',
    description: 'See conversations update in real-time across all your browser windows and tabs.',
    icon: 'i-heroicons-arrow-path'
  },
  {
    title: 'File Attachments',
    description: 'Upload images and PDFs. AI models can analyze and discuss your files.',
    icon: 'i-heroicons-paper-clip'
  },
  {
    title: 'Image Generation',
    description: 'Generate stunning images with DALL-E, Midjourney, and Stable Diffusion.',
    icon: 'i-heroicons-photo'
  },
  {
    title: 'Chat Branching',
    description: 'Explore different conversation paths and compare responses from multiple models.',
    icon: 'i-heroicons-arrows-pointing-out'
  }
]

// Model showcase
const showcaseModels = [
  { name: 'Claude 3.5', provider: 'Anthropic', icon: 'i-heroicons-sparkles' },
  { name: 'GPT-4o', provider: 'OpenAI', icon: 'i-heroicons-cpu-chip' },
  { name: 'Gemini Pro', provider: 'Google', icon: 'i-heroicons-star' },
  { name: 'Llama 3.1', provider: 'Meta', icon: 'i-heroicons-fire' },
  { name: 'DALL-E 3', provider: 'OpenAI', icon: 'i-heroicons-photo' },
  { name: 'Claude 3', provider: 'Anthropic', icon: 'i-heroicons-beaker' }
]

// Demo functionality
const isTyping = ref(true)
const featuresSection = ref(null)

const scrollToFeatures = () => {
  featuresSection.value?.scrollIntoView({ behavior: 'smooth' })
}

// Simulate typing for demo
onMounted(() => {
  setTimeout(() => {
    isTyping.value = false
  }, 2000)
})
</script>

<style scoped>
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  border-radius: 50%;
  background-color: #6b7280;
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
</style>