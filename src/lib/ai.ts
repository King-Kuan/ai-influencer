import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function generateContent({ idea, tone, audience }: { idea: string, tone: string, audience: string }) {
  // Prefer DeepSeek if key is provided, otherwise fallback to Gemini
  if (process.env.DEEPSEEK_API_KEY) {
    try {
      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: 'You are a social media manager. Output only valid JSON.'
          }, {
            role: 'user',
            content: `
Idea: ${idea}
Tone: ${tone}
Target Audience: ${audience}
Generate JSON:
{
  "caption": "short caption under 2000 chars",
  "hashtags": "5-10 hashtags as a string",
  "imagePrompt": "detailed prompt for image generation"
}`
          }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error("DeepSeek failed, falling back to Gemini:", error);
    }
  }

  // Fallback to Gemini
  const prompt = `
Idea: ${idea}
Tone: ${tone}
Target Audience: ${audience}
Generate JSON:
{
  "caption": "short caption under 2000 chars",
  "hashtags": "5-10 hashtags as a string",
  "imagePrompt": "detailed prompt for image generation"
}
Return only the JSON object.`;

  const result = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });
  
  const text = result.text;
  if (!text) throw new Error("No text generated from Gemini");
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("Failed to parse JSON from AI response");
}
