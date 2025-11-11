export type DaniNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;

export interface DaniData {
    title: string;
    daniNo: number;
    played: boolean;
    bestScore: BestScore;
    bestConditions: Condition[];
}

export interface DaniResponseData { daniNo: DaniNo; body: string; };

export interface BestScore {
    score: number;
    good: number;
    ok: number;
    bad: number;
    roll: number;
    maxCombo: number;
    hit: number;
    conditions: Condition[];
    songRecords: SongRecord[];
}

export interface Condition {
    name: string;
    criteria: number[];
    record: number[]
}

export interface SongRecord {
    title: string
    difficulty: string
    good: number
    ok: number
    bad: number
    roll: number
    maxCombo: number
    hit: number
}

export type DaniPassData = {
    pass: "gold" | "red";
    frame: "silver" | "gold" | "donderfull";
} | null;