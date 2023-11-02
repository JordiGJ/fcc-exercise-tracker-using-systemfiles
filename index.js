const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static site
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// exercise tracker app
// fakeid generator before using mongodb
const fakeID = () => {
  let id = '';
  for (let i = 0; i < 23; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
};

// we store users here
let users = [];

// update users.json
function updateUsersFile() {
  fs.writeFile('users.json', JSON.stringify(users), { flag: 'w' }, err => {
    if (err) throw err;
  });
}

async function updateUsersVar() {
  fs.readFile('users.json', 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading the file:', err);
    } else {
      try {
        if (!data) {
          console.log('no data in users.json');
        } else {
          const jsonData = JSON.parse(data);
          users = [];
          users = jsonData;
        }
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
      }
    }
  });
}
updateUsersVar();
// create new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  const _id = fakeID();
  const newUser = {
    username,
    count: 0,
    _id,
    log: [],
  };
  const isUser = users.find(u => u.username === username);
  if (!isUser) {
    res.json({ username, _id });
    users.push(newUser);
    updateUsersFile();
    updateUsersVar();
  } else {
    console.log('existing user');
  }
});

// create new exercise for a specific user
app.post('/api/users/:_id/exercises', (req, res) => {
  const _id = req.params._id;
  const { description, duration } = req.body;
  let { date } = req.body;
  if (!date) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }
  const user = users.find(u => u._id === _id);
  const obj = {
    _id,
    description,
    duration: +duration,
    date,
    username: user.username,
  };
  res.json(obj);
  const newExercise = {
    description,
    duration: +duration,
    date,
  };
  user.log.push(newExercise);
  user.count++;
  const allButUser = users.filter(u => u._id !== _id);
  users = [...allButUser, user];
  updateUsersFile();
  updateUsersVar();
});

// see user info
app.get('/api/users/:_id/logs?', (req, res) => {
  const reqQuery = req._parsedOriginalUrl.query;
  const logs = req.params.log || '';
  const _id = req.params._id;
  if (reqQuery) {
    if (reqQuery.includes('&')) {
      const sRQ = reqQuery.split('&');
      const from = new Date(sRQ[0].slice(5));
      const to = new Date(sRQ[1].slice(3));
      const user = users.find(u => u._id === _id);
      const timeRange = user.log.filter(
        e => new Date(e.date) >= from && new Date(e.date) <= to
      );
      res.json({ ...user, log: timeRange });
      return;
    } else {
      const limit = +reqQuery.slice(6);
      const user = users.find(u => u._id === _id);
      const limitedLog = user.log.filter((e, i) => i <= limit - 1);
      res.json({ ...user, log: limitedLog });
      return;
    }
  }
  const user = users.find(u => u._id === _id);
  res.json(user);
});

// see all users
app.get('/api/users', (req, res) => {
  res.send(users.map(user => ({ username: user.username, _id: user._id })));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
