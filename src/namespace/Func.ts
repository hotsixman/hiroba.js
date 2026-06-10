import { Badge, CardData, Clear, ClearData, CompeDetail, CompeSongData, Crown, DaniData, Difficulty, RankingData, BestScore, Condition, SongRecord, ScoreData, DifficultyScoreData, DaniPassData, DaniNo, Summary, RecentPlayed } from "../types/types.js";
import { checkNamcoLogin, Const, createHeader, HirobaError, sanitizeHTML, parseHTML, isBrowser, checkCardLogin, detectDaniPass } from "../util.js";
import setCookieParser from 'set-cookie-parser';
import { HTMLElement } from "node-html-parser";
import { Request } from "./Request.js";
import { Parse } from "./Parse.js";
import { KisekaeReqData } from "../types/Kisekae.js";

export namespace Func {
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
                cookie: `{"language":"ko", "passkeyInfoProd":"d5badc8a-30a3-4477-bca1-9c6a589376f5"}`,
                prompt: 'login',
            };

            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(data)) {
                params.append(key, `${value}`);
            }

            const headers = createHeader();
            headers.set('Content-Type', 'application/x-www-form-urlencoded')

            response = await fetch('https://account-api.bandainamcoid.com/v3/login/idpw', {
                method: 'post',
                headers,
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

            let redirectUri = new URL(data.redirect);
            if (redirectUri.pathname.includes('passkeyInfo.html')) {
                redirectUri = new URL(redirectUri.searchParams.get('redirect_uri') as string);
            }

            let cookieString = '';
            const cookies = setCookieParser(response.headers.getSetCookie())
            for (const cookie of cookies) {
                if (cookie.domain === '.bandainamcoid.com' && cookie.value !== undefined) {
                    cookieString += cookie.name + '=' + cookie.value + ';';
                }
            }
            response = await fetch(data.redirect, {
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
            console.log(err);
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
        const html = await Request.cardList(data);
        return Parse.cardList(html);
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

            const headers = createHeader(token ? `_token_v2=${token}` : undefined);
            headers.set('content-type', "application/x-www-form-urlencoded; charset=UTF-8")

            response = await fetch('https://donderhiroba.jp/login_select.php', {
                method: 'post',
                headers,
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
    export async function getClearData(data?: { token?: string, genre?: keyof typeof Const.genre, taikoNo?: string }) {
        return Parse.clearData(await Request.clearData(data));
    }

    /**
     * 특정 대회의 상세 데이터를 가져옵니다.
     * @param data
     * @returns 
     */
    export async function getCompeDetail(data: { token?: string, compeId: string }) {
        return Parse.compeDetail(await Request.compeDetail(data))
    }

    /**
     * 특정 대회의 랭킹 데이터를 가져옵니다.
     * @param data
     * @returns 
     */
    export async function getCompeRanking(data: { token?: string, compeId: string }) {
        return Parse.compeRanking(await Request.compeRanking(data))
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
        return Parse.currentLogin(await Request.currentLogin(data));
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
            return Parse.daniData({ html: await Request.daniData({ token, daniNo }), daniNo })
        }
        else {
            return Parse.daniData((await Request.daniData({ token })).map((html, i) => ({ html, daniNo: i + 1 })))
        }
    }

    /**
     * 곡의 점수 데이터를 가져옵니다.
     * @param data 
     * @returns 
     */
    export async function getScoreData(data: { token?: string, songNo: string, difficulty?: Difficulty, taikoNo?: string }) {
        const { token, songNo, difficulty, taikoNo } = data;
        return Parse.scoreData({ html: await Request.scoreData({ token, songNo, difficulty: (difficulty as any), taikoNo }), songNo });
    }

    /**
     * 곡 점수 데이터를 새로고침합니다.
     */
    export async function updateRecord(data?: { token?: string, ticket?: string }) {
        const { token, ticket } = data ?? {};
        try {
            const headers: HeadersInit = {
                Accept: 'application/json, text/javascript, */*; q=0.01',
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'ko,en;q=0.9,en-US;q=0.8',
                'Origin': 'https://donderhiroba.jp',
                Referer: 'https://donderhiroba.jp/score_list.php',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.183'
            };
            if (token) {
                headers.Cookie = `_token_v2=${token};`;
            }

            const body = new URLSearchParams();
            body.set('_tckt', ticket ?? Parse.ticket(await Request.clearData({ token, genre: 'pops' })) ?? '');

            var response = await fetch('https://donderhiroba.jp/ajax/update_score.php', {
                headers,
                redirect: 'manual',
                method: 'post',
                body
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
                headers.Cookie = `_token_v2=${token};`;
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

    export async function getDaniPass(data: { token?: string; taikoNo: string; }): Promise<Record<DaniNo, DaniPassData>>;
    export async function getDaniPass(data: { token?: string, dan: DaniNo; taikoNo: string; }): Promise<DaniPassData>;
    export async function getDaniPass(data: { token?: string, dan?: DaniNo; taikoNo: string; }): Promise<DaniPassData | Record<DaniNo, DaniPassData>> {
        return await Parse.daniPass({
            img: await Request.daniPlate(data)
        });
    }

    /**
     * 최근 플레이한 기록을 가져옵니다.
     */
    export async function getRecentPlayed(data: { token?: string, page: number }): Promise<RecentPlayed[]> {
        return Parse.recentPlayed(
            await Request.recentPlayed(data)
        )
    }

    export async function getCardData(data: { token?: string, taikoNo: string }): Promise<CardData & { summary?: Summary } | null> {
        return Parse.currentLogin(
            await Request.card(data)
        )
    }

    /**
     * 코스튬을 바꿉니다.
     */
    export async function changeKisekae(data: { token?: string, kisekae: KisekaeReqData }): Promise<void> {
        const { token, kisekae } = data;

        const ticket = Parse.ticket(await Request.kisekaeTicket({ token }));
        if (!ticket) {
            throw new HirobaError('NO_TICKET');
        }
        await Request.kisekaeCheckIP({ token, kisekae, ticket });
        await Request.kisekaeChange({ token, kisekae, ticket });
    }
}