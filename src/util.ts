import { load } from "cheerio";
import { type intToRGBA, type Jimp } from "jimp";
import { parse as nodeHtmlParser, type HTMLElement } from 'node-html-parser';
import { DaniPassData } from "./types/daniData";

export function createHeader(cookie?: string) {
    const headers: Record<string, string> = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        "cache-control": "max-age=0",
        "priority": "u=0, i",
        "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        "referer": "https://donderhiroba.jp"
    }

    if (cookie) {
        if(!cookie.trim().endsWith(';')){
            cookie = cookie.trim() + ';';
        }
        headers.cookie = cookie;
    }

    return new Headers(headers);
}

export class HirobaError extends Error {
    code: HirobaErrorCode;
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

export function isBrowser() {
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

let jimp: { Jimp: typeof Jimp, intToRGBA: typeof intToRGBA } | null = null;
export async function detectDaniPass(image: Blob): Promise<DaniPassData> {
    const pixelExtractor = await getPixelExtractor(image);
    if (!pixelExtractor) return null;

    const passRgb = pixelExtractor(425, 73);
    let pass: 'red' | 'gold' | null = null
    if (isSameRgb(passRgb, { r: 247, g: 52, b: 13 })) {
        pass = 'red';
    }
    else if (isSameRgb(passRgb, { r: 251, g: 234, b: 6 })) {
        pass = 'gold';
    }
    if (!pass) return null;

    const frameRgb = pixelExtractor(435, 132);
    let frame: 'silver' | 'gold' | 'donderfull';
    if (isSameRgb(frameRgb, { r: 213, g: 213, b: 214 })) {
        frame = 'silver';
    }
    else if (isSameRgb(frameRgb, { r: 243, g: 190, b: 37 })) {
        frame = 'gold';
    }
    else {
        frame = 'donderfull';
    }

    return { pass, frame }


    async function getPixelExtractor(image: Blob) {
        if (isBrowser()) {
            const img = new Image();
            const imageUrl = URL.createObjectURL(image);
            const loadPromise = new Promise<boolean>((res) => {
                img.onload = () => res(true);
                img.onerror = () => res(false);
            }).then((v) => {
                URL.revokeObjectURL(imageUrl);
                return v;
            })
            img.src = imageUrl;

            if (await loadPromise === null) return null;

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                return null;
            }
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);

            return (x: number, y: number) => {
                const pixelData = context.getImageData(x, y, 1, 1).data;
                return ({ r: pixelData[0], g: pixelData[1], b: pixelData[2], a: pixelData[3] });
            }
        }
        else {
            if (!jimp) {
                jimp = await import('jimp').then((module) => ({ Jimp: module.Jimp, intToRGBA: module.intToRGBA })) as { Jimp: typeof Jimp, intToRGBA: typeof intToRGBA };
            }
            const img = await jimp.Jimp.read(await image.arrayBuffer());

            return (x: number, y: number) => {
                const hex = img.getPixelColor(x, y);
                const rgba = (jimp as { Jimp: typeof Jimp, intToRGBA: typeof intToRGBA }).intToRGBA(hex);
                return rgba;
            }
        }
    }

    function isSameRgb(rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }) {
        return (rgb2.r - 10 <= rgb1.r && rgb1.r <= rgb2.r + 10) && (rgb2.g - 10 <= rgb1.g && rgb1.g <= rgb2.g + 10) && (rgb2.b - 10 <= rgb1.b && rgb1.b <= rgb2.b + 10);
    }
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