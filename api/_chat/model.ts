import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

export const AI_CHAT_MODEL_ID = 'gpt-5.6-luna'

export type CreateChatModel = () => LanguageModel

export const createChatModel: CreateChatModel = () => openai(AI_CHAT_MODEL_ID)
