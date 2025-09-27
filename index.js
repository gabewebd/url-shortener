require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const url = require('url');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// URL Shortener functionality
let urlDatabase = [];
let urlCounter = 1;

// Helper function to validate URL
function isValidUrl(string) {
  try {
    const parsedUrl = new URL(string);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

// Helper function to validate URL using DNS lookup
function validateUrlWithDns(inputUrl, callback) {
  try {
    const parsedUrl = new URL(inputUrl);
    dns.lookup(parsedUrl.hostname, (err) => {
      if (err) {
        callback(false);
      } else {
        callback(true);
      }
    });
  } catch (err) {
    callback(false);
  }
}

// POST endpoint for shortening URLs
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }
  
  // Check if URL is valid format
  if (!isValidUrl(originalUrl)) {
    return res.json({ error: 'invalid url' });
  }
  
  // Validate URL using DNS lookup
  validateUrlWithDns(originalUrl, (isValid) => {
    if (!isValid) {
      return res.json({ error: 'invalid url' });
    }
    
    // Check if URL already exists in database
    const existingUrl = urlDatabase.find(entry => entry.original_url === originalUrl);
    
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url
      });
    }
    
    // Create new short URL
    const newUrl = {
      original_url: originalUrl,
      short_url: urlCounter
    };
    
    urlDatabase.push(newUrl);
    
    res.json({
      original_url: originalUrl,
      short_url: urlCounter
    });
    
    urlCounter++;
  });
});

// GET endpoint for redirecting short URLs
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = parseInt(req.params.short_url);
  
  if (isNaN(shortUrl)) {
    return res.json({ error: 'wrong format' });
  }
  
  const urlEntry = urlDatabase.find(entry => entry.short_url === shortUrl);
  
  if (!urlEntry) {
    return res.json({ error: 'no short url found...' });
  }
  
  res.redirect(urlEntry.original_url);
});

// Additional endpoint to see all shortened URLs (for testing)
app.get('/api/shorturl', (req, res) => {
  res.json(urlDatabase);
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});