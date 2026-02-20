export { AIService } from './aiService';
export { boardTools, type IToolCall, type ToolName } from './tools';
export { compoundBoardTools } from './compoundTools';
export { createToolExecutor, type IToolExecutorContext } from './toolExecutor';
export { createCompoundExecutor, COMPOUND_TOOL_NAMES } from './compoundExecutor';
export { AIError, isRetryableError } from './errors';
export {
  AI_MODEL_GEMINI,
  AI_MODEL_GROQ,
  getModelForProvider,
  getActiveAIProviderConfig,
  type AIProviderId,
} from './providerConfig';
