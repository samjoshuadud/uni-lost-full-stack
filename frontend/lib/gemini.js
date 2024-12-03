import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

/**
 * Generates verification questions for a lost item using Gemini AI
 * @param {Object} itemInfo - Information about the lost item
 * @returns {Promise<Array<string>>} Array of generated questions
 */
export async function generateVerificationQuestions(itemInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Generate 3-4 verification questions for this lost item:
      Item: ${itemInfo.name}
      Category: ${itemInfo.category}
      Description: ${itemInfo.description}
      Location Found: ${itemInfo.location}
      
      Generate questions that:
      1. Are specific to this item
      2. Only the true owner would know
      3. Are based on the provided description
      4. Are clear and direct
      
      Format the response as a clean list of questions only.
      Each question should be specific and help verify the true owner.
      Do not include any additional text, just the questions.`;
    
    const result = await model.generateContent(prompt);
    const questions = result.response.text()
      .split('\n')
      .filter(q => q.trim())  // Remove empty lines
      .map(q => q.replace(/^\d+[\.\)]?\s*/, '')); // Remove numbering
    
    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    // Return some default questions as fallback
    return [
      "What are the identifying features of this item?",
      "Can you describe any unique marks or characteristics?",
      "Is there anything specific about this item that only the owner would know?"
    ];
  }
} 