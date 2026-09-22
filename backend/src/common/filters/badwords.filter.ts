import { prisma } from "../../lib/prisma";

// Danh sách từ cấm mặc định phòng khi database chưa seed
const DEFAULT_BADWORDS = [
  "đm",
  "dcm",
  "đcm",
  "vcl",
  "vkl",
  "lừa đảo",
  "scam",
  "đụ",
  "chó đẻ",
  "fuck",
  "bitch",
  "cunt",
  "asshole",
];

export interface ModerationCheckResult {
  isClean: boolean;
  violatedWords: string[];
  reason?: string;
}

export class BadwordsFilter {
  private static cachedWords: string[] = [];
  private static lastCacheUpdate = 0;
  private static readonly CACHE_TTL_MS = 60000; // 1 phút

  public static async getActiveBadwords(): Promise<string[]> {
    const now = Date.now();
    if (this.cachedWords.length > 0 && now - this.lastCacheUpdate < this.CACHE_TTL_MS) {
      return this.cachedWords;
    }

    try {
      const records = await prisma.badWord.findMany({
        where: { isActive: true },
        select: { pattern: true },
      });

      if (records.length > 0) {
        this.cachedWords = records.map((r) => r.pattern.toLowerCase().trim());
      } else {
        this.cachedWords = DEFAULT_BADWORDS;
      }
    } catch {
      this.cachedWords = DEFAULT_BADWORDS;
    }

    this.lastCacheUpdate = now;
    return this.cachedWords;
  }

  public static async checkContent(text: string): Promise<ModerationCheckResult> {
    if (!text || text.trim() === "") {
      return { isClean: true, violatedWords: [] };
    }

    const words = await this.getActiveBadwords();
    const normalizedText = text.toLowerCase();
    const violatedWords: string[] = [];

    for (const word of words) {
      // Dùng regex boundary hoặc substring check
      const regex = new RegExp(`(^|\\s|[.,!?;:/_\\-])${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}($|\\s|[.,!?;:/_\\-])`, "i");
      if (regex.test(normalizedText) || normalizedText.includes(word)) {
        violatedWords.push(word);
      }
    }

    if (violatedWords.length > 0) {
      return {
        isClean: false,
        violatedWords,
        reason: `Nội dung chứa từ ngữ không phù hợp (${violatedWords.slice(0, 3).join(", ")})`,
      };
    }

    return {
      isClean: true,
      violatedWords: [],
    };
  }
}
