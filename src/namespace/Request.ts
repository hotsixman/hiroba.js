import { checkCardLogin, checkNamcoLogin, Const, createHeader, HirobaError, isBrowser, sanitizeHTML } from "../util";
import { Difficulty, DaniNo } from "../types/types.js";
import { KisekaeReqData } from "../types/Kisekae";

export namespace Request {
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

    export async function clearData(data?: { token?: string, taikoNo?: string; }): Promise<string[]>;
    export async function clearData(data?: { token?: string, genre: keyof typeof Const.genre, taikoNo?: string; }): Promise<string>;
    export async function clearData(data?: { token?: string, genre?: keyof typeof Const.genre, taikoNo?: string; }) {
        const genre = data?.genre ?? undefined;
        const token = data?.token ?? undefined;
        const taikoNo = data?.taikoNo;

        if (genre) {
            const response = await fetchSpeceficGenrePage(Const.genre[genre]);

            const { logined, error } = checkCardLogin(response);
            if (!logined) throw error;

            return await response.text();
        }
        else {
            const genres = [1, 2, 3, 4, 5, 6, 7, 8];
            const datas: string[] = [];
            for (const genre of genres) {
                const response = await fetchSpeceficGenrePage(genre);

                const { logined, error } = checkCardLogin(response);
                if (!logined) throw error;

                datas.push(await response.text());
            };

            return datas;
        }

        async function fetchSpeceficGenrePage(genre: number) {
            try {
                var response = await fetch(getPageUrl(genre), {
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

            return response;
        }

        function getPageUrl(genre: number) {
            if (taikoNo) {
                return `https://donderhiroba.jp/score_list.php?genre=${genre}&taiko_no=${taikoNo}`
            }
            else {
                return `https://donderhiroba.jp/score_list.php?genre=${genre}`
            }
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

    export async function scoreData(data: { token?: string, songNo: string, difficulty?: undefined, taikoNo?: string; }): Promise<string[]>;
    export async function scoreData(data: { token?: string, songNo: string, difficulty: Difficulty, taikoNo?: string; }): Promise<string>;
    export async function scoreData(data: { token?: string, songNo: string, difficulty?: Difficulty, taikoNo?: string; }) {
        const { token, songNo, difficulty, taikoNo } = data;
        if (difficulty) {
            return await requestScoreDataByDiff({ token, songNo, difficulty, taikoNo });
        }
        else {
            const htmls: string[] = [];
            for (const difficulty of ['easy', 'normal', 'hard', 'oni', 'ura'] as Difficulty[]) {
                htmls.push(await requestScoreDataByDiff({ token, songNo, difficulty, taikoNo }));
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

        async function requestScoreDataByDiff({ songNo, difficulty, token, taikoNo }: { songNo: string, difficulty: Difficulty, token?: string, taikoNo?: string }) {
            let url: URL = new URL("https://donderhiroba.jp/score_detail.php");
            url.searchParams.set("song_no", songNo);
            url.searchParams.set("level", getDifficultyNumber(difficulty).toString());
            if (taikoNo) {
                url.searchParams.set("taiko_no", taikoNo);
            }

            try {
                var response = await fetch(url, {
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

    export async function mypage(data?: { token?: string }) {
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

    export async function daniPlate(data: { token?: string, taikoNo: string; }): Promise<Blob[]>;
    export async function daniPlate(data: { token?: string, dan: DaniNo, taikoNo: string; }): Promise<Blob>;
    export async function daniPlate({ token, dan, taikoNo }: { token?: string, dan?: DaniNo, taikoNo: string; }): Promise<Blob | Blob[]> {
        if (dan) {
            try {
                var response = await fetch(`https://donderhiroba.jp/imgsrc_dani.php?taiko_no=${taikoNo}&dan=${dan}&img=0`, {
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

            return await response.blob();
        }
        else {
            const imgBlobs: Blob[] = [];
            for (let i = 1; i <= 19; i++) {
                try {
                    var response = await fetch(`https://donderhiroba.jp/imgsrc_dani.php?taiko_no=${taikoNo}&dan=${i}&img=0`, {
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

                imgBlobs.push(await response.blob());
            };
            return imgBlobs;
        }
    }

    export async function recentPlayed(data: { token?: string, page?: number }): Promise<string> {
        const { token, page } = data;
        try {
            var response = await fetch(`https://donderhiroba.jp/history_recent_score.php?page=${page}`, {
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

    export async function card(data: { token?: string, taikoNo: string }): Promise<string> {
        const { token, taikoNo } = data;
        const url = new URL('https://donderhiroba.jp/user_profile.php');
        url.searchParams.set('taiko_no', taikoNo);

        try {
            var response = await fetch(url, {
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

    export async function kisekaeTicket(data: { token?: string }): Promise<string> {
        const { token } = data;

        try {
            var response = await fetch("https://donderhiroba.jp/mypage_kisekae.php", {
                method: 'GET',
                headers: createHeader(token ? `_token_v2=${token}` : undefined)
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

        const html = await response.text();
        if (isBrowser()) {
            return html;
        }
        else {
            return sanitizeHTML(html);
        }
    }

    export async function kisekaeCheckIP(data: { token?: string, kisekae: KisekaeReqData, ticket: string }): Promise<void> {
        const { token, kisekae, ticket } = data;

        const headers = createHeader(token ? `_token_v2=${token}` : undefined);
        headers.set('referer', 'https://donderhiroba.jp/mypage_kisekae.php');
        headers.set('x-requested-with', 'XMLHttpRequest');
        headers.set('content-type', 'application/x-www-form-urlencoded; charset=UTF-8');

        try {
            var response = await fetch("https://donderhiroba.jp/ajax/check_ip_kisekae.php", {
                method: 'POST',
                headers,
                body: serializeKisekaeReqData(kisekae, ticket),
                "referrer": "https://donderhiroba.jp/mypage_kisekae.php"
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
    }

    export async function kisekaeChange(data: { token?: string, kisekae: KisekaeReqData, ticket: string }): Promise<void> {
        const { token, kisekae, ticket } = data;

        const headers = createHeader(token ? `_token_v2=${token}` : undefined);
        headers.set('referer', 'https://donderhiroba.jp/mypage_kisekae.php');
        headers.set('x-requested-with', 'XMLHttpRequest');
        headers.set('content-type', 'application/x-www-form-urlencoded; charset=UTF-8');

        try {
            var response = await fetch("https://donderhiroba.jp/ajax/change_mydon.php", {
                method: 'POST',
                headers,
                body: serializeKisekaeReqData(kisekae, ticket),
                "referrer": "https://donderhiroba.jp/mypage_kisekae.php"
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
    }
}

function serializeKisekaeReqData(kisekae: KisekaeReqData, ticket: string) {
    const body = new URLSearchParams();
    body.set('_tckt', ticket);
    body.set('color_body', kisekae.color.body.toString());
    body.set('color_limb', kisekae.color.limb.toString());
    body.set('color_face', kisekae.color.face.toString());
    body.set('costume_1', kisekae.costume.kigurumi.toString());
    body.set('costume_2', kisekae.costume.head.toString());
    body.set('costume_3', kisekae.costume.body.toString());
    body.set('costume_4', kisekae.costume.face.toString());
    body.set('costume_5', kisekae.costume.petitCharacter.toString());
    return body.toString()
}