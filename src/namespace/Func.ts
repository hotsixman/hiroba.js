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
        // 브라우저의 실제 로그인 과정을 그대로 따라갑니다.
        //   1. account-api 에 ID/PW 로그인 요청을 보냅니다. (응답에 세션 쿠키와 리다이렉트 URL 이 담깁니다)
        //   2. 리다이렉트 URL 이 passkeyInfo.html 이라면 패스키 안내 화면을 건너뜁니다.
        //      (실제 화면에서 "나중에" 를 누르는 것과 동일하게, /v3/passkey/info 를 호출한 뒤 redirect_uri 로 이동합니다)
        //   3. 리다이렉트를 따라가다가 donderhiroba.jp 가 발급하는 _token_v2 쿠키를 세션 토큰으로 사용합니다.

        // 로그인 과정에서 발급되는 쿠키를 모아 둡니다.
        // (account-api 의 응답은 쿠키 헤더 대신 JSON 으로 쿠키 목록을 돌려줍니다)
        const cookies: Record<string, { name: string, value?: string, domain?: string }> = {};
        const addCookies = (cookieMap: Record<string, { name: string, value?: string, domain?: string }>) => {
            for (const key of Object.keys(cookieMap ?? {})) {
                const cookie = cookieMap[key];
                if (cookie && cookie.name && cookie.value !== undefined) {
                    cookies[cookie.name] = cookie;
                }
            }
        };
        const cookieJson = () => {
            const result: Record<string, string> = {};
            for (const [name, cookie] of Object.entries(cookies)) {
                if (cookie.value !== undefined) {
                    result[name] = cookie.value;
                }
            }
            return JSON.stringify(result);
        };

        /*
        첫 번째 요청: 로그인
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
        두 번째 요청 이후: 리다이렉트 추적
        */
        let body: any;
        try {
            body = await response.json();
            // 응답에 포함된 쿠키 목록을 저장합니다.
            addCookies(body.cookie);
            for (const cookie of setCookieParser(response.headers.getSetCookie())) {
                if (cookie.value !== undefined) {
                    cookies[cookie.name] = { name: cookie.name, value: cookie.value, domain: cookie.domain };
                }
            }
            if (!body.redirect) {
                throw new HirobaError("INVALID_ID_PASSWORD");
            }
        }
        catch (err) {
            if (err instanceof HirobaError) {
                throw err;
            }
            else if (err instanceof Response) {
                throw new HirobaError('CANNOT_CONNECT', err);
            }
            else {
                throw new HirobaError('CANNOT_CONNECT');
            }
        }

        // 브라우저와 동일하게 요청 헤더를 구성합니다.
        const accountHeaders = (): Record<string, string> => ({
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-site",
            "upgrade-insecure-requests": "1",
            "Referer": "https://account.bandainamcoid.com/",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        });

        // 호스트별 쿠키 저장소입니다. 같은 이름의 쿠키가 여러 번 오면 마지막 값이 적용됩니다.
        // (실제 브라우저의 쿠키 저장소와 동일하게 동작하도록, 마지막 Set-Cookie 가 이깁니다)
        const hostCookies: Record<string, Record<string, string>> = {};
        const applySetCookies = (res: Response) => {
            const host = new URL(res.url).host;
            hostCookies[host] ??= {};
            for (const cookie of setCookieParser(res.headers.getSetCookie())) {
                if (cookie.value !== undefined) {
                    hostCookies[host][cookie.name] = cookie.value;
                }
            }
        };
        const cookieHeaderFor = (host: string) => {
            const store = hostCookies[host];
            if (!store) return undefined;
            const joined = Object.entries(store).map(([name, value]) => `${name}=${value}`).join('; ');
            return joined.length > 0 ? joined : undefined;
        };

        try {
            let currentUrl = body.redirect as string;
            let token: string | undefined;
            // 리다이렉트를 따라가며 _token_v2 를 찾을 때까지 반복합니다.
            for (let i = 0; i < 10; i++) {
                const url = new URL(currentUrl);

                // 패스키 안내 페이지(account.bandainamcoid.com/passkeyInfo.html)로 이동된 경우
                if (url.pathname.includes('passkeyInfo.html')) {
                    // 1. 실제 브라우저처럼 패스키 안내 페이지를 엽니다.
                    await fetch(url, {
                        headers: accountHeaders(),
                        redirect: 'manual'
                    });

                    // 2. 페이지에 포함된 스크립트가 호출하는 것과 동일하게 passkey/info 를 호출합니다.
                    //    (이 호출을 해야 뒤의 oauth2/auth 로 code 가 유효하게 전달됩니다)
                    const code = url.searchParams.get('code') ?? '';
                    const infoParams = new URLSearchParams();
                    infoParams.set('client_id', url.searchParams.get('client_id') ?? 'nbgi_taiko');
                    infoParams.set('backto', url.searchParams.get('backto') ?? '');
                    infoParams.set('redirect_uri', url.searchParams.get('redirect_uri') ?? '');
                    infoParams.set('customize_id', url.searchParams.get('customize_id') ?? '');
                    infoParams.set('code', code);
                    infoParams.set('language', 'ko');
                    infoParams.set('cookie', cookieJson());

                    const infoResponse = await fetch(`https://account-api.bandainamcoid.com/v3/passkey/info?${infoParams}`, {
                        headers: {
                            "accept": "application/json, text/javascript, */*; q=0.01",
                            "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                            "Referer": "https://account.bandainamcoid.com/",
                            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
                        }
                    });
                    if (infoResponse.status === 200) {
                        const infoBody = await infoResponse.json().catch(() => null);
                        if (infoBody?.cookie) {
                            addCookies(infoBody.cookie);
                        }
                    }

                    // 3. 패스키 안내 화면에서 "나중에" 를 누른 것과 동일하게 redirect_uri 로 이동합니다.
                    const redirectUri = url.searchParams.get('redirect_uri');
                    if (!redirectUri) {
                        throw new HirobaError('CANNOT_CONNECT');
                    }
                    const skipUrl = new URL(redirectUri);
                    skipUrl.searchParams.set('code', code);
                    currentUrl = skipUrl.toString();
                    continue;
                }

                // 일반적인 리다이렉트 요청
                // donderhiroba.jp 로 이동할 때는 이전 응답에서 받은 쿠키(_token_v2 포함)를 함께 보냅니다.
                const headers = accountHeaders();
                const cookieHeader = cookieHeaderFor(url.host);
                if (cookieHeader) {
                    headers.cookie = cookieHeader;
                }
                response = await fetch(currentUrl, {
                    headers,
                    redirect: 'manual'
                });

                // 응답으로 받은 쿠키를 저장하고, _token_v2 가 있으면 세션 토큰 후보로 기록합니다.
                applySetCookies(response);
                const host = new URL(response.url).host;
                const tokenCandidate = hostCookies[host]?.['_token_v2'];
                if (tokenCandidate) {
                    token = tokenCandidate;
                }

                const location = response.headers.get('location');
                // 더 이상 이동할 곳이 없으면(최종 200 응답) 세션 토큰을 반환합니다.
                if (!location) {
                    if (token) {
                        return token;
                    }
                    throw response;
                }
                currentUrl = new URL(location, response.url).toString();
            }
            throw new HirobaError('CANNOT_CONNECT');
        }
        catch (err) {
            if (err instanceof HirobaError) {
                throw err;
            }
            else if (err instanceof Response) {
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