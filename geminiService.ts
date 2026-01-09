
import { GoogleGenAI, Type } from "@google/genai";

const TEXT_MODEL = 'gemini-3-pro-preview';
const IMAGE_MODEL = 'gemini-3-pro-image-preview';

const NOTE_MASTER_SYSTEM_INSTRUCTION = `
あなたは世界を代表するトップライターです。
【厳守事項】
1. 重複は「即刻削除」：
   - 同じ内容の言い換え、同じ語彙の繰り返し、似たような見出しは「無能」の証です。
   - 1万文字の長編であっても、各セクションが独立した価値（事実、データ、独自の鋭い考察、予測）を持つように構成してください。
2. YouTubeの厳選（1件のみ）：
   - 記事の信頼性を高めるために最も重要なYouTube動画を【1つだけ】厳選し、[YouTubeリンク: URL]として挿入。
3. 出力：
   - 挨拶や前置きは一切不要。Markdown形式の本文のみを返せ。
   - 読者の興味を惹きつけるため、[IMAGE: 具体的な情景描写] を適切な場所に配置せよ。
`;

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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

  private cleanOutput(text: string): string {
    let cleaned = text || '';
    cleaned = cleaned.replace(/^(Search Query|Thinking|思考プロセス|はい、|承知いたしました).*?(\n|$)/gim, '');
    cleaned = cleaned.replace(/(\*\*|#)?Search Query:[\s\S]*?(\n\n|$)/gi, '');
    cleaned = cleaned.replace(/(\*\*|#)?Thinking:[\s\S]*?(\n\n|$)/gi, '');
    cleaned = cleaned.replace(/\[\/?(thought|thinking|思考)\]/gi, '');
    cleaned = cleaned.replace(/^# .*?(\n|$)/, '');
    return cleaned.trim();
  }

  async searchAndOutline(trend: string, targetLength: number, references: string[] = []) {
    const ai = this.getClient();
    const prompt = `テーマ: "${trend}"
目標文字数: ${targetLength}
参考情報: ${references.join(', ')}

指示：
- 段落、見出しの重複を完全に排除した一万文字の構成案を作成せよ。
- 実在するYouTube動画を【1つだけ】特定せよ。
- JSON形式で返せ。`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOTE_MASTER_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            youtubeUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
            outline: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  heading: { type: Type.STRING },
                  description: { type: Type.STRING },
                  targetChars: { type: Type.NUMBER }
                },
                required: ["heading", "description", "targetChars"]
              }
            }
          },
          required: ["title", "outline", "youtubeUrls"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    if (data.youtubeUrls) data.youtubeUrls = data.youtubeUrls.slice(0, 1);
    return data;
  }

  async generateSectionContent(title: string, section: any, youtubeUrls: string[]) {
    const ai = this.getClient();
    const prompt = `タイトル: "${title}"
見出し: "${section.heading}"
概要: "${section.description}"
目標文字数: ${section.targetChars}文字

- 読者が驚くような新しい視点と考察を加えよ。
- 重複は厳禁。
- 適宜 [IMAGE: 描写] と [YouTubeリンク: ${youtubeUrls[0] || ''}] を挿入せよ。`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: NOTE_MASTER_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return this.cleanOutput(response.text || '');
  }

  async translateToEnglish(text: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `Translate the following Japanese article to natural, professional English for Patreon. Keep the Markdown formatting and all special tags like [IMAGE:...] or [YouTubeリンク:...].\n\n${text}`,
      config: {
        systemInstruction: "You are a professional native English translator specializing in digital media and blogs."
      }
    });
    return response.text || text;
  }

  async generateThumbnail(title: string) {
    const ai = this.getClient();
    // note.comなどの単語を入れないよう厳命
    const prompt = `Cinematic, ultra-high-quality magazine cover. 
    The Japanese title "${title}" must be written in huge, bold, beautiful typography. 
    NO other text, NO "note.com", NO logo. Just the title and artistic background related to "${title}". 
    8k resolution, professional lighting.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return '';
  }

  async generateSectionImage(description: string) {
    const ai = this.getClient();
    const prompt = `High-end editorial illustration for: "${description}". Photorealistic, professional, NO TEXT.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return '';
  }
}

export const gemini = new GeminiService();
