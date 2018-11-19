const querystring = require('querystring');
const https = require('follow-redirects').https;
const HTMLParser = require('node-html-parser');

const tToken = 'YOUR_TELEGRAM_BOT_TOKEN';
const chatId = 351343711;
const COOKIE = 'yandexuid=11111111; _ym_uid=3333333333; .......';
let offsetMessage = 0;
let requestCount = 1;

init();

function init() {
  getMessage({
    timeout: 0,
    allowed_updates: 'message'
  }, (result) => {
    if (result.result.length) {
      offsetMessage = result.result[result.result.length - 1].update_id + 1;
    }
    checkStation();
  });
  // sendMessage();
}

/**
 * Проверка доступности станции
 */
function checkStation() {
  const options = {
    // "method": "GET",
    hostname: 'music.yandex.ru',
    path: '/station',
    headers: {
      Cookie: COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
      DNT: 1,
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': 1,
      'Accept-Language': 'ru-RU,ru;q=0.9,en-GB;q=0.8,en;q=0.7,en-US;q=0.6',
      // 'Accept-Encoding': 'gzip, deflate, br'
    }
  };

  https.get(options, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    resp.on('end', (res) => {
      let date = new Date();
      console.log(`Запрос №${requestCount} ${date.getHours()}:${date.getMinutes()}`);
      requestCount++;
      // let data = data.toString();
      let isHasStation = !data.includes('К сожалению');
      let isManyRequests = data.includes('продолжить поиск, пожалуйста, введите символы');

      let root = HTMLParser.parse(data);

      if (isHasStation && !isManyRequests && data.length !== 0) { // Нет станций
        console.log('Есть станция');
        sendMessage('Станция доступна https://music.yandex.ru/station'); // Преывшение запросов
      } else if (isManyRequests && data.length !== 0) {
        console.log('Превышены запросы');
        // let cKey = ‌‌root.querySelector('.form__key').rawAttributes.value;
        // let cRetpath = ‌‌root.querySelector('.form__retpath').rawAttributes.value;
        sendPhoto(root.querySelector('.image.form__captcha').rawAttributes.src);
        getMessage({
          offset: offsetMessage,
          timeout: 10,
          allowed_updates: 'message'
        }, callback);

        function callback(result) {
          if (result.result.length) {
            offsetMessage = result.result[result.result.length - 1].update_id + 1;
            // sendCapcha(result.result[result.result.length - 1].message.text, cKey, cRetpath);
            sendCapcha(
              result.result[result.result.length - 1].message.text,
              root.querySelector('.form__retpath').rawAttributes.value,
              root.querySelector('.form__retpath').rawAttributes.value
            );
          } else {
            getMessage({
              offset: offsetMessage,
              timeout: 10,
              allowed_updates: 'message'
            }, callback)
          }
        }
      } else if (!isHasStation && data.length !== 0) {
        console.log('Станций нет');
        setTimeout(checkStation, 10 * 60 * 1000);
      } else {
        console.log('почему то выполнился 2ой раз');
      }
    });
  }).on("error", (err) => {
    console.log("Error: " + err.message);
    console.log('Ошибка запраса в яндекс');
  });
}

function sendCapcha(rep, key, retpath) {

  const query = querystring.stringify({
    key: key,
    rep: rep,
    retpath: retpath
  });
  const options = {
    method: 'GET',
    // method: 'POST',
    hostname: 'yandex.ru',
    // hostname: 'music.yandex.ru',
    path: `/checkcaptcha?${query}`,
    headers: {
      Cookie: COOKIE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36'
    }
  };

  // https.get(`https://music.yandex.ru/checkcaptcha?${query}`, (resp) => {
  // https.get(options, (resp) => {
  //   let data = '';
  //
  //   // A chunk of data has been recieved.
  //   resp.on('data', (chunk) => {
  //     data += chunk;
  //   });
  //
  //   // The whole response has been received. Print out the result.
  //   resp.on('end', () => {
  //     // console.log(JSON.parse(data));
  //     // console.log(data);
  //     console.log('Капча отправлена');
  //     checkStation();
  //   });
  // }).on("error", (err) => {
  //   console.log("Error: " + err.message);
  //   console.log('Ошибка отправки капчи');
  // });

  const req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    let chunks = [];

    res.on('data', (d) => {
      chunks.push(chunk);
      // process.stdout.write(d);
    });

    res.on('end', function () {
      let body = Buffer.concat(chunks);
      console.log(body.toString());
      // console.log('');
    });
  });
  req.on('error', (e) => {
    console.error(e);
  });
  req.end();
}

/**
 * Отправка сообщения в telegram
 */
function sendMessage(message) {
  console.log('Отправка сообщения...');
  const params = querystring.stringify({
    chat_id: chatId,
    text: message
  });

  https.get({
    path: `https://api.telegram.org/bot${tToken}/sendMessage?${params}`,
    host: "proxy.antizapret.prostovpn.org",
    port: 3143
  }, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      // console.log(JSON.parse(data));
      // console.log(data);
      console.log('Сообщение отправлено');
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
    console.log('Ошибка отправки');
  });
}

/**
 * Отправка фото в telegram
 */
function sendPhoto(message) {
  console.log('Отправка сообщения...');
  const params = querystring.stringify({
    chat_id: chatId,
    photo: message,
    caption: 'Пожалуйста, отправте символы с картинки'
  });

  https.get({
    path: `https://api.telegram.org/bot${tToken}/sendPhoto?${params}`,
    host: "proxy.antizapret.prostovpn.org",
    port: 3143
  }, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      // console.log(JSON.parse(data));
      // console.log(data);
      console.log('Сообщение с капчей отправлено');
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
    console.log('Ошибка отправки');
  });
}

function getMessage(params = {}, callback) {
  // params = querystring.stringify({
  //   offset: offsetMessage,
  //   timeout: 10,
  //   allowed_updates: 'message'
  // });
  params = querystring.stringify(params);
  https.get({
    path: `https://api.telegram.org/bot${tToken}/getUpdates?${params}`,
    host: "proxy.antizapret.prostovpn.org",
    port: 3143
  }, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {

      if (callback) {
        callback(JSON.parse(data))
      }
    });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
    console.log('Ошибка отправки');
  });
}