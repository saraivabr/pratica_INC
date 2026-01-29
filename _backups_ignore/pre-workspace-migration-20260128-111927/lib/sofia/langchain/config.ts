import { ChatOpenAI } from "@langchain/openai";

const ANALYSIS_CONFIG = {
  modelName: "gpt-4o-mini",
  temperature: 0.3,
  maxTokens: 500,
};

const RESPONSE_CONFIG = {
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 800,
};

let _analysisModel: ChatOpenAI | null = null;
let _responseModel: ChatOpenAI | null = null;

export function getAnalysisModel(): ChatOpenAI {
  if (!_analysisModel) {
    _analysisModel = new ChatOpenAI({
      ...ANALYSIS_CONFIG,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _analysisModel;
}

export function getResponseModel(): ChatOpenAI {
  if (!_responseModel) {
    _responseModel = new ChatOpenAI({
      ...RESPONSE_CONFIG,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _responseModel;
}
