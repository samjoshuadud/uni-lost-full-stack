import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

/**
 * Generates verification questions for a lost item using Gemini AI
 * @param {Object} itemInfo - Information about the lost item
 * @returns {Promise<Array<string>>} Array of generated questions
 */
export async function generateVerificationQuestions(itemInfo) {
  try {
    // Validate API key
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured. Please check your environment variables.');
    }

    let model;
    let result;

    const promptText = `Generate 3-4 verification questions for this lost item:
      Item: ${itemInfo.name}
      Category: ${itemInfo.category}
      Description: ${itemInfo.description}
      Location Found: ${itemInfo.location}
      
      Generate questions that:
      1. Are specific to this item
      2. Only the true owner would know
      3. Are based on the provided description
      4. Are clear and direct
      5. Simple and easy to understand
      6. Are not too difficult to answer
      
      Format the response as a clean list of questions only.
      Each question should be specific and help verify the true owner.
      Do not include any additional text, just the questions.`;

    // If there's an image URL, use the vision model
    if (itemInfo.imageUrl) {
      try {
        model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        
        // Fetch the image
        const imageResponse = await fetch(itemInfo.imageUrl);
        const imageBlob = await imageResponse.blob();
        
        // Convert blob to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imageBlob);
        });

        // Create the image part
        const imagePart = {
          inlineData: {
            data: base64.split(',')[1],
            mimeType: "image/jpeg"
          }
        };

        // Create the prompt parts array
        const promptParts = [
          promptText,
          imagePart
        ];

        result = await model.generateContent(promptParts);
      } catch (imageError) {
        console.warn('Failed to process image, falling back to text-only:', imageError);
        // Fall back to text-only if image processing fails
        model = genAI.getGenerativeModel({ model: "gemini-pro" });
        result = await model.generateContent(promptText);
      }
    } else {
      // Use text-only model if no image
      model = genAI.getGenerativeModel({ model: "gemini-pro" });
      result = await model.generateContent(promptText);
    }

    const response = await result.response;
    const questions = response.text()
      .split('\n')
      .filter(q => q.trim())  // Remove empty lines
      .map(q => q.replace(/^\d+[\.\)]?\s*/, '')); // Remove numbering

    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
} 