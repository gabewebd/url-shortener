require('dotenv').config({ path: './sample.env' });
const express = require('express');
const cors = require('cors');
const dns = require('dns'); // dns module for url validation
const app = express();

// basic configuration
const port = process.env.PORT || 3000;

// simple in-memory storage for urls
const urlDatabase = [];
let shortUrlCounter = 1;

app.use(cors());

// middleware to parse post bodies
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello api' });
});

// post /api/shorturl - creates a short url
app.post('/api/shorturl', function(req, res) {
  const originalUrl = req.body.url;

  // basic url format validation
  const urlRegex = /^(https?:\/\/)([\w\d-]+\.)+[\w\d]{2,}(\/[\w\d-._~:/?#\[\]@!$&'()*+,;=]*)?$/i;

  if (!urlRegex.test(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // extract hostname for dns lookup
  let hostname;
  try {
    hostname = new URL(originalUrl).hostname;
  } catch (e) {
    return res.json({ error: 'invalid url' });
  }

  // dns lookup to verify host existence
  dns.lookup(hostname, (err) => {
    if (err) {
      // dns lookup failure means invalid host
      return res.json({ error: 'invalid url' });
    }

    // check if url already exists
    const existingEntry = urlDatabase.find(item => item.original_url === originalUrl);
    if (existingEntry) {
      return res.json(existingEntry);
    }

    // create new entry
    const newEntry = {
      original_url: originalUrl,
      short_url: shortUrlCounter++
    };
    urlDatabase.push(newEntry);

    res.json(newEntry);
  });
});

// get /api/shorturl/:short_url - redirects to original url
app.get('/api/shorturl/:short_url', function(req, res) {
  const shortUrlId = parseInt(req.params.short_url, 10);

  if (isNaN(shortUrlId)) {
    return res.json({ error: 'wrong format' });
  }

  const urlEntry = urlDatabase.find(item => item.short_url === shortUrlId);

  if (urlEntry) {
    // perform the redirect
    res.redirect(urlEntry.original_url);
  } else {
    res.json({ error: 'no short url found for the given input' });
  }
});

// server listener
app.listen(port, function() {
  console.log(`listening on port ${port}`);
});