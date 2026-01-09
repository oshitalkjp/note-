
import { GoogleGenAI, Type } from "@google/genai";

const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

export class GeminiService {
  constructor() {}

  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async checkApiKey() {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      // @ts-ignore
      return await window.aistudio.hasSelectedApiKey();
    }
    return !!process.env.API_KEY;
  }

  async openKeySelector() {
    // @ts-ignore
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  }

  async searchAndOutline(trend: string, references: string[] = []) {
    const ai = this.getClient();
    const prompt = `
      トレンドキーワード/文章: "${trend}"
      参考URL/情報: ${references.join(', ')}
      
      上記の情報に基づき、note.com向けの長編記事（約1万字目標）の構成案を作成してください。
      以下の要素を含めてください：
      1. 読者の目を引く魅力的なタイトル
      2. 導入（フック）
      3. 独自の考察や視点を盛り込んだ5〜8個の主要セクション
      4. 各セクションで解説すべき事実、感想、考察のポイント
      5. YouTube動画の引用やSNSの引用を想定する場所
      6. 結論
      
      出力はJSON形式で、title, outline (array of sections) を含めてください。
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
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
                  estimatedLength: { type: Type.NUMBER }
                },
                required: ["heading", "description"]
              }
            }
          },
          required: ["title", "outline"]
        }
      }
    });

    return JSON.parse(response.text);
  }

  async generateSectionContent(title: string, section: any, context: string) {
    const ai = this.getClient();
    const prompt = `
      記事タイトル: "${title}"
      現在のセクション: "${section.heading}"
      セクションの概要: ${section.description}
      全体背景: ${context}
      
      このセクションの内容を、note.comで読まれるような親しみやすくも深い洞察に満ちた文体で執筆してください。
      - 独自の考察、個人の感想、客観的な事実を織り交ぜてください。
      - 読者が飽きないよう、適度に小見出しや箇条書き（Markdown）を使ってください。
      - 専門用語の解説や、YouTubeでの引用がふさわしい箇所があれば「[YouTube引用: キーワード]」と記載してください。
      - このパートだけで少なくとも1000〜1500文字程度を目標にしてください。
    `;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text;
  }

  async generateThumbnail(title: string) {
    const ai = this.getClient();
    const prompt = `
      A high-quality, professional editorial thumbnail for a blog post titled "${title}". 
      The style should be clean, modern, and suitable for note.com. 
      Include the text "${title}" artistically integrated into the visual. 
      Vibrant but sophisticated color palette.
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return '';
  }

  async generateSectionImage(description: string) {
    const ai = this.getClient();
    const prompt = `
      An illustrative high-quality conceptual image for the following topic: "${description}". 
      Editorial style, soft lighting, 16:9 aspect ratio, minimal text if any. 
      Suitable for an informative blog section.
    `;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return '';
  }
}

export const gemini = new GeminiService();
