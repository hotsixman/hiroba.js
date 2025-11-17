export interface CardData{
    taikoNumber: string;
    nickname: string;
    myDon: string | undefined;
}

export interface Summary{
    diff: 'easy' | 'normal' | 'hard' | 'oni' | 'oniura',
    crown: {
        donderfull: number;
        gold: number;
        silver: number;
    };
    badge: {
        rainbow: number;
        purple: number;
        pink: number;
        gold: number;
        silver: number;
        bronze: number;
        white: number;
    }
}