# `DonderHiroba.func` API 문서

`DonderHiroba.func` 네임스페이스는 동더-히로바 웹사이트와 상호작용하기 위한 여러 함수를 제공합니다.

---

### `getSessionToken({ email, password })`

세션 토큰을 가져옵니다. 세션 토큰은 사용자를 구분하는 데 사용합니다.

-   **매개변수:**
    -   `{ email: string, password: string }`
-   **반환값:** `Promise<string>`

---

### `getCardList(data?)`

계정에 등록된 카드 리스트를 가져옵니다. **이 함수를 사용하면 카드 로그인이 풀립니다.**

-   **매개변수:**
    -   `data?: { token?: string }`
-   **반환값:** `Promise<CardData[]>`

---

### `cardLogin(data)`

특정 태고 번호를 가진 카드로 로그인합니다.

-   **매개변수:**
    -   `data: { token?: string, taikoNumber: string, cardList?: CardData[] }`
-   **반환값:** `Promise<CardData>`

---

### `getClearData(data?)`

클리어 데이터를 가져옵니다.

-   **매개변수:**
    -   `data?: { token?: string, genre?: keyof typeof Const.genre }`
-   **반환값:** `Promise<ClearData[]>`

---

### `getCompeDetail(data)`

특정 대회의 상세 데이터를 가져옵니다.

-   **매개변수:**
    -   `data: { token?: string, compeId: string }`
-   **반환값:** `Promise<CompeDetail | null>`

---

### `getCompeRanking(data)`

특정 대회의 랭킹 데이터를 가져옵니다.

-   **매개변수:**
    -   `data: { token?: string, compeId: string }`
-   **반환값:** `Promise<RankingData[] | null>`

---

### `getCompeData(data)`

특정 대회의 상세 데이터와 랭킹 데이터를 모두 가져옵니다.

-   **매개변수:**
    -   `data: { token?: string, compeId: string }`
-   **반환값:** `Promise<CompeData | null>`

---

### `getCurrentLogin(data?)`

현재 로그인 되어있는 카드의 데이터를 가져옵니다.

-   **매개변수:**
    -   `data?: { token?: string }`
-   **반환값:** `Promise<CardData | null>`

---

### `getDaniData(data?)`

단위도장 플레이 데이터를 가져옵니다.

-   **매개변수:**
    -   `data?: { token?: string, daniNo?: number }`
-   **반환값:** `Promise<DaniData[] | DaniData | null>`

---

### `getScoreData(data)`

곡의 점수 데이터를 가져옵니다.

-   **매개변수:**
    -   `data: { token?: string, songNo: string, difficulty?: Difficulty }`
-   **반환값:** `Promise<ScoreData | null>`

---

### `updateScore(data)`

곡 점수 데이터를 새로고침합니다.

-   **매개변수:**
    -   `data: { token?: string }`
-   **반환값:** `Promise<void>`

---

### `changeName(data)`

닉네임을 변경합니다.

-   **매개변수:**
    -   `data: { token?: string, ticket: string, newName: string }`
-   **반환값:** `Promise<void>`

---

### `getTicket(data?)`

닉네임 변경을 위한 티켓 값을 가져옵니다.

-   **매개변수:**
    -   `data?: { token?: string }`
-   **반환값:** `Promise<string | null>`
