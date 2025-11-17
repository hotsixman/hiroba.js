# hiroba-js

> [!NOTE]
> This document was written by Gemini and may contain errors.

`hiroba-js` is a TypeScript library for scraping data from the website `donderhiroba.jp`. It aims to provide programmatic access to player data by making HTTP requests and parsing the resulting HTML.

- [한국어 문서](./docs/ko.md)

## Installation

```bash
npm install hiroba-js
```

# `DonderHiroba` Class

The `DonderHiroba` class is the core of the library, managing interactions with `donderhiroba.jp`. An instance of this class represents a logged-in user's session and provides various methods for fetching and managing their data.

## `DonderHiroba` Instance

A `DonderHiroba` instance holds the state of a logged-in user, including their session token and cached data. It provides methods to interact with the website on behalf of the user.

### Properties

- **`token?: string`**: The session token for the logged-in user. This token is required to make authenticated requests to the website.

- **`namcoLogined: boolean`**: A boolean value that indicates whether the user is logged into their Namco ID. This is set to `true` after a successful login.

- **`cardLogined: boolean`**: A boolean value that indicates whether the user is logged into a specific Taiko card. This is set to `true` after a successful card login.

- **`currentLogin: (CardData & {summary?: Summary}) | null`**: An object containing the data of the currently logged-in card. It is `null` if no card is logged in.

- **`cardList: CardData[]`**: An array of `CardData` objects, representing the user's Taiko cards.

- **`clearData: Map<string, ClearData>`**: A `Map` object that stores the clear data for each song. The key is the song number (`string`), and the value is a `ClearData` object.

- **`scoreData: Map<string, ScoreData>`**: A `Map` object that stores the score data for each song. The key is the song number (`string`), and the value is a `ScoreData` object.

- **`ticket: string | null`**: A string value that is required for certain actions, such as changing the nickname. It is `null` if no ticket has been fetched.

### Methods

- **`constructor(token?: string)`**: Creates a new `DonderHiroba` instance.
  - **`token`** (`string`, optional): A session token can be provided to initialize the instance with a specific login session.

- **`checkNamcoLogined(): Promise<boolean>`**: Checks if the user is logged into their Namco ID. This will log the user out of their card.
  - **Returns**: A `Promise` that resolves with `true` if the user is logged in, and `false` otherwise.

- **`checkCardLogined(): Promise<boolean>`**: Checks if the user is logged into a specific Taiko card. This may log the user out of their Namco ID.
  - **Returns**: A `Promise` that resolves with `true` if the user is logged in, and `false` otherwise.

- **`reloadCardList(): Promise<void>`**: Reloads the list of the user's Taiko cards.

- **`cardLogin(taikoNumber: string): Promise<void>`**: Logs into a specific Taiko card.
  - **`taikoNumber`** (`string`): The Taiko number of the card to log in with.

- **`updateClearData(genre?: keyof typeof Const.genre): Promise<Record<string, ClearData>>`**: Updates the clear data for a specific genre and returns the updated data.
  - **`genre`** (`keyof typeof Const.genre`, optional): The genre to update the clear data for. If not provided, all genres will be updated.
  - **Returns**: A `Promise` that resolves with a `Record` object containing the updated clear data, with the song number as the key.

- **`updateScoreData(songNo: string, difficulty?: Difficulty): Promise<ScoreData | null>`**: Updates the score data for a specific song and difficulty and returns the updated data.
  - **`songNo`** (`string`): The song number to update the score data for.
  - **`difficulty`** (`Difficulty`, optional): The difficulty to update the score data for. If not provided, all difficulties will be updated.
  - **Returns**: A `Promise` that resolves with the updated `ScoreData` object, or `null` if the song was not found.

- **`updateRecord(): Promise<void>`**: Refreshes the song score data.

- **`changeName(newName: string): Promise<CardData | null>`**: Changes the user's nickname.
  - **`newName`** (`string`): The new nickname.
  - **Returns**: A `Promise` that resolves with the updated `CardData` object, or `null` if the nickname change failed.

- **`getTicket(): Promise<string | null>`**: Fetches a ticket value required for certain actions.
  - **Returns**: A `Promise` that resolves with the ticket value, or `null` if the ticket could not be fetched.

## Static Properties & Methods

The `DonderHiroba` class provides several static namespaces and methods that can be called directly without creating an instance. These static members are primarily used for fetching HTML from specific pages (`request`), parsing that HTML (`parse`), or combining multiple requests and parsing steps to perform a specific function (`func`).

### `DonderHiroba.login(options)`

This static method of the `DonderHiroba` class logs into `donderhiroba.jp` using an email and password, creates a `DonderHiroba` instance, and returns it. If a `taikoNumber` is provided, it will also perform a card login for that Taiko number.

- **Arguments:**
    - `options` (object):
        - `email` (string): The email address registered on `donderhiroba.jp`.
        - `password` (string): The password registered on `donderhiroba.jp`.
        - `taikoNumber` (string, optional): The Taiko number to log in with.
- **Returns:**
    - `Promise<DonderHiroba>`: A `Promise` that resolves with a logged-in instance of the `DonderHiroba` class.

### `DonderHiroba.func`

The `DonderHiroba.func` namespace is an object containing high-level functions that combine functions from `request` and `parse` to perform specific tasks. For example, the `getCardList` function fetches the HTML with `request.cardList` and then parses it with `parse.cardList` to return the final result.

- **Key Methods:**
    - **`getSessionToken(credentials: { email: string, password: string }): Promise<string>`**: Logs in with an email and password to get a session token.
    - **`getCardList(data?: { token?: string }): Promise<CardData[]>`**: Fetches the list of cards registered to the account.
    - **`cardLogin(data: { token?: string, taikoNumber: string, cardList?: CardData[] }): Promise<CardData>`**: Logs in with a specific Taiko number.
    - **`getClearData(data?: { token?: string, genre?: keyof typeof Const.genre }): Promise<ClearData[]>`**: Fetches the clear data.
    - **`getScoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }): Promise<ScoreData | null>`**: Fetches the score data for a song.
    - **`getDaniData(data?: { token?: string, daniNo?: number }): Promise<DaniData | DaniData[] | null>`**: Fetches the Dan-i Dojo play data.
    - **`getCompeDetail(data: { token?: string, compeId: string }): Promise<CompeDetail | null>`**: Fetches the details of a competition.
    - **`getCompeRanking(data: { token?: string, compeId: string }): Promise<RankingData[] | null>`**: Fetches the ranking data for a competition.
    - **`getCompeData(data: { token?: string, compeId: string }): Promise<CompeData | null>`**: Fetches both the details and ranking data for a competition.
    - **`getCurrentLogin(data?: { token?: string }): Promise<(CardData & {summary?: Summary}) | null>`**: Fetches the data of the currently logged-in card.
    - **`updateRecord(data: { token?: string }): Promise<void>`**: Refreshes the song score data.
    - **`changeName(data: { token?: string, ticket: string, newName: string }): Promise<void>`**: Changes the nickname.
    - **`getTicket(data?: { token?: string }): Promise<string | null>`**: Fetches the `ticket` value required for changing the nickname.
    - **`getDaniPass(data: { token?: string, dan?: DaniNo }): Promise<DaniPassData | Record<DaniNo, DaniPassData>>`**: Fetches and parses the Dan-i Pass images.
      - **`data`** (object):
        - **`token`** (`string`, optional): The session token.
        - **`dan`** (`DaniNo`, optional): The specific Dan-i number to fetch. If omitted, all available Dan-i Passes will be fetched. (1 is 5kyu, and 19 is tatsujin)
      - **Returns**: A `Promise` that resolves with `DaniPassData` if a specific `dan` is provided, or a `Record<DaniNo, DaniPassData>` if `dan` is omitted.

### `DonderHiroba.request`

The `DonderHiroba.request` namespace is an object containing functions that send HTTP requests to specific pages on `donderhiroba.jp` and return the resulting HTML string. Most of these functions accept a `token` argument to maintain the login state.

- **Key Methods:**
    - **`cardList(data?: { token?: string }): Promise<string>`**: Fetches the HTML of the card selection page.
    - **`clearData(data?: { token?: string, genre?: keyof typeof Const.genre }): Promise<string | string[]>`**: Fetches the HTML of the clear data page.
    - **`scoreData(data: { token?: string, songNo: string, difficulty?: Difficulty }): Promise<string | string[]>`**: Fetches the HTML of the score data page.
    - **`daniData(data?: { token?: string, daniNo?: number }): Promise<string | string[]>`**: Fetches the HTML of the Dan-i Dojo data page.
    - **`compeDetail(data: { token?: string, compeId: string }): Promise<string>`**: Fetches the HTML of the competition details page.
    - **`compeRanking(data: { token?: string, compeId: string }): Promise<string>`**: Fetches the HTML of the competition ranking page.
    - **`currentLogin(data?: { token?: string }): Promise<string>`**: Fetches the HTML of the main page to get the currently logged-in card information.
    - **`daniPlate(data: { token?: string, dan?: DaniNo }): Promise<Blob | Blob[]>`**: Fetches the Dan-i Pass image(s) as a Blob.
      - **`data`** (object):
        - **`token`** (`string`, optional): The session token.
        - **`dan`** (`DaniNo`, optional): The specific Dan-i number to fetch the image for. If omitted, all available Dan-i Pass images will be fetched.
      - **Returns**: A `Promise` that resolves with a `Blob` if a specific `dan` is provided, or an array of `Blob`s if `dan` is omitted.
    - **`ticket(data?: { token?: string }): Promise<string>`**: Fetches the HTML of the My Page.

### `DonderHiroba.parse`

The `DonderHiroba.parse` namespace is an object containing functions that parse the HTML strings obtained through `DonderHiroba.request` and convert them into meaningful data structures (objects or arrays).

- **Key Methods:**
    - **`cardList(html: string): CardData[]`**: Parses the card list HTML and returns an array of `CardData` objects.
    - **`clearData(html: string | string[]): ClearData[]`**: Parses the clear data HTML and returns an array of `ClearData` objects.
    - **`scoreData(data: { html: string | string[], songNo: string }): ScoreData | null`**: Parses the score data HTML and returns a `ScoreData` object.
    - **`daniData(data: { html: string, daniNo: number } | { html: string, daniNo: number }[]): DaniData | DaniData[] | null`**: Parses the Dan-i Dojo data HTML and returns a `DaniData` object or an array of objects.
    - **`compeDetail(html: string): CompeDetail | null`**: Parses the competition details HTML and returns a `CompeDetail` object.
    - **`compeRanking(html: string): RankingData[] | null`**: Parses the competition ranking HTML and returns an array of `RankingData` objects.
    - **`currentLogin(html: string): (CardData & {summary?: Summary}) | null`**: Parses the main page HTML and returns the currently logged-in `CardData` object.
    - **`daniPass(data: { img: Blob | Blob[] }): Promise<DaniPassData | Record<DaniNo, DaniPassData>>`**: Parses the Dan-i Pass image(s) (Blob) and extracts the pass type and edge type.
      - **`data`** (object):
        - **`img`** (`Blob | Blob[]`): The image data (Blob) or an array of image data (Blobs) to parse.
      - **Returns**: A `Promise` that resolves with `DaniPassData` if a single `Blob` is provided, or a `Record<DaniNo, DaniPassData>` if an array of `Blob`s is provided. `DaniPassData` contains `pass` (gold or red) and `edge` (silver, gold, or donderfull).
    - **`ticket(html: string): string | null`**: Parses the `ticket` value from the My Page HTML.