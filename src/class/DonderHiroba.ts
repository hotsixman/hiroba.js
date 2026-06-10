import { Badge, CardData, Clear, ClearData, CompeDetail, CompeSongData, Crown, DaniData, Difficulty, RankingData, BestScore, Condition, SongRecord, ScoreData, DifficultyScoreData, DaniPassData, DaniNo, Summary, RecentPlayed, KisekaeReqData } from "../types/types.js";
import { checkNamcoLogin, Const, createHeader, HirobaError, sanitizeHTML, parseHTML, isBrowser, checkCardLogin, detectDaniPass } from "../util.js";
import { Parse as Parse_ } from "../namespace/Parse.js";
import { Request as Request_ } from "../namespace/Request.js";
import { Func as Func_ } from "../namespace/Func.js";

export class DonderHiroba {
    static async login({ email, password, taikoNumber }: { email: string, password: string, taikoNumber?: string }) {
        const token = await DonderHiroba.func.getSessionToken({ email, password });

        const instance = new DonderHiroba(token);
        instance.namcoLogined = true;

        if (taikoNumber) {
            await instance.cardLogin(taikoNumber);
        }

        return instance;
    }

    protected token?: string;
    namcoLogined: boolean = false;
    cardLogined: boolean = false;
    currentLogin: (CardData & { summary?: Summary }) | null = null;
    cardList: CardData[] = [];
    clearData: Map<string, ClearData> = new Map();
    scoreData: Map<string, ScoreData> = new Map();

    constructor(token?: string) {
        this.token = token;
    }

    /**
     * 남코 계정에 로그인 되어있는 지 체크합니다. 이 함수를 사용하면 카드 로그인이 풀립니다.
     * @returns
     */
    async checkNamcoLogined() {
        this.cardLogined = false;
        this.namcoLogined = false;
        this.currentLogin = null;

        try {
            this.cardList = await DonderHiroba.func.getCardList({ token: this.token });
            this.namcoLogined = true;
            return true;
        }
        catch {
            return false;
        }
    }

    /**
     * 카드에 로그인 되어있는 지 체크합니다. 이 함수를 사용하면 남코 로그인이 풀릴 수 있습니다.
     * @returns 
     */
    async checkCardLogined() {
        this.namcoLogined = false;
        this.cardLogined = false;

        try {
            this.currentLogin = await DonderHiroba.func.getCurrentLogin();
            if (this.currentLogin) {
                this.namcoLogined = true;
                this.cardLogined = true;
                return true;
            }
            else {
                return false;
            }
        }
        catch {
            return false;
        }
    }

    /**
     * 카드 리스트를 다시 로드합니다.
     * 이 경우 카드 로그인이 풀립니다.
     */
    async reloadCardList() {
        const lastLogin = this.currentLogin;
        this.cardLogined = false;
        this.currentLogin = null;
        this.cardList = await this.loginedCheckWrapper(() => DonderHiroba.func.getCardList({ token: this.token }));
        if (lastLogin && this.cardList.find((e) => e.taikoNumber === lastLogin?.taikoNumber)) {
            await this.cardLogin(lastLogin.taikoNumber);
        }
    }

    /**
     * 카드에 로그인합니다.
     * @param taikoNumber 
     */
    async cardLogin(taikoNumber: string) {
        try {
            this.currentLogin = await this.loginedCheckWrapper(async () => {
                return await DonderHiroba.func.cardLogin({
                    token: this.token,
                    taikoNumber,
                    cardList: this.cardList
                });
            });
            this.cardLogined = true;
        }
        catch (err) {
            if (err instanceof HirobaError && err.code === 'NO_MATCHED_CARD') {
                await this.reloadCardList();
                await this.cardLogin(taikoNumber);
            }
            else {
                throw err;
            }
        }
    }

    /**
     * 클리어 데이터를 동기화하고, 동기화 된 클리어 데이터를 {songNo: ClearData} 형태의 객체로 반환합니다.
     * @param genre 
     * @returns 
     */
    async syncClearData(genre?: keyof typeof Const.genre) {
        const clearDataHtml = await this.loginedCheckWrapper<Promise<string | string[]>>(() => genre ? DonderHiroba.request.clearData({ token: this.token, genre }) : DonderHiroba.request.clearData({ token: this.token }));
        const clearData: ClearData[] = [];
        if (Array.isArray(clearDataHtml)) {
            clearDataHtml.forEach((html) => {
                clearData.push(...DonderHiroba.parse.clearData(html));
            });
        }
        else {
            clearData.push(...DonderHiroba.parse.clearData(clearDataHtml));
        }

        const clearDataRecord: Record<string, ClearData> = {};
        clearData.forEach((e) => {
            this.clearData.set(e.songNo, e);
            clearDataRecord[e.songNo] = e;
        });

        return clearDataRecord;
    }

    /**
     * 점수 데이터를 동기화하고, 동기화 된 점수 데이터를 반환합니다.
     * @param songNo 
     * @param difficulty 
     * @returns 
     */
    async syncScoreData(songNo: string, difficulty?: Difficulty) {
        const scoreDataHtml = await this.loginedCheckWrapper<Promise<string | string[]>>(() => difficulty ? DonderHiroba.request.scoreData({ token: this.token, songNo, difficulty }) : DonderHiroba.request.scoreData({ token: this.token, songNo }));
        if (Array.isArray(scoreDataHtml)) {
            var scoreData = DonderHiroba.parse.scoreData({ html: scoreDataHtml, songNo });
        }
        else {
            var scoreData = DonderHiroba.parse.scoreData({ html: scoreDataHtml, songNo });
        }

        if (!scoreData) return null;

        let existingScoreData = this.scoreData.get(songNo);
        if (!existingScoreData) {
            existingScoreData = scoreData;
            this.scoreData.set(songNo, existingScoreData);
        }
        else {
            for (const [diff, diffScoreData] of Object.entries(scoreData.difficulty)) {
                existingScoreData.difficulty[diff as Difficulty] = diffScoreData;
            }
        };

        return existingScoreData;
    }

    async updateRecord() {
        await DonderHiroba.func.updateRecord({ token: this.token });
    }

    async changeName(newName: string) {
        const ticket = await this.loginedCheckWrapper(async () => DonderHiroba.parse.ticket(await DonderHiroba.request.mypage({ token: this.token }))) ?? '';

        await DonderHiroba.func.changeName({ token: this.token, ticket, newName });
        await this.checkCardLogined();

        return this.currentLogin;
    }

    async changeKisekae(kisekae: KisekaeReqData){
        await DonderHiroba.func.changeKisekae({token: this.token, kisekae});
    }

    setToken(token: string) {
        this.token = token;
    }
    getToken() {
        return this.token;
    }

    initialize() {
        this.token = undefined;
        this.namcoLogined = false;
        this.cardLogined = false;
        this.currentLogin = null;
        this.cardList = [];
        this.clearData = new Map<string, ClearData>();
        this.scoreData = new Map<string, ScoreData>();
    }

    /**
     * 에러 발생 시 에러가 로그인과 관련된 에러라면 해당하는 속성을 초기화합니다.
     * @param callback 
     * @returns 
     */
    protected async loginedCheckWrapper<T = void>(callback: () => (T | Promise<T>)) {
        try {
            return await callback();
        }
        catch (err) {
            if (err instanceof HirobaError && (err.code === 'NOT_LOGINED' || err.code === 'NOT_NAMCO_LOGINED')) {
                this.namcoLogined = false;
                this.cardLogined = false;
                this.currentLogin = null;
                this.cardList = [];
            }
            throw err;
        }
    }
}

export namespace DonderHiroba {
    export const parse = Parse_;
    export const request = Request_;
    export const func = Func_;
}