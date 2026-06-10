import { CompeDate } from "../class/compeDate.js";
import { Badge, CardData, Clear, ClearData, CompeDetail, CompeSongData, Crown, DaniData, Difficulty, RankingData, BestScore, Condition, SongRecord, ScoreData, DifficultyScoreData, DaniPassData, DaniNo, Summary, RecentPlayed } from "../types/types.js";
import { checkNamcoLogin, Const, createHeader, HirobaError, sanitizeHTML, parseHTML, isBrowser, checkCardLogin, detectDaniPass } from "../util.js";

export namespace Parse {
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

            const totalScoreText = el.querySelector('.player-info div')?.textContent?.replace(/\D/g, "")
            if (totalScoreText) {
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

    export function currentLogin(html: string): (CardData & { summary?: Summary }) | null {
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

        const totalScore = dom.querySelector('.total_score');
        if (!totalScore) {
            return currentLogin;
        }

        const backgroundSrc = totalScore.querySelector('img')?.getAttribute('src');
        if (!backgroundSrc) {
            return currentLogin;
        }
        let diff: 'easy' | 'normal' | 'hard' | 'oni' | 'oniura' = 'oniura';
        switch (backgroundSrc) {
            case ('image/sp/640/total_score_image_1.png'): {
                diff = 'easy';
                break;
            }
            case ('image/sp/640/total_score_image_2.png'): {
                diff = 'normal';
                break;
            }
            case ('image/sp/640/total_score_image_3.png'): {
                diff = 'hard';
                break;
            }
            case ('image/sp/640/total_score_image_4.png'): {
                diff = 'oni';
                break;
            }
        }
        const summary: Summary = {
            diff,
            crown: {
                donderfull: Number(totalScore.querySelector('.donderful_crown_count')?.textContent ?? '0'),
                gold: Number(totalScore.querySelector('.gold_crown_count')?.textContent ?? '0'),
                silver: Number(totalScore.querySelector('.silver_crown_count')?.textContent ?? totalScore.querySelector('.silver_crown_coun')?.textContent ?? '0')
            },
            badge: {
                rainbow: Number(totalScore.querySelector('.best_rank_score_8')?.textContent ?? '0'),
                purple: Number(totalScore.querySelector('.best_rank_score_7')?.textContent ?? '0'),
                pink: Number(totalScore.querySelector('.best_rank_score_6')?.textContent ?? '0'),
                gold: Number(totalScore.querySelector('.best_rank_score_5')?.textContent ?? '0'),
                silver: Number(totalScore.querySelector('.best_rank_score_4')?.textContent ?? '0'),
                bronze: Number(totalScore.querySelector('.best_rank_score_3')?.textContent ?? '0'),
                white: Number(totalScore.querySelector('.best_rank_score_2')?.textContent ?? '0'),
            }
        }

        return {
            ...currentLogin,
            summary
        };
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

                const badge = getBadge(dom.querySelector('.scoreDetailStatus .best_score_icon') as HTMLElement);
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

    export async function daniPass(data: { img: Blob }): Promise<DaniPassData>;
    export async function daniPass(data: { img: Blob[] }): Promise<Record<DaniNo, DaniPassData>>;
    export async function daniPass({ img }: { img: Blob | Blob[] }): Promise<DaniPassData | Record<DaniNo, DaniPassData>> {
        if (Array.isArray(img)) {
            const result: Partial<Record<DaniNo, DaniPassData>> = {};
            for (let [key, value] of Object.entries(img)) {
                result[Number(key) + 1 as DaniNo] = await detectDaniPass(value);
            }
            return result as Record<DaniNo, DaniPassData>;
        }
        else {
            return await detectDaniPass(img);
        }
    }

    export function recentPlayed(html: string): RecentPlayed[] {
        const dom = parseHTML(html);
        const scoreUser = [...dom.querySelectorAll('.scoreUser')];
        const recentPlayed: RecentPlayed[] = scoreUser.map((container) => {
            let diff: Difficulty = "easy";
            switch (container.querySelector('.levelIcon')?.getAttribute('src') ?? '') {
                case 'image/sp/640/icon_course02_2_640.png': {
                    diff = "normal";
                    break;
                }
                case 'image/sp/640/icon_course02_3_640.png': {
                    diff = 'hard';
                    break;
                }
                case 'image/sp/640/icon_course02_4_640.png': {
                    diff = 'oni';
                    break;
                }
                case 'image/sp/640/icon_course02_5_640.png': {
                    diff = 'ura';
                    break;
                }
            };

            let crown: Crown = null;
            switch (container.querySelectorAll('.crownIcon')[0]?.getAttribute('src')) {
                case 'image/sp/640/crown_01_640.png': {
                    crown = 'played';
                    break;
                }
                case 'image/sp/640/crown_02_640.png': {
                    crown = 'gold';
                    break;
                }
                case 'image/sp/640/crown_03_640.png': {
                    crown = 'silver';
                    break;
                }
                case 'image/sp/640/crown_04_640.png': {
                    crown = 'donderfull';
                    break;
                }
            }

            let badge: Badge = null;
            switch (container.querySelectorAll('.crownIcon')[1]?.getAttribute('src')) {
                case 'image/sp/640/best_score_rank_2_640.png': {
                    badge = 'white';
                    break;
                }
                case 'image/sp/640/best_score_rank_3_640.png': {
                    badge = 'bronze';
                    break;
                }
                case 'image/sp/640/best_score_rank_4_640.png': {
                    badge = 'silver';
                    break;
                }
                case 'image/sp/640/best_score_rank_5_640.png': {
                    badge = 'gold';
                    break;
                }
                case 'image/sp/640/best_score_rank_6_640.png': {
                    badge = 'pink';
                    break;
                }
                case 'image/sp/640/best_score_rank_7_640.png': {
                    badge = 'purple';
                    break;
                }
                case 'image/sp/640/best_score_rank_8_640.png': {
                    badge = 'rainbow';
                    break;
                }
            }

            const scoreElems = container.querySelectorAll('.playDataArea.scoreElement');

            return {
                title: container.querySelector('.songNameTitleScore')?.textContent.trim() ?? '',
                diff,
                data: {
                    crown,
                    badge,
                    score: parseInt(scoreElems[0]?.textContent ?? '0'),
                    good: parseInt(scoreElems[1]?.textContent ?? '0'),
                    ok: parseInt(scoreElems[3]?.textContent ?? '0'),
                    bad: parseInt(scoreElems[5]?.textContent ?? '0'),
                    maxCombo: parseInt(scoreElems[2]?.textContent ?? '0'),
                    roll: parseInt(scoreElems[4]?.textContent ?? '0'),
                    count: {
                        play: parseInt(scoreElems[6]?.textContent ?? '0'),
                        clear: parseInt(scoreElems[7]?.textContent ?? '0'),
                        fullcombo: parseInt(scoreElems[8]?.textContent ?? '0'),
                        donderfullcombo: parseInt(scoreElems[9]?.textContent ?? '0'),
                    }
                }
            }
        });

        return recentPlayed;
    }
}