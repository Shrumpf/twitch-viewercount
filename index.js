/* eslint-disable linebreak-style */
/* eslint-disable no-console */
const { https } = require('follow-redirects');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.disable('view cache');
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('views', './views');
app.set('view engine', 'ejs');
dotenv.config();
const port = process.env.PORT || 3000;
let AUTH_TOKEN;

function getOauthToken() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      hostname: 'id.twitch.tv',
      path: '/oauth2/token',
      headers: {
        'Content-Type': 'application/json',
      },
      maxRedirects: 20,
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve(JSON.parse(body.toString()).access_token);
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    const postData = JSON.stringify({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'client_credentials',
    });

    req.write(postData);

    req.end();
  });
}

async function getViewer() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'api.twitch.tv',
      path: `/helix/streams?user_login=${process.env.USER}`,
      headers: {
        'client-id': process.env.CLIENT_ID,
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      maxRedirects: 20,
    };

    const req = https.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', async () => {
        const body = Buffer.concat(chunks);
        const data = JSON.parse(body.toString());
        if (data.status === 401) {
          AUTH_TOKEN = await getOauthToken();
        } else {
          resolve(JSON.parse(body.toString()));
        }
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    req.end();
  });
}

app.get('/', async (req, res) => {
  res.render('index', { viewer: undefined });
});

app.get('/viewer', async (req, res) => {
  const some = await getViewer();
  res.json(some);
});

// app.post('/twitch', (req, res) => {
//   console.log(req.body);
//   console.log(req);
//   res.sendStatus(200);
// });

// app.get('/twitch', (req, res) => {
//   console.log(req.query);
//   console.log(req);
//   console.log(req.body);
//   res.set('content-type', 'text/plain');
//   res.status(200).send(req.query['hub.challenge']);
// });

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
