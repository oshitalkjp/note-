
import { GoogleGenAI, Type } from "@google/genai";

const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

const MASTER_SYSTEM_INSTRUCTION = `
あなたは世界最高峰のコンテンツディレクターです。
【厳守事項】
1. 重複排除：長編記事でも、各章で新しい視点、具体的な事実、深い洞察を提供し、内容の重複を許さない。
2. YouTube（記事全体で1本厳守）：指定された1つのURL以外は絶対に使用するな。
3. 画像指示：記事を補完する視覚的描写を [IMAGE: 描写] として挿入せよ。★重要：画像は多すぎると読者の邪魔になるため、全章のうち「半分以下の章」でのみ、本当に必要な箇所にだけ挿入すること。
4. 出力形式：Markdown形式の本文のみ。余計な挨拶や思考プロセスは一切出力するな。
`;

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }

  async checkApiKey() {
    // @ts-ignore
    const hasKey = (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') 
      ? await window.aistudio.hasSelectedApiKey() 
      : !!process.env.API_KEY;
    return hasKey;
  }

  async openKeySelector() {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  }

  private cleanOutput(text: string): string {
    return (text || '')
      .replace(/^(Search Query|Thinking|思考プロセス|はい、|承知いたしました|了解しました|Here is the translation:|Translation:).*?(\n|$)/gim, '')
      .replace(/\[\/?(thought|thinking|思考)\]/gi, '')
      .trim();
  }

  async searchAndOutline(trend: string, targetLength: number, references: string[] = []) {
    const ai = this.getClient();
    const prompt = `テーマ: "${trend}" について、重複のない${targetLength}文字の深掘り記事の構成を作成せよ。
【重要】このテーマに関連する「実在する」YouTube動画を1つだけ検索し、そのURLを特定せよ。
参考: ${references.join(', ')}`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: MASTER_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  description: { type: Type.STRING },
                  targetChars: { type: Type.NUMBER },
                  includeVideo: { type: Type.BOOLEAN, description: "この章にYouTube動画を配置するかどうか" }
                },
                required: ["heading", "description", "targetChars", "includeVideo"]
              }
            }
          },
          required: ["title", "outline"]
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    let youtubeUrl = "";
    for (const chunk of groundingChunks) {
      const uri = chunk.web?.uri || "";
      if (uri.includes("youtube.com/watch") || uri.includes("youtu.be/")) {
        youtubeUrl = uri;
        break;
      }
    }

    const data = JSON.parse(response.text || '{}');
    return { ...data, youtubeUrl };
  }

  async generateSectionContent(title: string, section: any, youtubeUrl: string) {
    const ai = this.getClient();
    const videoInstruction = section.includeVideo && youtubeUrl 
      ? `必ずこの記事の指定位置に [YouTubeリンク: ${youtubeUrl}] を1回だけ挿入せよ。` 
      : `YouTubeリンクは一切挿入するな。`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `タイトル: "${title}"\n章の見出し: "${section.heading}"\n役割: "${section.description}"\n目標: ${section.targetChars}文字。\n指示：重複を避け鋭い考察を書け。必要なら [IMAGE: 描写] を配置せよ。${videoInstruction}`,
      config: {
        systemInstruction: MASTER_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    return this.cleanOutput(response.text || '');
  }

  async translateToEnglish(text: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Translate the following to high-end, native English. Output ONLY the translated text.\n\n${text}`,
      config: { systemInstruction: "Strict English Translator. No conversational filler or explanations." }
    });
    return this.cleanOutput(response.text || text);
  }

  async generateThumbnail(title: string) {
    const ai = this.getClient();
    const prompt = `A cinematic, high-end editorial digital artwork.
    VISUAL CONCEPT: Professional visualization of the topic.
    TEXT OVERLAY: "${title}"
    STYLE: Render the EXACT words "${title}" in massive, clean, elegant bold typography at the center. 
    FORBIDDEN: Do not include ANY other text, logos, or UI elements. ONLY the words: "${title}".`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return '';
  }

  async generateSectionImage(description: string) {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: `Professional editorial photograph for: "${description}". Clean, realistic, no text.` }] },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return '';
  }
}

export const gemini = new GeminiService();
