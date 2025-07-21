import { load } from "cheerio";
import { parse as nodeHtmlParser, type HTMLElement } from 'node-html-parser';

export function createHeader(cookie?: string) {
    let headers;
    if (cookie) {
        headers = ({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            cookie
        })
    }
    else {
        headers = ({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        })
    }

    return new Headers(headers);
}

export class HirobaError extends Error {
    code: string;
    response?: Response;

    constructor(code: HirobaErrorCode, response?: Response) {
        super(code);
        this.code = code;
        this.response = response;
    }
}

export type HirobaErrorCode = 'NOT_LOGINED' | 'NOT_NAMCO_LOGINED' | 'CANNOT_CONNECT' | 'INVALID_ID_PASSWORD' | 'NO_MATCHED_CARD' | 'UNKNOWN_ERROR';

/**
 * 반다이 남코 아이디로 로그인 되어 있는 지 체크합니다.
 */
export function checkNamcoLogin(response: Response) {
    // 200 응답이 아닐 때
    if (response.status !== 200) {
        return {
            logined: false,
            error: new HirobaError('NOT_LOGINED', response)
        }
    }

    // origin이 동더히로바가 아닐 때
    if (new URL(response.url).origin !== 'https://donderhiroba.jp') {
        return {
            logined: false,
            error: new HirobaError('NOT_LOGINED', response)
        }
    }

    return {
        logined: true,
        error: null
    }
}

/**
 * 카드 로그인이 되어 있는 지 체크합니다.
 */
export function checkCardLogin(response: Response) {
    // 200 응답이 아닐 때
    if (response.status !== 200) {
        return {
            logined: false,
            error: new HirobaError('NOT_LOGINED', response)
        }
    }

    // origin이 동더히로바가 아닐 때
    if (new URL(response.url).origin !== 'https://donderhiroba.jp') {
        return {
            logined: false,
            error: new HirobaError('NOT_LOGINED', response)
        }
    }

    return {
        logined: true,
        error: null
    }
}

export function isBrowser(){
    return typeof (window) !== "undefined";
}

export function parseHTML(html: string) {
    if (isBrowser()) { //browser
        return new DOMParser().parseFromString(html, 'text/html');
    }
    else { //nodejs
        return nodeHtmlParser(html);
    }
}
export function sanitizeHTML(html: string) {
    let $ = load(html);
    return $.html();
}

export namespace Const {
    export const genre = {
        pops: 1,
        anime: 2,
        kids: 3,
        vocaloid: 4,
        game: 5,
        namco: 6,
        variety: 7,
        classic: 8
    } as const;
}