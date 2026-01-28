
import { GoogleGenAI, Type } from "@google/genai";
import { User } from "../types.ts";

// Initialize the GoogleGenAI client with the API key from process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getSmartMatchAnalysis = async (userA: User, userB: User, deepQuery?: string) => {
  try {
    const prompt = `
      Analyze the compatibility between two users for a skill exchange platform.
      
      User 1 (The Requester):
      - Name: ${userA.name}
      - Skills Offered: ${userA.skillsOffered.map(s => s.name).join(', ')}
      - Skills Wanted: ${userA.skillsWanted.map(s => s.name).join(', ')}
      - Detailed Request: ${deepQuery || 'No detailed query provided.'}

      User 2 (The Potential Peer):
      - Name: ${userB.name}
      - Skills Offered: ${userB.skillsOffered.map(s => s.name).join(', ')}
      - Skills Wanted: ${userB.skillsWanted.map(s => s.name).join(', ')}

      Analyze how well User 2 can satisfy User 1's "Detailed Request" or "Skills Wanted" based on their "Skills Offered".
      
      Provide a JSON response with:
      1. matchScore: 0-100 (weighted heavily on the Detailed Request if provided)
      2. explanation: A 2-sentence explanation of why they match.
      3. suggestedTopic: One specific sub-topic mentioned in the request.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using responseSchema for strictly typed JSON output as per world-class standards
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: {
              type: Type.NUMBER,
              description: "The matching score between 0 and 100",
            },
            explanation: {
              type: Type.STRING,
              description: "Brief 2-sentence explanation of the match",
            },
            suggestedTopic: {
              type: Type.STRING,
              description: "A specific sub-topic for the first session",
            },
          },
          required: ["matchScore", "explanation", "suggestedTopic"],
        }
      }
    });

    // Directly access the text property as per latest GenAI SDK guidelines
    const text = response.text;
    return text ? JSON.parse(text) : { matchScore: 0, explanation: "No data returned", suggestedTopic: "N/A" };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      matchScore: 0,
      explanation: "Unable to analyze match at this time.",
      suggestedTopic: "N/A"
    };
  }
};

export const getLearningAssistantAdvice = async (user: User) => {
  try {
    const prompt = `
      You are an AI Learning Assistant for a SkillFlow platform.
      Analyze the profile of ${user.name}:
      - Skills Offered: ${user.skillsOffered.map(s => s.name).join(', ')}
      - Skills Wanted: ${user.skillsWanted.map(s => s.name).join(', ')}
      - Impact Score: ${user.impactScore}
      
      Suggest:
      1. The most valuable next skill they should learn to complement their "Offered" skills.
      2. A "15-minute Skill Burst" idea they could offer right now.
      3. A motivational tip based on their streak of ${user.streak} days.
      
      Return as a JSON object.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nextSkill: { type: Type.STRING },
            burstIdea: { type: Type.STRING },
            motivationalTip: { type: Type.STRING },
          },
          required: ["nextSkill", "burstIdea", "motivationalTip"],
        }
      }
    });

    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return null;
  }
};
