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

// Add this new function
export async function rankItemSimilarity(lostItem, foundItems) {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro" 
    });

    const promptText = `
    Compare this lost item with a list of found items and rank ALL of them by similarity.
    Consider matching these attributes in order of importance:
    1. Category match (30% weight)
    2. Name similarity (30% weight)
    3. Description keywords match (25% weight)
    4. Location proximity (15% weight)
    
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

    Instructions:
    1. You MUST rank ALL items provided
    2. Return a JSON array containing ALL items with their similarity scores
    3. Each item in array must have "index" and "similarity" properties
    4. Similarity scores should be between 0-100
    5. Even low matching items should be included with appropriate low scores
    
    Expected format:
    [
      {"index": 1, "similarity": 85},
      {"index": 2, "similarity": 60},
      {"index": 3, "similarity": 30},
      ... (continue for ALL items)
    ]

    Important: 
    - Return ONLY the JSON array
    - Include ALL items in the response
    - No markdown formatting or additional text
    - Ensure every item from the input list has a ranking
    `;

    const result = await model.generateContent(promptText);
    const response = await result.response;
    
    // Clean up the response text and ensure it's valid JSON
    let cleanedResponse = response.text()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Add error checking for JSON parsing
    let rankings;
    try {
      rankings = JSON.parse(cleanedResponse);
      
      // Verify we have rankings for all items
      if (rankings.length !== foundItems.length) {
        console.warn('Incomplete rankings received, padding with remaining items');
        const existingIndices = new Set(rankings.map(r => r.index));
        
        // Add missing items with 0 similarity
        for (let i = 1; i <= foundItems.length; i++) {
          if (!existingIndices.has(i)) {
            rankings.push({ index: i, similarity: 0 });
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing rankings:', parseError);
      // Fallback: create rankings with 0 similarity
      rankings = foundItems.map((_, index) => ({
        index: index + 1,
        similarity: 0
      }));
    }
    
    // Sort by similarity score before mapping
    rankings.sort((a, b) => b.similarity - a.similarity);
    
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