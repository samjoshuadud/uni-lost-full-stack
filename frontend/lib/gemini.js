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

    const promptText = `Generate 3-4 simple verification questions for this lost item:
      Item: ${itemInfo.name}
      Category: ${itemInfo.category}
      Description: ${itemInfo.description}
      Location Found: ${itemInfo.location}
      
      Generate questions that:
      1. Are very basic and straightforward
      2. Focus on simple visible features (color, brand)
      3. Require short, one-word answers
      4. Ask "what" instead of "is it"
      5. Are based on obvious characteristics
      6. Avoid complex details
      
      Format the response as a clean list of questions only.
      Example types of questions:
      - What color is the item?
      - What brand is the item?
      - What material is it made of?
      
      Do not include any additional text, just the questions.
      Do not generate yes/no questions.`;

    // If there's an image URL, use the vision model
    if (itemInfo.imageUrl) {
      try {
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
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
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        result = await model.generateContent(promptText);
      }
    } else {
      // Use text-only model if no image
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

// Add this new function
export async function rankItemSimilarity(lostItem, foundItems) {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    const promptText = `
    Compare this lost item with a list of found items and rank them by similarity.
    Consider matching these attributes: name, category, description, and location.
    
    Lost Item:
    Name: ${lostItem.name}
    Category: ${lostItem.category}
    Description: ${lostItem.description}
    Location: ${lostItem.location}

    Found Items:
    ${foundItems.map((item, index) => `
    Item ${index + 1}:
    Name: ${item.item?.name}
    Category: ${item.item?.category}
    Description: ${item.item?.description}
    Location: ${item.item?.location}
    `).join('\n')}

    Return a JSON array of objects containing the item index and similarity percentage.
    Example: [{"index": 2, "similarity": 85}, {"index": 1, "similarity": 60}]
    Important: Return ONLY the array, no markdown formatting or additional text.
    Ensure similarity is a number between 0-100.
    `;

    const result = await model.generateContent(promptText);
    const response = await result.response;
    
    // Clean up the response text
    const cleanedResponse = response.text()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Parse the cleaned response as JSON array
    const rankings = JSON.parse(cleanedResponse);
    
    // Map the rankings to the original items with similarity scores
    return rankings.map(ranking => ({
      ...foundItems[ranking.index - 1],
      similarityScore: ranking.similarity
    }));

  } catch (error) {
    console.error('Error ranking items:', error);
    // Return original items with 0 similarity if ranking fails
    return foundItems.map(item => ({ ...item, similarityScore: 0 }));
  }
} 