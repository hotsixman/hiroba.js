import { Badge, CardData, Clear, ClearData, Crown, Difficulty } from "../types/types";
import { checkNamcoLogin, Const, createHeader, HirobaError, sanitizeHTML, parseHTML, isBrowser } from "../util";
import setCookieParser from 'set-cookie-parser';

export class DonderHiroba {

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

                const { logined, error } = checkNamcoLogin(response);
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

                    const { logined, error } = checkNamcoLogin(response);
                    if (!logined) throw error;

                    datas.push(await response.text());
                };

                return datas;
            }
        };
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
                    clearData.difficulty = {...clearData.difficulty, ...difficultyRecord};
                });

                return clearDataMap;
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
        export async function getSessionToken({email, password}: {email: string, password: string}) {
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
        export async function getClearData(data?: {token?: string, genre?: keyof typeof Const.genre}){
            return parse.clearData(await request.clearData(data));
        }
    }
}