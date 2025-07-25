# hiroba-js

> [!NOTE]
> 이 문서는 Gemini로 작성되어 오류가 있을 수 있습니다.

`hiroba-js`는 `donderhiroba.jp` 웹사이트의 데이터를 스크래핑하기 위한 TypeScript 라이브러리입니다. HTTP 요청을 보내고 결과 HTML을 파싱하여 플레이어 데이터에 프로그래밍 방식으로 액세스하는 것을 목표로 합니다.

## 설치

```bash
npm install hiroba-js
```

# `DonderHiroba` 클래스

`DonderHiroba` 클래스는 `donderhiroba.jp`와의 상호작용을 관리하는 라이브러리의 핵심입니다. 이 클래스의 인스턴스는 로그인한 사용자의 세션을 나타내며 데이터를 가져오고 관리하기 위한 다양한 메서드를 제공합니다.

## `DonderHiroba` 인스턴스

`DonderHiroba` 인스턴스는 로그인한 사용자의 상태를 보유하며, 세션 토큰 및 캐시된 데이터를 포함합니다. 사용자를 대신하여 웹사이트와 상호 작용하는 메서드를 제공합니다.

### 속성

- **`token?: string`**: 로그인한 사용자의 세션 토큰입니다. 이 토큰은 웹사이트에 인증된 요청을 하는 데 필요합니다.

- **`namcoLogined: boolean`**: 사용자가 Namco ID에 로그인했는지 여부를 나타내는 부울 값입니다. 로그인 성공 시 `true`로 설정됩니다.

- **`cardLogined: boolean`**: 사용자가 특정 태고 카드에 로그인했는지 여부를 나타내는 부울 값입니다. 카드 로그인 성공 시 `true`로 설정됩니다.

- **`currentLogin: CardData | null`**: 현재 로그인된 카드의 데이터를 포함하는 객체입니다. 로그인된 카드가 없으면 `null`입니다.

- **`cardList: CardData[]`**: 사용자의 태고 카드를 나타내는 `CardData` 객체의 배열입니다.

- **`clearData: Map<string, ClearData>`**: 각 곡의 클리어 데이터를 저장하는 `Map` 객체입니다. 키는 곡 번호(`string`)이고 값은 `ClearData` 객체입니다.

- **`scoreData: Map<string, ScoreData>`**: 각 곡의 점수 데이터를 저장하는 `Map` 객체입니다. 키는 곡 번호(`string`)이고 값은 `ScoreData` 객체입니다.

- **`ticket: string | null`**: 닉네임 변경과 같은 특정 작업에 필요한 문자열 값입니다. 가져온 티켓이 없으면 `null`입니다.

### 메서드

- **`constructor(token?: string)`**: 새로운 `DonderHiroba` 인스턴스를 생성합니다.
  - **`token`** (`string`, optional): 특정 로그인 세션으로 인스턴스를 초기화하기 위해 세션 토큰을 제공할 수 있습니다.

- **`checkNamcoLogined(): Promise<boolean>`**: 사용자가 Namco ID에 로그인했는지 확인합니다. 이렇게 하면 사용자가 카드에서 로그아웃됩니다.
  - **반환값**: 사용자가 로그인한 경우 `true`로 확인되는 `Promise`를 반환하고 그렇지 않은 경우 `false`를 반환합니다.

- **`checkCardLogined(): Promise<boolean>`**: 사용자가 특정 태고 카드에 로그인했는지 확인합니다. 이렇게 하면 사용자가 Namco ID에서 로그아웃될 수 있습니다.
  - **반환값**: 사용자가 로그인한 경우 `true`로 확인되는 `Promise`를 반환하고 그렇지 않은 경우 `false`를 반환합니다.

- **`reloadCardList(): Promise<void>`**: 사용자의 태고 카드 목록을 다시 로드합니다.

- **`cardLogin(taikoNumber: string): Promise<void>`**: 특정 태고 카드에 로그인합니다.
  - **`taikoNumber`** (`string`): 로그인할 카드의 태고 번호입니다.

- **`updateClearData(genre?: keyof typeof Const.genre): Promise<Record<string, ClearData>>`**: 특정 장르의 클리어 데이터를 업데이트하고 업데이트된 데이터를 반환합니다.
  - **`genre`** (`keyof typeof Const.genre`, optional): 클리어 데이터를 업데이트할 장르입니다. 제공되지 않으면 모든 장르가 업데이트됩니다.
  - **반환값**: 곡 번호를 키로 사용하여 업데이트된 클리어 데이터를 포함하는 `Record` 객체로 확인되는 `Promise`를 반환합니다.

- **`updateScoreData(songNo: string, difficulty?: Difficulty): Promise<ScoreData | null>`**: 특정 곡 및 난이도의 점수 데이터를 업데이트하고 업데이트된 데이터를 반환합니다.
  - **`songNo`** (`string`): 점수 데이터를 업데이트할 곡 번호입니다.
  - **`difficulty`** (`Difficulty`, optional): 점수 데이터를 업데이트할 난이도입니다. 제공되지 않으면 모든 난이도가 업데이트됩니다.
  - **반환값**: 업데이트된 `ScoreData` 객체로 확인되는 `Promise`를 반환하거나 곡을 찾을 수 없는 경우 `null`을 반환합니다.

- **`updateRecord(): Promise<void>`**: 곡 점수 데이터를 새로 고칩니다.

- **`changeName(newName: string): Promise<CardData | null>`**: 사용자의 닉네임을 변경합니다.
  - **`newName`** (`string`): 새 닉네임입니다.
  - **반환값**: 업데이트된 `CardData` 객체로 확인되는 `Promise`를 반환하거나 닉네임 변경에 실패한 경우 `null`을 반환합니다.

- **`getTicket(): Promise<string | null>`**: 특정 작업에 필요한 티켓 값을 가져옵니다.
  - **반환값**: 티켓 값으로 확인되는 `Promise`를 반환하거나 티켓을 가져올 수 없는 경우 `null`을 반환합니다.

## 정적 속성 및 메서드

`DonderHiroba` 클래스는 인스턴스를 생성하지 않고 직접 호출할 수 있는 여러 정적 네임스페이스와 메서드를 제공합니다. 이러한 정적 멤버는 주로 특정 페이지에서 HTML을 가져오거나(`request`), 해당 HTML을 파싱하거나(`parse`), 여러 요청과 파싱 단계를 결합하여 특정 기능을 수행(`func`)하는 데 사용됩니다.

### `DonderHiroba.login(options)`

`DonderHiroba` 클래스의 이 정적 메서드는 이메일과 암호를 사용하여 `donderhiroba.jp`에 로그인하고 `DonderHiroba` 인스턴스를 생성하여 반환합니다. `taikoNumber`가 제공되면 해당 태고 번호에 대한 카드 로그인도 수행합니다.

- **인수:**
    - `options` (object):
        - `email` (string): `donderhiroba.jp`에 등록된 이메일 주소입니다.
        - `password` (string): `donderhiroba.jp`에 등록된 암호입니다.
        - `taikoNumber` (string, optional): 로그인할 태고 번호입니다.
- **반환값:**
    - `Promise<DonderHiroba>`: 로그인된 `DonderHiroba` 클래스의 인스턴스로 확인되는 `Promise`를 반환합니다.

### `DonderHiroba.func`

`DonderHiroba.func` 네임스페이스는 `request` 및 `parse`의 함수를 결합하여 특정 작업을 수행하는 래퍼 함수를 포함하는 객체입니다. 예를 들어 `getCardList` 함수는 `request.cardList`로 HTML을 가져온 다음 `parse.cardList`로 파싱하여 최종 결과를 반환합니다.

- **주요 메서드:**
    - **`getSessionToken(credentials: { email: string, password: string }): Promise<string>`**: 이메일과 암호로 로그인하여 세션 토큰을 가져옵니다.
    - **`getCardList(data?: { token?: string }): Promise<CardData[]>`**: 계정에 등록된 카드 목록을 가져옵니다.
    - **`cardLogin(data: { token?: string, taikoNumber: string, cardList?: CardData[] }): Promise<CardData>`**: 특정 태고 번호로 로그인합니다.
    - **`getClearData(data?: { token?: string, genre?: keyof typeof Const.genre }): Promise<ClearData[]>`**: 클리어 데이터를 가져옵니다.
    - **`getScoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }): Promise<ScoreData | null>`**: 곡의 점수 데이터를 가져옵니다.
    - **`getDaniData(data?: { token?: string, daniNo?: number }): Promise<DaniData | DaniData[] | null>`**: 단의 도장 플레이 데이터를 가져옵니다.
    - **`getCompeDetail(data: { token?: string, compeId: string }): Promise<CompeDetail | null>`**: 대회의 세부 정보를 가져옵니다.
    - **`getCompeRanking(data: { token?: string, compeId: string }): Promise<RankingData[] | null>`**: 대회의 순위 데이터를 가져옵니다.
    - **`getCompeData(data: { token?: string, compeId: string }): Promise<CompeData | null>`**: 대회의 세부 정보와 순위 데이터를 모두 가져옵니다.
    - **`getCurrentLogin(data?: { token?: string }): Promise<CardData | null>`**: 현재 로그인된 카드의 데이터를 가져옵니다.
    - **`updateRecord(data: { token?: string }): Promise<void>`**: 곡 점수 데이터를 새로 고칩니다.
    - **`changeName(data: { token?: string, ticket: string, newName: string }): Promise<void>`**: 닉네임을 변경합니다.
    - **`getTicket(data?: { token?: string }): Promise<string | null>`**: 닉네임 변경에 필요한 `ticket` 값을 가져옵니다.

### `DonderHiroba.request`

`DonderHiroba.request` 네임스페이스는 `donderhiroba.jp`의 특정 페이지에 HTTP 요청을 보내고 결과 HTML 문자열을 반환하는 함수를 포함하는 객체입니다. 이러한 함수의 대부분은 로그인 상태를 유지하기 위해 `token` 인수를 허용합니다.

- **주요 메서드:**
    - **`cardList(data?: { token?: string }): Promise<string>`**: 카드 선택 페이지의 HTML을 가져옵니다.
    - **`clearData(data?: { token?: string, genre?: keyof typeof Const.genre }): Promise<string | string[]>`**: 클리어 데이터 페이지의 HTML을 가져옵니다.
    - **`scoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }): Promise<string | string[]>`**: 점수 데이터 페이지의 HTML을 가져옵니다.
    - **`daniData(data?: { token?: string, daniNo?: number }): Promise<string | string[]>`**: 단의 도장 데이터 페이지의 HTML을 가져옵니다.
    - **`compeDetail(data: { token?: string, compeId: string }): Promise<string>`**: 대회 세부 정보 페이지의 HTML을 가져옵니다.
    - **`compeRanking(data: { token?: string, compeId: string }): Promise<string>`**: 대회 순위 페이지의 HTML을 가져옵니다.
    - **`currentLogin(data?: { token?: string }): Promise<string>`**: 현재 로그인된 카드 정보를 얻기 위해 메인 페이지의 HTML을 가져옵니다.
    - **`ticket(data?: { token?: string }): Promise<string>`**: 마이페이지의 HTML을 가져옵니다.

### `DonderHiroba.parse`

`DonderHiroba.parse` 네임스페이스는 `DonderHiroba.request`를 통해 얻은 HTML 문자열을 파싱하고 의미 있는 데이터 구조(객체 또는 배열)로 변환하는 함수를 포함하는 객체입니다.

- **주요 메서드:**
    - **`cardList(html: string): CardData[]`**: 카드 목록 HTML을 파싱하고 `CardData` 객체 배열을 반환합니다.
    - **`clearData(html: string | string[]): ClearData[]`**: 클리어 데이터 HTML을 파싱하고 `ClearData` 객체 배열을 반환합니다.
    - **`scoreData(data: { html: string | string[], songNo: string }): ScoreData | null`**: 점수 데이터 HTML을 파싱하고 `ScoreData` 객체를 반환합니다.
    - **`daniData(data: { html: string, daniNo: number } | { html: string, daniNo: number }[]): DaniData | DaniData[] | null`**: 단의 도장 데이터 HTML을 파싱하고 `DaniData` 객체 또는 객체 배열을 반환합니다.
    - **`compeDetail(html: string): CompeDetail | null`**: 대회 세부 정보 HTML을 파싱하고 `CompeDetail` 객체를 반환합니다.
    - **`compeRanking(html: string): RankingData[] | null`**: 대회 순위 HTML을 파싱하고 `RankingData` 객체 배열을 반환합니다.
    - **`currentLogin(html: string): CardData | null`**: 메인 페이지 HTML을 파싱하고 현재 로그인된 `CardData` 객체를 반환합니다.
    - **`ticket(html: string): string | null`**: 마이페이지 HTML에서 `ticket` 값을 파싱합니다.