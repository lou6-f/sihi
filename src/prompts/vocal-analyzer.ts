// ═══════════════════════════════════════
// Vocal Metrics Helper (no AI needed)
// Computes from transcript text + timing data
// ═══════════════════════════════════════

export interface VocalMetrics {
  wordCount: number;
  durationMs: number;
  wordsPerMinute: number;
  fillerCount: number;
  fillerWords: string[];     // Unique fillers used
  fillerInstances: string[]; // All instances found
  wpmWarning: boolean;       // true if WPM > 160
}

export interface AggregatedVocalAnalysis {
  avgWpm: number;
  totalFillers: number;
  fillerWords: string[];
  totalSpeakingMs: number;
  wpmWarning: boolean;
  communicationPenalty: number;  // 0-20 points to subtract
  confidencePenalty: number;     // 0-10 points to subtract
}

// Vietnamese filler words / hesitation markers
const FILLER_PATTERNS = [
  /\bà\b/gi,
  /\bờ\b/gi,
  /\bừ\b/gi,
  /\bthì\b/gi,
  /\bmà\b/gi,
  /kiểu như/gi,
  /nói chung/gi,
  /thật ra/gi,
  /ý là/gi,
  /tức là/gi,
  /hmm/gi,
  /uh+\b/gi,
  /um+\b/gi,
  /er+\b/gi,
];

const FILLER_LABELS: Record<string, string> = {
  "à": "à",
  "ờ": "ờ",
  "ừ": "ừ",
  "thì": "thì",
  "mà": "mà",
  "kiểu như": "kiểu như",
  "nói chung": "nói chung",
  "thật ra": "thật ra",
  "ý là": "ý là",
  "tức là": "tức là",
  "hmm": "hmm",
};

const WPM_WARNING_THRESHOLD = 160;

/**
 * Compute vocal metrics from a single user answer.
 * @param transcript - The answer text
 * @param recordingDurationMs - Actual recording duration in ms (from frontend)
 * @param fallbackDurationMs - Fallback if recording duration not provided
 */
export function computeVocalMetrics(
  transcript: string,
  recordingDurationMs?: number,
  fallbackDurationMs?: number
): VocalMetrics {
  if (!transcript || transcript.trim().length === 0) {
    return { wordCount: 0, durationMs: 0, wordsPerMinute: 0, fillerCount: 0, fillerWords: [], fillerInstances: [], wpmWarning: false };
  }

  // Word count (Vietnamese word segmentation is space-based)
  const wordCount = transcript.trim().split(/\s+/).length;

  // Duration — prefer recordingDurationMs, fallback to estimate
  const durationMs = recordingDurationMs
    ?? fallbackDurationMs
    ?? estimateDurationFromWordCount(wordCount);

  // WPM calculation
  const durationMinutes = durationMs / 60000;
  const wordsPerMinute = durationMinutes > 0 ? Math.round(wordCount / durationMinutes) : 0;

  // Filler detection
  const fillerInstancesFound: string[] = [];
  const fillerTypesFound = new Set<string>();

  for (const pattern of FILLER_PATTERNS) {
    const matches = transcript.match(pattern);
    if (matches) {
      matches.forEach(m => {
        fillerInstancesFound.push(m.toLowerCase());
        const label = findFillerLabel(m.toLowerCase());
        if (label) fillerTypesFound.add(label);
      });
    }
  }

  return {
    wordCount,
    durationMs,
    wordsPerMinute,
    fillerCount: fillerInstancesFound.length,
    fillerWords: Array.from(fillerTypesFound),
    fillerInstances: fillerInstancesFound,
    wpmWarning: wordsPerMinute > WPM_WARNING_THRESHOLD,
  };
}

/**
 * Aggregate vocal metrics across all user messages in an interview.
 */
export function aggregateVocalMetrics(
  userMessages: Array<{ text: string; metrics?: VocalMetrics }>
): AggregatedVocalAnalysis {
  if (userMessages.length === 0) {
    return { avgWpm: 0, totalFillers: 0, fillerWords: [], totalSpeakingMs: 0, wpmWarning: false, communicationPenalty: 0, confidencePenalty: 0 };
  }

  const validMetrics = userMessages
    .map(m => m.metrics)
    .filter((m): m is VocalMetrics => !!m && m.durationMs > 0);

  if (validMetrics.length === 0) {
    return { avgWpm: 0, totalFillers: 0, fillerWords: [], totalSpeakingMs: 0, wpmWarning: false, communicationPenalty: 0, confidencePenalty: 0 };
  }

  const avgWpm = Math.round(validMetrics.reduce((sum, m) => sum + m.wordsPerMinute, 0) / validMetrics.length);
  const totalFillers = validMetrics.reduce((sum, m) => sum + m.fillerCount, 0);
  const allFillerWords = Array.from(new Set(validMetrics.flatMap(m => m.fillerWords)));
  const totalSpeakingMs = validMetrics.reduce((sum, m) => sum + m.durationMs, 0);
  const wpmWarning = avgWpm > WPM_WARNING_THRESHOLD;

  // Compute penalties for communication and confidence scores
  // Filler penalty: 0-20 points (0 fillers = 0, 20+ fillers = 20)
  const communicationPenalty = Math.min(20, Math.round(totalFillers * 1.5));
  // WPM penalty: 0-10 points (too fast = nervous = lower confidence)
  const confidencePenalty = wpmWarning ? Math.min(10, Math.round((avgWpm - WPM_WARNING_THRESHOLD) / 10)) : 0;

  return {
    avgWpm,
    totalFillers,
    fillerWords: allFillerWords,
    totalSpeakingMs,
    wpmWarning,
    communicationPenalty,
    confidencePenalty,
  };
}

// ═══════════════════════════════════════
// Private helpers
// ═══════════════════════════════════════

function estimateDurationFromWordCount(wordCount: number): number {
  // Average Vietnamese speaking rate: ~130 WPM
  return Math.round((wordCount / 130) * 60000);
}

function findFillerLabel(filler: string): string | null {
  for (const [key, label] of Object.entries(FILLER_LABELS)) {
    if (filler.includes(key)) return label;
  }
  if (filler.startsWith("hmm") || filler.startsWith("uh") || filler.startsWith("um") || filler.startsWith("er")) {
    return filler;
  }
  return null;
}
