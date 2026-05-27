import 'dotenv/config';
import { translateGoogle } from './server/utils/googleTranslate.js';
import { callOpenRouterLLM, getSystemPrompt } from './server/utils/openRouterLLM.js';

const MODELS_TO_TEST = [
  'deepseek/deepseek-v4-flash:free',
  'google/gemma-2-9b-it:free',
  'openrouter/free',
  'meta-llama/llama-3-8b-instruct:free'
];

async function runTest() {
  console.log('================================================');
  console.log('   TRANSLATION SYSTEMS DIAGNOSTIC START');
  console.log('================================================');
  console.log('Current local time:', new Date().toLocaleString());
  console.log('Google Key defined:', process.env.GOOGLE_TRANSLATE_API_KEY ? 'Yes' : 'No');
  console.log('OpenRouter Key defined:', process.env.OPENROUTER_API_KEY ? 'Yes' : 'No');
  console.log('================================================\n');

  // 1. Google Translate API Check
  console.log('[1/2] Checking Google Translate API...');
  try {
    const textToTranslate = 'Halo Aditya, selamat pagi. Ini adalah pesan teks pengujian untuk sistem terjemahan Google.';
    const result = await translateGoogle(textToTranslate, 'en');
    console.log('🟢 Google Translate: SUCCESS!');
    console.log('   - Output Text: ', result);
  } catch (err) {
    console.error('🔴 Google Translate: FAILED!');
    console.error('   - Error message: ', err.message);
  }

  console.log('\n------------------------------------------------\n');

  // 2. OpenRouter DeepSeek/AI Check
  console.log('[2/2] Checking OpenRouter LLM (DeepSeek/AI) free models...');
  
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('🔴 OpenRouter LLM: FAILED (API Key not found in environment)');
    return;
  }

  const testText = 'Halo, saya sedang mencoba sistem AI translator ini. Semoga berjalan lancar!';
  const systemPrompt = getSystemPrompt('smartai_bilingual', 'en');

  for (const model of MODELS_TO_TEST) {
    console.log(`Testing model: "${model}"...`);
    try {
      const result = await callOpenRouterLLM(
        `<text_to_translate>${testText}</text_to_translate>`,
        systemPrompt,
        model
      );
      console.log(`🟢 OpenRouter [${model}]: SUCCESS!`);
      console.log('   - Output Text: ', result.trim());
      console.log('');
    } catch (err) {
      console.error(`🔴 OpenRouter [${model}]: FAILED!`);
      console.error('   - Error message: ', err.message);
      console.log('');
    }
  }

  console.log('================================================');
  console.log('   DIAGNOSTIC COMPLETE');
  console.log('================================================');
}

runTest();
