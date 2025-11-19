import type { Difficulty, Crown, Badge } from './clearData.js';

export interface ScoreData {
    title: string;
    songNo: string;
    difficulty: Partial<Record<Difficulty, DifficultyScoreData>>;
}

export interface ScoreResponseData {
    songNo: string;
    body: Record<Difficulty, string | null>;
}

export interface DifficultyScoreData {
    crown: Crown;
    badge: Badge;
    score: number;
    ranking: number;
    good: number;
    ok: number;
    bad: number;
    maxCombo: number;
    roll: number;
    count: Count;
}

export interface Count {
    play: number
    clear: number
    fullcombo: number
    donderfullcombo: number
}

export interface RecentPlayed {
    title: string;
    diff: Difficulty;
    data: {
        crown: Crown;
        badge: Badge;
        score: number;
        good: number;
        ok: number;
        bad: number;
        maxCombo: number;
        roll: number;
        count: Count;
    }
}