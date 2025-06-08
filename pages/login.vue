<template>
  <!-- Main container with a gradient background, centering its content -->
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
    <!-- UCard component for the login form, providing a sleek, modern look -->
    <UCard
        class="w-full max-w-md"
        :ui="{
        background: 'bg-gray-800/50 backdrop-blur-xl', // Apply translucent background with blur effect
        ring: 'ring-1 ring-gray-700', // Define the ring color and thickness for the card border
        body: { padding: 'p-8' } // Set generous padding for the card's main content area
      }"
    >
      <!-- Logo and Header Section -->
      <div class="text-center mb-8">
        <div class="flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-cpu-chip" class="w-12 h-12 text-primary-500" /> <!-- AI-themed icon using Heroicons -->
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Welcome to AI Chat</h1>
        <p class="text-gray-400">Sign in to start chatting with AI models</p>
      </div>

      <!-- Authentication Methods Section -->
      <div class="space-y-4">
        <!-- Google Sign In Button -->
        <UButton
            block
            size="lg"
            color="white"
            variant="solid"
            icon="i-simple-icons-google"
            :loading="isLoading === 'google'"
            @click="signInWithGoogle"
        >
          Continue with Google
        </UButton>

        <!-- GitHub Sign In Button -->
        <UButton
            block
            size="lg"
            color="gray"
            variant="solid"
            icon="i-simple-icons-github"
            :loading="isLoading === 'github'"
            @click="signInWithGitHub"
        >
          Continue with GitHub
        </UButton>

        <!-- Divider with "Or continue with email" text -->
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-600"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 text-gray-400 bg-gray-800">Or continue with email</span>
          </div>
        </div>

        <!-- Email Magic Link Form -->
        <!-- UForm is the main wrapper for the form and handles schema validation and submission. -->
        <UForm
            :schema="schema"
            :state="state"
            @submit="signInWithEmail"
            class="space-y-4"
        >
          <!-- Replaced UFormGroup with UFormField as per request.
               UFormField ties a label, an input, and validation messages together for a single form field.
               The 'name' prop is crucial for connecting it to the UForm's schema validation. -->
          <UFormField label="Email" name="email">
            <UInput
                v-model="state.email"
                type="email"
                placeholder="Enter your email"
                icon="i-heroicons-envelope"
                size="lg"
                :ui="{
                base: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400', // Base input styling
                icon: { leading: { color: 'text-gray-400' } } // Leading icon color
              }"
            />
          </UFormField>

          <UButton
              type="submit"
              block
              size="lg"
              color="primary"
              :loading="isLoading === 'email'"
              icon="i-heroicons-paper-airplane"
          >
            Send Magic Link
          </UButton>
        </UForm>

        <!-- Demo Mode Button -->
        <div class="pt-4 border-t border-gray-700">
          <UButton
              block
              size="lg"
              color="gray"
              variant="outline"
              icon="i-heroicons-eye"
              @click="enterDemoMode"
          >
            Try Demo Mode
          </UButton>
          <p class="text-xs text-gray-500 text-center mt-2">
            Explore the app without signing in (data won't be saved)
          </p>
        </div>
      </div>

      <!-- Success and Error Message Alerts -->
      <UAlert
          v-if="successMessage"
          icon="i-heroicons-check-circle"
          color="green"
          variant="subtle"
          :title="successMessage"
          class="mt-6"
      />

      <UAlert
          v-if="errorMessage"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          variant="subtle"
          :title="errorMessage"
          class="mt-6"
      />

      <!-- Features Preview Section -->
      <div class="mt-8 pt-6 border-t border-gray-700">
        <h3 class="text-sm font-medium text-white mb-3">What you'll get:</h3>
        <div class="space-y-2">
          <div class="flex items-center text-sm text-gray-300">
            <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500 mr-2" />
            Access to 100+ AI models
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500 mr-2" />
            Local-first data storage
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500 mr-2" />
            Real-time sync across devices
          </div>
          <div class="flex items-center text-sm text-gray-300">
            <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500 mr-2" />
            File attachments & image generation
          </div>
        </div>
      </div>

      <!-- Footer Links Section -->
      <div class="mt-8 pt-6 border-t border-gray-700 text-center">
        <div class="flex justify-center space-x-4 text-sm">
          <UButton variant="ghost" color="gray" size="xs">
            Privacy Policy
          </UButton>
          <UButton variant="ghost" color="gray" size="xs">
            Terms of Service
          </UButton>
          <UButton variant="ghost" color="gray" size="xs" @click="navigateTo('/')">
            ← Back to Home
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Decorative Background Elements for visual flair -->
    <div class="absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"></div>
    </div>
  </div>
</template>

<script setup>
// Import Zod for schema validation
import { z } from 'zod'

// Nuxt 3 composables for SEO, Supabase integration, reactivity, routing, and lifecycle hooks
import { useHead, useSupabaseClient, useSupabaseUser, navigateTo, useRoute, reactive, ref, watch, onMounted } from '#imports';

// --- SEO (Meta) Configuration ---
// Sets the page title and description for better search engine visibility.
useHead({
  title: 'Sign In - AI Chat',
  meta: [
    { name: 'description', content: 'Sign in to AI Chat and start conversations with 100+ AI models' }
  ]
})

// --- Supabase Integration ---
// Access the Supabase client instance for authentication operations.
const supabase = useSupabaseClient()
// Access the currently logged-in Supabase user. This is reactive.
const user = useSupabaseUser()

// --- Authentication Redirection ---
// Watches the `user` object for changes. If a user becomes logged in,
// it redirects them to the '/chat' page.
// `immediate: true` ensures the check runs immediately on component mount,
// preventing unnecessary rendering of the login page if already authenticated.
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/chat')
  }
}, { immediate: true })

// --- Form State and Validation Schema ---
// Defines the validation schema for the email input using Zod.
// It ensures the email string is a valid email address.
const schema = z.object({
  email: z.string().email('Invalid email address')
})

// Reactive state for the email input field.
// `reactive` is used for objects with multiple properties.
const state = reactive({
  email: ''
})

// --- Loading and Message States ---
// `isLoading` tracks which authentication method (google, github, email) is currently in progress,
// showing a loading spinner on the respective button.
const isLoading = ref('')
// `successMessage` stores messages to display on successful operations (e.g., magic link sent).
const successMessage = ref('')
// `errorMessage` stores messages to display on failed operations (e.g., sign-in errors).
const errorMessage = ref('')

// --- Message Clearing Utility ---
// Clears both `successMessage` and `errorMessage` after a 5-second delay.
// This provides transient feedback to the user without messages persisting indefinitely.
const clearMessages = () => {
  setTimeout(() => {
    successMessage.value = ''
    errorMessage.value = ''
  }, 5000)
}

// --- Google Sign-In Handler ---
// Initiates the Google OAuth sign-in flow using Supabase.
// It handles setting loading states, clearing previous errors,
// and catches any errors during the authentication process.
const signInWithGoogle = async () => {
  try {
    isLoading.value = 'google' // Set loading state for Google button
    errorMessage.value = '' // Clear any existing error messages

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', // Specify Google as the OAuth provider
      options: {
        redirectTo: `${window.location.origin}/chat` // URL to redirect to after successful Google sign-in
      }
    })

    if (error) throw error // If Supabase returns an error, re-throw it to be caught below

  } catch (error) {
    console.error('Google sign in error:', error) // Log the detailed error for debugging purposes
    errorMessage.value = error.message || 'Failed to sign in with Google' // Display a user-friendly error message
    clearMessages() // Clear messages after a delay
  } finally {
    isLoading.value = '' // Always reset the loading state regardless of success or failure
  }
}

// --- GitHub Sign-In Handler ---
// Initiates the GitHub OAuth sign-in flow, similar to Google sign-in.
const signInWithGitHub = async () => {
  try {
    isLoading.value = 'github' // Set loading state for GitHub button
    errorMessage.value = '' // Clear any existing error messages

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github', // Specify GitHub as the OAuth provider
      options: {
        redirectTo: `${window.location.origin}/chat` // URL to redirect to after successful GitHub sign-in
      }
    })

    if (error) throw error // If Supabase returns an error, re-throw it

  } catch (error) {
    console.error('GitHub sign in error:', error) // Log the detailed error
    errorMessage.value = error.message || 'Failed to sign in with GitHub' // Display a user-friendly error message
    clearMessages() // Clear messages after a delay
  } finally {
    isLoading.value = '' // Reset loading state
  }
}

// --- Email Magic Link Handler ---
// Sends a magic link (OTP) to the provided email address for passwordless authentication.
// It also handles success messages and error displays.
const signInWithEmail = async () => {
  try {
    isLoading.value = 'email' // Set loading state for email button
    errorMessage.value = '' // Clear any existing error messages

    const { error } = await supabase.auth.signInWithOtp({
      email: state.email, // The email entered by the user
      options: {
        emailRedirectTo: `${window.location.origin}/chat` // URL the user will be redirected to after clicking the magic link in their email
      }
    })

    if (error) throw error // If Supabase returns an error, re-throw it

    successMessage.value = `Magic link sent to ${state.email}! Check your inbox.` // Inform the user that the link has been sent
    state.email = '' // Clear the email input field after sending
    clearMessages() // Clear messages after a delay

  } catch (error) {
    console.error('Email sign in error:', error) // Log the detailed error
    errorMessage.value = error.message || 'Failed to send magic link' // Display a user-friendly error message
    clearMessages() // Clear messages after a delay
  } finally {
    isLoading.value = '' // Reset loading state
  }
}

// --- Demo Mode Handler ---
// Allows users to try the app without full authentication.
// It simulates a "demo user" by storing a simple object in localStorage and redirects to the chat.
// Note: Data saved in demo mode will not persist across sessions or be synchronized.
const enterDemoMode = () => {
  // Define a simple demo user object. In a real app, this might be more robust.
  const demoUser = {
    id: 'demo-user',
    email: 'demo@example.com',
    name: 'Demo User',
    isDemo: true
  }

  localStorage.setItem('demoUser', JSON.stringify(demoUser)) // Store demo user data in browser's local storage
  navigateTo('/chat') // Redirect to the chat page for the demo user
}

// --- Supabase Authentication State Change Listener ---
// Subscribes to changes in the Supabase authentication state (e.g., 'SIGNED_IN', 'SIGNED_OUT').
// When a user successfully signs in, this listener triggers.
// It then checks if a corresponding user record exists in a local database (via `useDatabase`)
// and creates one if it doesn't, ensuring local data consistency.
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Dynamically import `useDatabase`. This is a placeholder for your custom composable
    // that interacts with your local application database (e.g., Firestore, IndexedDB, etc.).
    // Replace `useDatabase` with your actual local data management logic.
    const { createUser, getUserBySupabaseId } = useDatabase()

    try {
      // Attempt to retrieve a local user record using the Supabase user ID.
      const localUser = await getUserBySupabaseId(session.user.id)

      // If no local user record is found, create one.
      if (!localUser) {
        await createUser(
            session.user.id, // Supabase user ID
            session.user.email || '', // Supabase user email, or empty string
            session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User' // Derive a name for the local user
        )
      }

      // After handling local user creation/lookup, navigate to the chat page.
      navigateTo('/chat')
    } catch (error) {
      console.error('Error creating local user:', error) // Log any errors that occur during local user creation
    }
  }
})

// --- Handle Authentication Errors from URL ---
// This `onMounted` hook runs when the component is first mounted to the DOM.
// It checks the current URL's query parameters for 'error' and 'error_description'
// (which Supabase often includes on authentication failures) and displays them to the user.
onMounted(() => {
  const route = useRoute() // Access the current route object to read query parameters
  if (route.query.error) {
    errorMessage.value = route.query.error_description || 'Authentication failed' // Display the error description or a generic message
    clearMessages() // Clear the error message after a short period
  }
})
</script>
