import { Badge, CardData, Clear, ClearData, CompeDetail, CompeSongData, Crown, DaniData, Difficulty, RankingData, BestScore, Condition, SongRecord, ScoreData, DifficultyScoreData } from "../types/types";
import { checkNamcoLogin, Const, createHeader, HirobaError, sanitizeHTML, parseHTML, isBrowser, checkCardLogin } from "../util";
import setCookieParser from 'set-cookie-parser';
import { CompeDate } from "./compeDate";
import { HTMLElement } from "node-html-parser";

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

    private token?: string;
    namcoLogined: boolean = false;
    cardLogined: boolean = false;
    currentLogin: CardData | null = null;
    cardList: CardData[] = [];
    clearData: Map<string, ClearData> = new Map();
    scoreData: Map<string, ScoreData> = new Map();
    ticket: string | null = null;

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
        this.cardList = await DonderHiroba.func.getCardList({ token: this.token });
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
     * 클리어 데이터를 업데이트하고, 업데이트 된 클리어 데이터를 {songNo: ClearData} 형태의 객체로 반환합니다.
     * @param genre 
     * @returns 
     */
    async updateClearData(genre?: keyof typeof Const.genre) {
        const clearDataHtml = await this.loginedCheckWrapper<Promise<string | string[]>>(() => genre ? DonderHiroba.request.clearData({ token: this.token, genre }) : DonderHiroba.request.clearData({ token: this.token }));
        const clearData: ClearData[] = [];
        if (Array.isArray(clearDataHtml)) {
            clearDataHtml.forEach((html) => {
                clearData.push(...DonderHiroba.parse.clearData(html));
            });
            this.ticket = DonderHiroba.parse.ticket(clearDataHtml[clearDataHtml.length - 1]);
        }
        else {
            clearData.push(...DonderHiroba.parse.clearData(clearDataHtml));
            this.ticket = DonderHiroba.parse.ticket(clearDataHtml);
        }

        const clearDataRecord: Record<string, ClearData> = {};
        clearData.forEach((e) => {
            this.clearData.set(e.songNo, e);
            clearDataRecord[e.songNo] = e;
        });

        return clearDataRecord;
    }

    /**
     * 점수 데이터를 업데이트하고, 업데이트 된 점수 데이터를 반환합니다.
     * @param songNo 
     * @param difficulty 
     * @returns 
     */
    async updateScoreData(songNo: string, difficulty?: Difficulty) {
        const scoreDataHtml = await this.loginedCheckWrapper<Promise<string | string[]>>(() => difficulty ? DonderHiroba.request.scoreData({ token: this.token, songNo, difficulty }) : DonderHiroba.request.scoreData({ token: this.token, songNo }));
        if (Array.isArray(scoreDataHtml)) {
            var scoreData = DonderHiroba.parse.scoreData({ html: scoreDataHtml, songNo });
            this.ticket = DonderHiroba.parse.ticket(scoreDataHtml[scoreDataHtml.length - 1]);
        }
        else {
            var scoreData = DonderHiroba.parse.scoreData({ html: scoreDataHtml, songNo });
            this.ticket = DonderHiroba.parse.ticket(scoreDataHtml);
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

    async updateRecord(){
        //if(!this.ticket){
        //    await this.getTicket();
        //}

        await DonderHiroba.func.updateRecord({token: this.token});
    }

    async changeName(newName: string) {
        if (!this.ticket) {
            await this.getTicket();
        }

        await DonderHiroba.func.changeName({ token: this.token, ticket: this.ticket as string, newName });
        await this.checkCardLogined();

        return this.currentLogin;
    }

    async getTicket() {
        const ticket = await this.loginedCheckWrapper(() => DonderHiroba.func.getTicket({ token: this.token }));
        this.ticket = ticket;
        return ticket;
    }

    /**
     * 에러 발생 시 에러가 로그인과 관련된 에러라면 해당하는 속성을 초기화합니다.
     * @param callback 
     * @returns 
     */
    private async loginedCheckWrapper<T = void>(callback: () => (T | Promise<T>)) {
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
    export namespace request {
        export async function cardList(data?: { token?: string }) {
            const { token } = data ?? {};
            try {
                var response = await fetch('https://donderhiroba.jp/login_select.php', {
                    method: 'get',
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            const { logined, error } = checkNamcoLogin(response);
            if (!logined) throw error;

            const html = await response.text();
            if (isBrowser()) {
                return html;
            }
            else {
                return sanitizeHTML(html);
            }
        };

        export async function clearData(data?: { token?: string }): Promise<string[]>;
        export async function clearData(data?: { token?: string, genre: keyof typeof Const.genre }): Promise<string>;
        export async function clearData(data?: { token?: string, genre?: keyof typeof Const.genre }) {
            const genre = data?.genre ?? undefined;
            const token = data?.token ?? undefined;
            if (genre) {
                try {
                    var response = await fetch(`https://donderhiroba.jp/score_list.php?genre=${Const.genre[genre]}`, {
                        headers: createHeader(token ? `_token_v2=${token}` : undefined),
                        redirect: 'manual'
                    })
                }
                catch (err) {
                    if (err instanceof Response) {
                        throw new HirobaError('CANNOT_CONNECT', err);
                    }
                    else {
                        throw new HirobaError('CANNOT_CONNECT');
                    }
                }

                const { logined, error } = checkCardLogin(response);
                if (!logined) throw error;

                return await response.text();
            }
            else {
                const genres = [1, 2, 3, 4, 5, 6, 7, 8];
                const datas: string[] = [];
                for (const genre of genres) {
                    try {
                        var response = await fetch(`https://donderhiroba.jp/score_list.php?genre=${genre}`, {
                            headers: createHeader(token ? `_token_v2=${token}` : undefined),
                            redirect: 'manual'
                        })
                    }
                    catch (err) {
                        if (err instanceof Response) {
                            throw new HirobaError('CANNOT_CONNECT', err);
                        }
                        else {
                            throw new HirobaError('CANNOT_CONNECT');
                        }
                    }

                    const { logined, error } = checkCardLogin(response);
                    if (!logined) throw error;

                    datas.push(await response.text());
                };

                return datas;
            }
        };

        export async function compeDetail(data: { token?: string, compeId: string }) {
            const { token, compeId } = data;
            try {
                var response = await fetch(`https://donderhiroba.jp/compe_detail.php?compeid=${compeId}`, {
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            const { logined, error } = checkNamcoLogin(response);
            if (!logined) throw error;

            const html = await response.text();
            return html;
        }

        export async function compeRanking(data: { token?: string, compeId: string }) {
            const { token, compeId } = data;
            try {
                var response = await fetch(`https://donderhiroba.jp/compe_ranking.php?compeid=${compeId}`, {
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            const { logined, error } = checkNamcoLogin(response);
            if (!logined) throw error;

            const html = await response.text();
            return html;
        }

        export async function currentLogin(data?: { token?: string }) {
            const { token } = data ?? {};

            try {
                var response = await fetch(`https://donderhiroba.jp`, {
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            const { logined, error } = checkNamcoLogin(response);
            if (!logined) throw error;

            const html = await response.text();
            //return html;
            if (isBrowser()) {
                return html;
            }
            else {
                return sanitizeHTML(html);
            }
        }

        export async function daniData(data?: { token?: string }): Promise<string[]>;
        export async function daniData(data?: { token?: string, daniNo: number }): Promise<string>;
        export async function daniData(data?: { token?: string, daniNo?: number }) {
            const { token, daniNo } = data ?? {};

            if (daniNo) {
                try {
                    var response = await fetch(`https://donderhiroba.jp/dan_detail.php?dan=${daniNo}`, {
                        headers: createHeader(token ? `_token_v2=${token}` : undefined),
                        redirect: 'manual'
                    });
                }
                catch (err) {
                    if (err instanceof Response) {
                        throw new HirobaError('CANNOT_CONNECT', err);
                    }
                    else {
                        throw new HirobaError('CANNOT_CONNECT');
                    }
                }

                const { logined, error } = checkCardLogin(response);
                if (!logined) throw error;

                return await response.text();
            }
            else {
                const daniNos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
                const htmls: string[] = [];
                for (const daniNo of daniNos) {
                    try {
                        var response = await fetch(`https://donderhiroba.jp/dan_detail.php?dan=${daniNo}`, {
                            headers: createHeader(token ? `_token_v2=${token}` : undefined),
                            redirect: 'manual'
                        });
                    }
                    catch (err) {
                        if (err instanceof Response) {
                            throw new HirobaError('CANNOT_CONNECT', err);
                        }
                        else {
                            throw new HirobaError('CANNOT_CONNECT');
                        }
                    }

                    const { logined, error } = checkCardLogin(response);
                    if (!logined) throw error;

                    htmls.push(await response.text());
                }

                return htmls;
            }
        }

        export async function scoreData(data: { token?: string, songNo: string, difficulty?: undefined }): Promise<string[]>;
        export async function scoreData(data: { token?: string, songNo: string, difficulty: Difficulty }): Promise<string>;
        export async function scoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }) {
            const { token, songNo, difficulty } = data;
            if (difficulty) {
                return await requestScoreDataByDiff({ token, songNo, difficulty });
            }
            else {
                const htmls: string[] = [];
                for (const difficulty of ['easy', 'normal', 'hard', 'oni', 'ura'] as Difficulty[]) {
                    htmls.push(await requestScoreDataByDiff({ token, songNo, difficulty }));
                }
                return htmls;
            }

            function getDifficultyNumber(difficulty: Difficulty) {
                const m: Record<Difficulty, number> = {
                    easy: 1,
                    normal: 2,
                    hard: 3,
                    oni: 4,
                    ura: 5
                };
                return m[difficulty];
            }

            async function requestScoreDataByDiff({ songNo, difficulty, token }: { songNo: string, difficulty: Difficulty, token?: string }) {
                try {
                    var response = await fetch(`https://donderhiroba.jp/score_detail.php?song_no=${songNo}&level=${getDifficultyNumber(difficulty)}`, {
                        headers: createHeader(token ? `_token_v2=${token}` : undefined),
                        redirect: 'manual'
                    });
                }
                catch (err) {
                    if (err instanceof Response) {
                        throw new HirobaError('CANNOT_CONNECT', err);
                    }
                    else {
                        throw new HirobaError('CANNOT_CONNECT');
                    }
                };

                const { logined, error } = checkNamcoLogin(response);
                if (!logined) throw error;

                return await response.text();
            }
        }

        export async function ticket(data?: { token?: string }) {
            const { token } = data ?? {};

            try {
                var response = await fetch(`https://donderhiroba.jp/mypage_top.php`, {
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            const { logined, error } = checkNamcoLogin(response);
            if (!logined) throw error;

            return await response.text();
        }
    }

    export namespace parse {
        export function cardList(html: string) {
            const dom = parseHTML(html);

            const cardList: CardData[] = [];
            dom.querySelectorAll('.cardSelect').forEach((el) => {
                const taikoNumber = el.querySelector('div#mydon_area > div:nth-child(2) > p')?.textContent?.replace('太鼓番: ', '')?.trim();
                const nickname = el.querySelector('div#mydon_area > div:nth-child(3)')?.textContent?.replaceAll('\n', '')?.replaceAll('\t', '');
                const myDon = el.querySelector('img')?.getAttribute('src');

                if (!taikoNumber || !nickname || !myDon) return;
                cardList.push({
                    taikoNumber,
                    nickname,
                    myDon
                })
            });

            return cardList;
        }

        export function clearData(html: string | string[]) {
            if (Array.isArray(html)) {
                const clearDataMap = new Map<string, ClearData>();
                html.forEach((html) => p(html, clearDataMap));
                return [...clearDataMap.values()];
            }
            else {
                return [...p(html).values()];
            }

            function p(html: string, clearDataMap?: Map<string, ClearData>) {
                const dom = parseHTML(html);
                clearDataMap = clearDataMap ?? new Map<string, ClearData>();

                dom.querySelectorAll('.contentBox').forEach((box) => {
                    // 제목과 곡 번호
                    const title = box.querySelector('.songNameArea span')?.textContent?.trim();
                    const songNo = new URL(`https://donderhiroba.jp/${box.querySelector('a')?.getAttribute('href') ?? ''}`).searchParams.get('song_no');
                    if (!title || !songNo) return;

                    // 왕관과 뱃지
                    const difficultyRecord: Partial<Record<Difficulty, Clear>> = {};
                    box.querySelectorAll('.buttonList img').forEach((img) => {
                        const [crownHint, badgeHint] = img.getAttribute('src')?.replace('image/sp/640/crown_button_', '')?.replace('_640.png', '')?.split('_') ?? [];
                        // 이미지를 찾을 수 없거나 플레이 하지 않은 경우
                        if (!crownHint || crownHint === 'none') return;

                        // 난이도
                        const difficultyHint = img.getAttribute('class')?.split(' ')[1];
                        let difficulty: Difficulty;
                        if (difficultyHint?.includes('easy')) {
                            difficulty = 'easy';
                        }
                        else if (difficultyHint?.includes('normal')) {
                            difficulty = 'normal';
                        }
                        else if (difficultyHint?.includes('hard')) {
                            difficulty = 'hard';
                        }
                        else if (difficultyHint?.includes('oni_ura')) {
                            difficulty = 'ura';
                        }
                        else {
                            difficulty = 'oni';
                        }

                        // 왕관
                        let crown: Crown = null;
                        switch (crownHint) {//왕관
                            case 'played': {
                                crown = 'played';
                                break;
                            }
                            case 'silver': {
                                crown = 'silver';
                                break;
                            }
                            case 'gold': {
                                crown = 'gold';
                                break;
                            }
                            case 'donderfull': {
                                crown = 'donderfull';
                                break;
                            }
                        }

                        // 점수 딱지
                        let badge: Badge = null;
                        switch (badgeHint) {//배지
                            case '8': {
                                badge = 'rainbow';
                                break;
                            }
                            case '7': {
                                badge = 'purple';
                                break;
                            }
                            case '6': {
                                badge = 'pink';
                                break;
                            }
                            case '5': {
                                badge = 'gold';
                                break;
                            }
                            case '4': {
                                badge = 'silver';
                                break;
                            }
                            case '3': {
                                badge = 'bronze';
                                break;
                            }
                            case '2': {
                                badge = 'white';
                                break;
                            }
                        };

                        difficultyRecord[difficulty] = {
                            crown,
                            badge
                        }
                    });

                    let clearData = clearDataMap.get(songNo);
                    if (!clearData) {
                        clearData = {
                            title,
                            songNo,
                            difficulty: {}
                        };
                        clearDataMap.set(songNo, clearData);
                    }
                    clearData.difficulty = { ...clearData.difficulty, ...difficultyRecord };
                });

                return clearDataMap;
            }
        }

        export function ticket(html: string) {
            const dom = parseHTML(html);
            return (dom.getElementById('_tckt') as HTMLInputElement | null)?.getAttribute('value') ?? null;
        }

        export function compeDetail(html: string) {
            const dom = parseHTML(html);

            const header = dom.querySelector('header > h1')?.textContent?.trim();
            if (!header || header === 'エラー') {
                return null;
            }

            const title = dom.querySelector('#compeDetail > ul.festivalThumbList > li > section > aside > div > ul > li:nth-child(1)')?.textContent?.replace('大会名：', '')?.trim();
            const hostNickname = dom.querySelector("#compeDetail > ul.festivalThumbList > li > section > aside > div > ul > li:nth-child(2)")?.textContent?.replace('主催：', '')?.trim();
            const hostTaikoNo = dom.querySelector('#compeDetail > ul.festivalThumbList > li > section > a')?.getAttribute('href')?.split('=')?.[1];
            const totalEntryText = dom.querySelector('#compeDetail > ul.festivalThumbList > li > section > aside > div > ul > li:nth-child(3)')?.textContent?.replace('人数：', '')?.split('人')?.[0];
            const startDateText = dom.querySelector('#compeDetail > ul.festivalThumbList > li > section > aside > div > ul > li:nth-child(4)')?.textContent?.replace('期間：', '')?.replace('～', '')?.trim();
            const endDateText = dom.querySelector('#compeDetail > ul.festivalThumbList > li > section > aside > div > ul > li:nth-child(5)')?.textContent?.trim();

            if (!title || !hostNickname || !hostTaikoNo || !totalEntryText || !startDateText || !endDateText) return null;

            const songList: CompeSongData[] = [];
            const difficulties = ['easy', 'normal', 'hard', 'oni', 'ura'] as const;
            dom.querySelectorAll('li.contentBox.mypageSongListArea').forEach((li) => {
                const imgs = li.querySelectorAll('img');
                const songName = li.querySelector('.songName')?.textContent?.trim();
                const difficulty = difficulties[Number(imgs[0].getAttribute('src')?.replace(/image\/sp\/640\/level_button_(.*)_([0-9])_640.png/, '$2')) - 1];

                if (!songName || !difficulty) return;
                const compeSongData: CompeSongData = {
                    songName,
                    difficulty
                }

                let src: string | null | undefined;
                // 배속
                src = imgs[1].getAttribute('src');
                if (src && !src.includes('blank')) {
                    compeSongData.speed = getSpeedData(src.split('image/sp/640/status')[1].split('_')[2]);
                }
                // 도롱
                src = imgs[2].getAttribute('src');
                if (src && !src.includes("blank")) {
                    if (src.includes("option_button_doron_normal_")) {
                        compeSongData.doron = false;
                    }
                    else {
                        compeSongData.doron = true;
                    }
                }
                //아베코베
                src = imgs[3].getAttribute('src');
                if (src && !src.includes("blank")) {
                    if (src.includes("option_button_abekobe_normal_")) {
                        compeSongData.abekobe = false;
                    }
                    else {
                        compeSongData.abekobe = true;
                    }
                }
                //랜덤
                src = imgs[4].getAttribute('src');
                if (src && !src.includes("blank")) {
                    if (src.includes("image/sp/640/option_button_kimagure")) {
                        compeSongData.random = "kimagure";
                    }
                    else if (src.includes("image/sp/640/option_button_detarame")) {
                        compeSongData.random = "detarame";
                    }
                    else {
                        compeSongData.random = false;
                    }
                };

                songList.push(compeSongData);
            });

            const compeDetail: CompeDetail = {
                title,
                hostNickname,
                hostTaikoNo,
                totalEntry: Number(totalEntryText),
                startDate: new CompeDate(startDateText),
                endDate: new CompeDate(endDateText),
                songList
            };
            if (compeDetail.startDate.getTime() > compeDetail.endDate.getTime()) {
                compeDetail.endDate.setFullYear(compeDetail.endDate.getFullYear() + 1)
            };
            return compeDetail;

            function getSpeedData(key: string): number {
                switch (key) {
                    case 'a3': return 2.0;
                    case 'a4': return 3.0;
                    case 'a5': return 4.0;
                    case 'a11': return 1.1;
                    case 'a12': return 1.2;
                    case 'a13': return 1.3;
                    case 'a14': return 1.4;
                    case 'a15': return 1.5;
                    case 'a16': return 1.6;
                    case 'a17': return 1.7;
                    case 'a18': return 1.8;
                    case 'a19': return 1.9;
                    case 'a25': return 2.5;
                    case 'a35': return 3.5;
                }
                return 1.0
            }
        }

        export function compeRanking(html: string) {
            const dom = parseHTML(html);

            const header = dom.querySelector('header > h1')?.textContent?.trim();
            if (!header || header === 'エラー') {
                return null;
            }

            const rankingDatas: RankingData[] = [];
            dom.querySelectorAll('.festivalRankThumbList').forEach((el) => {
                const rankText = el.querySelector('.compeRankingText')?.textContent?.trim()?.replace('位', '');
                const entryNickName = el.querySelector('.player-info div')?.textContent?.trim()?.split('\n')?.[0];
                const entryTaikoNo = el.querySelector('.player-info img')?.getAttribute('src')?.replace(/^(.*)mydon_([0-9]*)$/, '$2');

                if (!rankText || !entryNickName || !entryTaikoNo) return;

                const rankingData: RankingData = {
                    rank: Number(rankText),
                    entryNickName,
                    entryTaikoNo,
                    songScore: [],
                    totalScore: 0
                };

                const totalScoreText = el.querySelector('.player-info div')?.textContent?.trim()?.split('\n')?.[1]?.trim()?.replace('点', '');
                if (totalScoreText && totalScoreText !== "スコア未登録") {
                    rankingData.totalScore = Number(totalScoreText);
                };

                el.querySelectorAll('.block > div').forEach((ele) => {
                    const title = ele.querySelector('p:nth-last-child(3)')?.textContent?.trim();
                    const songScoreText = ele.querySelector('p:nth-last-child(2)')?.textContent?.trim()?.replace('点', '');

                    if (!title || !songScoreText) return;

                    let score = 0;
                    if (songScoreText !== "スコア未登録") {
                        score = Number(songScoreText)
                    }

                    rankingData.songScore.push({
                        title,
                        score
                    });
                });

                rankingDatas.push(rankingData);
            });

            return rankingDatas;
        }

        export function currentLogin(html: string) {
            const dom = parseHTML(html);

            const mydonArea = dom.querySelector('div#mydon_area');
            if (!mydonArea) return null;

            const userDivs = mydonArea?.querySelectorAll(':scope > div');

            const nicknameDiv = userDivs?.[1];
            const nickname = nicknameDiv?.textContent?.replaceAll('\n', '').replaceAll('\t', '');

            const userDiv = userDivs?.[2];
            const detailDiv = userDiv?.querySelector('div.detail');
            const taikoNumberP = detailDiv?.querySelectorAll('p')?.[1];
            const taikoNumber = taikoNumberP?.textContent?.replace('太鼓番：', '');

            const mydonDiv = userDiv?.querySelector('div.mydon_image');
            const img = mydonDiv?.querySelector('img');
            const myDon = img?.getAttribute('src');

            if (!nickname || !taikoNumber || !myDon) {
                return null;
            }

            const currentLogin: CardData = {
                nickname,
                taikoNumber,
                myDon
            };

            return currentLogin;
        }

        export function daniData(data: { html: string, daniNo: number }): DaniData | null;
        export function daniData(data: { html: string, daniNo: number }[]): DaniData[];
        export function daniData(data: { html: string, daniNo: number } | { html: string, daniNo: number }[]) {
            if (Array.isArray(data)) {
                return data.map((e) => p(e)).filter(e => e !== null) as DaniData[];
            }
            else {
                return p(data);
            }

            function p(data: { html: string, daniNo: number }): DaniData | null {
                const { html, daniNo } = data;
                const dom = parseHTML(html);

                if (dom.querySelector('h1')?.textContent === 'エラー') {
                    return null;
                }

                const title = dom.querySelector('#dan_detail div')?.textContent?.replaceAll('\t', '').replaceAll('\n', '')?.trim() ?? '';

                let played = false;
                const bestScore: BestScore = {
                    score: 0,
                    good: 0,
                    ok: 0,
                    bad: 0,
                    roll: 0,
                    maxCombo: 0,
                    hit: 0,
                    conditions: [],
                    songRecords: []
                }

                if (!dom.querySelector('p.head_error')?.textContent) {
                    played = true;
                    bestScore.score = Number(dom.querySelector('.total_score_score')?.textContent ?? 0);
                    bestScore.good = Number(dom.querySelectorAll('.total_status')?.[0]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                    bestScore.ok = Number(dom.querySelectorAll('.total_status')?.[2]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                    bestScore.bad = Number(dom.querySelectorAll('.total_status')?.[4]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                    bestScore.roll = Number(dom.querySelectorAll('.total_status')?.[1]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                    bestScore.maxCombo = Number(dom.querySelectorAll('.total_status')?.[3]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                    bestScore.hit = Number(dom.querySelectorAll('.total_status')?.[5]?.textContent?.replaceAll('\t', '').replaceAll('\n', '') ?? 0);
                }

                const bestConditions: Condition[] = [];
                const conditionDivs = dom.querySelectorAll('.odai_total_song_wrap,.odai_song_wrap');
                conditionDivs.forEach((e, i) => {
                    let condition: Condition = {
                        name: '',
                        criteria: [],
                        record: []
                    };

                    let type;
                    let name: string = '';
                    if (e.getAttribute('class') === 'odai_total_song_wrap') {
                        type = 'single';
                        name = getConditionName(e.querySelectorAll('.odai_total_song_border span')?.[0]?.textContent?.trim() ?? '')
                    }
                    else {
                        type = 'multi';
                        name = getConditionName(e.querySelectorAll('.odai_song_border_name')?.[0]?.textContent?.trim() ?? '')
                    }

                    if (type === 'single') {
                        condition = {
                            name,
                            criteria: [Number(e.querySelectorAll('.odai_total_song_border span')?.[2]?.textContent?.replace(/[^0-9]/g, '') ?? 0)],
                            record: [Number(e.querySelectorAll('.odai_total_song_result')?.[0]?.textContent?.replace(/[^0-9]/g, '') ?? 0)]
                        }
                    }
                    else if (type === 'multi') {
                        const criteria: number[] = [];
                        const record: number[] = [];

                        e.querySelectorAll('.odai_song_border_border').forEach((e) => {
                            criteria.push(Number(e.querySelectorAll('span')?.[0]?.textContent?.replace(/[^0-9]/g, '') ?? 0));
                            record.push(Number(e.querySelectorAll('span')?.[1]?.textContent?.replace(/[^0-9]/g, '') ?? 0));
                        });

                        condition = {
                            name,
                            criteria,
                            record
                        }
                    }

                    if (i < conditionDivs.length / 2) {
                        bestScore.conditions.push(condition);
                    }
                    else {
                        bestConditions.push(condition);
                    }
                })

                const songListDiv = dom.querySelector('#songList')?.querySelectorAll(':scope > *');
                songListDiv?.forEach((e) => {
                    let title: string = e.querySelector('.songName')?.textContent?.trim() ?? '';
                    let difficulty = getSongDifficulty(e.querySelector('.score_open img')?.getAttribute('src')?.trim())
                    let good = Number(e.querySelector('.good_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);
                    let ok = Number(e.querySelector('.ok_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);
                    let bad = Number(e.querySelector('.ng_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);
                    let roll = Number(e.querySelector('.pound_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);
                    let maxCombo = Number(e.querySelector('.combo_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);
                    let hit = Number(e.querySelector('.hit_cnt')?.textContent?.replace(/[^0-9]/g, '') ?? 0);

                    let songRecord: SongRecord = {
                        title,
                        difficulty,
                        good,
                        ok,
                        bad,
                        roll,
                        maxCombo,
                        hit
                    }

                    bestScore.songRecords.push(songRecord);
                })

                const daniData: DaniData = {
                    title,
                    daniNo,
                    played,
                    bestScore,
                    bestConditions
                }

                return daniData

                function getConditionName(nameOriginal: string) {
                    let name: string = '';
                    switch (nameOriginal) {
                        case '魂ゲージ': {
                            name = 'gauge';
                            break;
                        }
                        case '良': {
                            name = 'good';
                            break;
                        }
                        case '可': {
                            name = 'ok';
                            break;
                        }
                        case '不可': {
                            name = 'bad';
                            break;
                        }
                        case '連打数': {
                            name = 'roll';
                            break;
                        }
                    }
                    return name;
                }

                function getSongDifficulty(src: string | undefined) {
                    let difficulty: string = '';
                    switch (src) {
                        case 'image/sp/640/level_icon_1_640.png': {
                            difficulty = 'easy';
                            break;
                        }
                        case 'image/sp/640/level_icon_2_640.png': {
                            difficulty = 'normal';
                            break;
                        }
                        case 'image/sp/640/level_icon_3_640.png': {
                            difficulty = 'hard';
                            break;
                        }
                        case 'image/sp/640/level_icon_4_640.png': {
                            difficulty = 'oni';
                            break;
                        }
                        case 'image/sp/640/icon_ura_640.png': {
                            difficulty = 'ura';
                            break;
                        }
                    }
                    return difficulty;
                }
            }
        }

        export function scoreData(data: { html: string | string[], songNo: string }) {
            const { html, songNo } = data;

            if (typeof (html) === "string") {
                const { title, difficulty, difficultyScoreData } = p(html as string) ?? {};
                if (!title || !difficulty || !difficultyScoreData) return null;

                const scoreData: ScoreData = {
                    title,
                    songNo,
                    difficulty: {}
                };

                scoreData.difficulty[difficulty] = difficultyScoreData;

                return scoreData;
            }
            else {
                let scoreData: ScoreData | null = null;

                for (let i = 0; i < 5; i++) {
                    if (!(html as string[])[i]) continue;

                    const { title, difficulty, difficultyScoreData } = p((html as string[])[i]) ?? {};
                    if (!title || !difficulty || !difficultyScoreData) continue;

                    if (!scoreData) {
                        scoreData = {
                            title,
                            songNo,
                            difficulty: {}
                        }
                    }

                    scoreData.difficulty[difficulty] = difficultyScoreData;
                }

                return scoreData;
            }

            function p(html: string) {
                const dom = parseHTML(html);

                const errorText = dom.querySelector('#content')?.textContent?.trim();
                if (errorText === '指定されたページは存在しません。') return null;

                const title = dom.querySelector('.songNameTitleScore')?.textContent?.trim();
                const difficultyNumber = dom.querySelector('.level')?.getAttribute('src')?.replace(/image\/sp\/640\/level_icon_([0-9])_640.png/, '$1');
                const difficulty = (['easy', 'normal', 'hard', 'oni', 'ura'] as const)[Number(difficultyNumber) - 1];
                if (!title || !difficulty) return null;

                const difficultyScoreData: DifficultyScoreData = {
                    crown: null,
                    badge: null,
                    score: 0,
                    ranking: 0,
                    good: 0,
                    ok: 0,
                    bad: 0,
                    maxCombo: 0,
                    roll: 0,
                    count: {
                        play: 0,
                        clear: 0,
                        fullcombo: 0,
                        donderfullcombo: 0
                    }
                }

                if (dom.querySelectorAll('.scoreDetailStatus').length > 0) {
                    const crown = getCrown(dom.querySelector('.scoreDetailStatus .crown')?.getAttribute('src')?.replace('image/sp/640/crown_large_', '')?.replace('_640.png', ''));
                    if (crown) difficultyScoreData.crown = crown;

                    const badge = getBadge(dom.querySelector('.scoreDetailStatus .best_score_icon'));
                    if (badge) difficultyScoreData.badge = badge;

                    difficultyScoreData.score = Number(dom.querySelector('.high_score')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.ranking = Number(dom.querySelector('.ranking')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.good = Number(dom.querySelector('.good_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.ok = Number(dom.querySelector('.ok_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.bad = Number(dom.querySelector('.ng_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.maxCombo = Number(dom.querySelector('.combo_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.roll = Number(dom.querySelector('.pound_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.count.play = Number(dom.querySelector('.stage_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.count.clear = Number(dom.querySelector('.clear_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.count.fullcombo = Number(dom.querySelector('.full_combo_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                    difficultyScoreData.count.donderfullcombo = Number(dom.querySelector('.dondafull_combo_cnt')?.textContent?.replace(/[^0-9]/g, '')) || 0;
                }

                return { title, difficulty, difficultyScoreData };
            }

            function getCrown(src: string | undefined) {
                let crown: Crown | null = null;
                switch (src) {
                    case '0': {
                        crown = 'played';
                        break;
                    }
                    case '1': {
                        crown = 'silver';
                        break;
                    }
                    case '2': {
                        crown = 'gold';
                        break;
                    }
                    case '3': {
                        crown = 'donderfull';
                        break;
                    }
                }
                return crown;
            }

            function getBadge(element: HTMLElement | Element | null): Badge | null {
                if (!element) return null;
                const badgeText = element.getAttribute('src')?.replace('image/sp/640/best_score_rank_', '').replace('_640.png', '');
                if (!badgeText) return null;

                switch (badgeText) {
                    case '8': {
                        return 'rainbow';
                    }
                    case '7': {
                        return 'purple';
                    }
                    case '6': {
                        return 'pink';
                    }
                    case '5': {
                        return 'gold';
                    }
                    case '4': {
                        return 'silver';
                    }
                    case '3': {
                        return 'bronze';
                    }
                    case '2': {
                        return 'white';
                    }
                    default: {
                        return null;
                    }
                }
            }
        }
    }

    export namespace func {
        /**
         * 세션 토큰을 가져옵니다. 세션 토큰은 사용자를 구분하는 데 사용합니다.
         * @param email 
         * @param password 
         * @returns 
         */
        export async function getSessionToken({ email, password }: { email: string, password: string }) {
            /*
            첫 번째 요청
            200 응답
            */
            let response: Response;
            try {
                const data = {
                    client_id: 'nbgi_taiko',
                    redirect_uri: 'https://www.bandainamcoid.com/v2/oauth2/auth?back=v3&client_id=nbgi_taiko&scope=JpGroupAll&redirect_uri=https%3A%2F%2Fdonderhiroba.jp%2Flogin_process.php%3Finvite_code%3D%26abs_back_url%3D%26location_code%3D&text=',
                    customize_id: '',
                    login_id: email,
                    password: password,
                    shortcut: 0,
                    retention: 0,
                    language: 'ko',
                    cookie: '{"language":"ko"}',
                    prompt: 'login',
                };

                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(data)) {
                    params.append(key, `${value}`);
                }

                response = await fetch('https://account-api.bandainamcoid.com/v3/login/idpw', {
                    method: 'post',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...createHeader() },
                    body: params
                });

                if (response.status !== 200) {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            /*
            두 번째 요청
            302 응답
            */
            try {
                const data = await response.json();
                if (!data.redirect) {
                    throw new HirobaError("INVALID_ID_PASSWORD");
                }

                let cookieString = '';
                const cookies = setCookieParser(response.headers.getSetCookie())
                for (const cookie of cookies) {
                    if (cookie.domain === '.bandainamcoid.com' && cookie.value !== undefined) {
                        cookieString += cookie.name + '=' + cookie.value + ';';
                    }
                } response = await fetch(data.redirect, {
                    headers: createHeader(cookieString),
                    redirect: 'manual'
                });
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError("CANNOT_CONNECT", err)
                }
                else if (err instanceof HirobaError) {
                    throw err
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            /*
            세 번째 요청
            302
            */
            try {
                response = await fetch(response.headers.get('location') as string, {
                    headers: createHeader(),
                    redirect: 'manual'
                });

                if (response.status !== 302) {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            /*
            네 번째 요청
            200
            */
            try {
                response = await fetch(response.headers.get('location') as string, {
                    headers: createHeader(response.headers.getSetCookie()[2].split(';')[0])
                });
                const token = setCookieParser(response.headers.getSetCookie()).find(e => e.name === '_token_v2')?.value as string;
                if (!token) {
                    throw response;
                }
                return token;
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }
        }

        /**
         * 계정에 등록된 카드 리스트를 가져옵니다.
         * 이 함수를 사용하면 카드 로그인이 풀립니다.
         * @param token 
         * @returns 
         */
        export async function getCardList(data?: { token?: string }) {
            const html = await request.cardList(data);
            return parse.cardList(html);
        }

        /**
         * 특정 북번호를 가진 카드로 로그인합니다.
         * @param data 
         */
        export async function cardLogin(data: { token?: string, taikoNumber: string, cardList?: CardData[] }) {
            const { token, taikoNumber } = data;

            const cardList = data.cardList ?? await getCardList(data);
            const matchedCardIndex = cardList.findIndex(card => card.taikoNumber === taikoNumber);

            if (matchedCardIndex === -1) {
                throw new HirobaError('NO_MATCHED_CARD');
            }

            let response: Response;
            // 첫 번째 요청
            // 302 응답
            try {
                const params = new URLSearchParams();
                params.set('id_pos', `${matchedCardIndex + 1}`);
                params.set('mode', 'exec');

                response = await fetch('https://donderhiroba.jp/login_select.php', {
                    method: 'post',
                    headers: createHeader(token ? `_token_v2=${token}` : undefined),
                    redirect: 'manual',
                    body: params
                });

                if (response.status !== 302) {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            }

            // 두 번째 요청
            // 200 응답
            try {
                response = await fetch(response.headers.get('location') as string, {
                    method: 'get',
                    headers: createHeader(token ? `_token_v2=${token}` : undefined)
                });

                if (response.status !== 200) throw response;
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            };

            return cardList[matchedCardIndex];
        }

        /**
         * 클리어 데이터를 가져옵니다.
         */
        export async function getClearData(data?: { token?: string, genre?: keyof typeof Const.genre }) {
            return parse.clearData(await request.clearData(data));
        }

        /**
         * 특정 대회의 상세 데이터를 가져옵니다.
         * @param data
         * @returns 
         */
        export async function getCompeDetail(data: { token?: string, compeId: string }) {
            return parse.compeDetail(await request.compeDetail(data))
        }

        /**
         * 특정 대회의 랭킹 데이터를 가져옵니다.
         * @param data
         * @returns 
         */
        export async function getCompeRanking(data: { token?: string, compeId: string }) {
            return parse.compeRanking(await request.compeRanking(data))
        }

        /**
         * 특정 대회의 데이터를 가져옵니다.
         */
        export async function getCompeData(data: { token?: string, compeId: string }) {
            const { token, compeId } = data;
            const detail = await getCompeDetail({ token, compeId });
            if (detail === null) {
                return null;
            }
            const ranking = await getCompeRanking({ token, compeId });
            if (ranking === null) {
                return null;
            }

            const compeData = {
                ...detail,
                ranking
            }

            return compeData;
        }

        /**
         * 현재 로그인 되어있는 카드의 데이터를 가져옵니다.
         * @param data 
         * @returns 
         */
        export async function getCurrentLogin(data?: { token?: string }) {
            return parse.currentLogin(await request.currentLogin(data));
        }

        /**
         * 단위 플레이 데이터를 가져옵니다.
         * @param data 
         */
        export async function getDaniData(data?: { token?: string, daniNo?: undefined }): Promise<DaniData[]>;
        export async function getDaniData(data?: { token?: string, daniNo: number }): Promise<DaniData | null>;
        export async function getDaniData(data?: { token?: string, daniNo?: number }) {
            const { token, daniNo } = data ?? {};
            if (daniNo) {
                return parse.daniData({ html: await request.daniData({ token, daniNo }), daniNo })
            }
            else {
                return parse.daniData((await request.daniData({ token })).map((html, i) => ({ html, daniNo: i + 1 })))
            }
        }

        /**
         * 곡의 점수 데이터를 가져옵니다.
         * @param data 
         * @returns 
         */
        export async function getScoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }) {
            const { token, songNo, difficulty } = data;
            return parse.scoreData({ html: await request.scoreData({ token, songNo, difficulty: (difficulty as any) }), songNo });
        }

        /**
         * 곡 점수 데이터를 새로고침합니다.
         */
        export async function updateRecord(data: { token?: string }) {
            const { token } = data;
            try {
                const headers: HeadersInit = {
                    Accept: 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'ko,en;q=0.9,en-US;q=0.8',
                    'Content-Length': '7',
                    'Origin': 'https://donderhiroba.jp',
                    Referer: 'https://donderhiroba.jp/score_list.php',
                    'X-Requested-With': 'XMLHttpRequest',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183'
                };
                if (token) {
                    headers.Cookie = '_token_v2=' + token;
                }

                //const body = new URLSearchParams();
                //body.set('_tckt', ticket);

                var response = await fetch('https://donderhiroba.jp/ajax/update_score.php', {
                    headers,
                    redirect: 'manual',
                    method: 'post',
                    //body
                });

                if (response.status !== 200) {
                    throw response;
                }
            }
            catch (err) {
                console.log(err);
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            };

            try {
                const responseData = await response.json();

                if (responseData.result === 0) {
                    return;
                }
                else {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('UNKNOWN_ERROR', err);
                }
                else {
                    throw new HirobaError('UNKNOWN_ERROR');
                }
            }
        }

        /**
         * 닉네임을 변경합니다.
         * @param data 
         * @returns 
         */
        export async function changeName(data: { token?: string, ticket: string, newName: string }) {
            const { token, ticket, newName } = data;
            try {
                const body = new URLSearchParams({
                    '_tckt': ticket,
                    newName,
                    mode: 'name'
                });

                const headers: HeadersInit = {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "priority": "u=0, i",
                    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-requested-with": "XMLHttpRequest",
                    "Referer": "https://donderhiroba.jp/mypage_top.php",
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183'
                };

                if (token) {
                    headers.Cookie = '_token_v2=' + token;
                }

                var response = await fetch(`https://donderhiroba.jp/ajax/change_mydon_profile.php`, {
                    method: 'post',
                    headers,
                    redirect: 'manual',
                    body
                });

                if (response.status !== 200) {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('CANNOT_CONNECT', err);
                }
                else {
                    throw new HirobaError('CANNOT_CONNECT');
                }
            };

            try {
                const responseData = await response.json();

                if (responseData.result === 0) {
                    return;
                }
                else {
                    throw response;
                }
            }
            catch (err) {
                if (err instanceof Response) {
                    throw new HirobaError('UNKNOWN_ERROR', err);
                }
                else {
                    throw new HirobaError('UNKNOWN_ERROR');
                }
            }
        }

        /**
         * 닉네임 변경을 위한 ticket 값을 가져옵니다.
         * @param data 
         * @returns 
         */
        export async function getTicket(data?: { token?: string }) {
            return parse.ticket(await request.ticket(data));
        }
    }
}