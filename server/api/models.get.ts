// server/api/models.get.ts
export default defineEventHandler(async (event) => {
    try {
        const config = useRuntimeConfig()

        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${config.public.openrouterApiKey}`
            }
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.statusText}`)
        }

        const data = await response.json()
        return {
            success: true,
            data: data.data
        }
    } catch (error: any) {
        console.error('Models API Error:', error)
        throw createError({
            statusCode: 500,
            statusMessage: `Models API Error: ${error.message}`
        })
    }
})