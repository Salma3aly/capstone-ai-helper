/**
 * Compatibility re-export — delegates to Grok (xAI).
 * All existing imports of askGemini / askGeminiJSON continue to work.
 */
export { grokChat as askGemini, grokChatJSON as askGeminiJSON } from "./grok";
