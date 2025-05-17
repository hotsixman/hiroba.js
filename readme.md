# hiroba.js

hiroba.js is scraping library for javascript which scrapes [donderhiroba](https://donderhiroba.jp)

## How it Works

![](/docs/img/how%20it%20works.svg)

## Install

`npm install hiroba-js`

### CommonJs
```js
const {default:hiroba} = require('hiroba-js');
```

### EsModule
```js
import hiroba from 'hiroba-js';
```

This library depends on only `axios` and `cheerio`, but maybe you can't use this library on browser due to `CORS`.

## API
- [getSessionToken](/docs/api/getSessionToken.md)
- [getCardList](/docs/api/getCardList.md)
- [cardLogin](/docs/api/cardLogin.cardLogin.md)
- [getCurrentLogin](/docs/api/getCurrentLogin.md)
- [getClearData](/docs/api/getClearData.md)
- [getScoreData](/docs/api/getScoreData.md)
- [getDaniData](/docs/api/getDaniData.md)
- [updateScore](/docs/api/updateScore.updateScore.md)