require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
require('dotenv').config({ path: './sample.env' }); 
const mongoose = require('mongoose'); // 1. Import Mongoose

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// 2. MongoDB Connection Setup
mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// 3. Mongoose Schema and Model
const urlSchema = new mongoose.Schema({
    original_url: { type: String, required: true, unique: true },
    short_url: { type: Number, required: true, unique: true }
});

// Mongoose will create a 'shorturls' collection
const ShortUrl = mongoose.model('ShortUrl', urlSchema);


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// first API endpoint
app.get('/api/hello', function(req, res) {
    res.json({ greeting: 'hello API' });
});


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

// 4. POST endpoint for shortening URLs (Updated for MongoDB)
app.post('/api/shorturl', (req, res) => {
    const originalUrl = req.body.url;
    
    if (!originalUrl) {
        return res.json({ error: 'invalid url' });
    }

    // Check if URL is valid format (remains the same)
    if (!isValidUrl(originalUrl)) {
        return res.json({ error: 'invalid url' });
    }
    
    // Validate URL using DNS lookup (remains the same)
    validateUrlWithDns(originalUrl, async (isValid) => {
        if (!isValid) {
            return res.json({ error: 'invalid url' });
        }
        
        try {
            // Check if URL already exists in database
            let existingUrl = await ShortUrl.findOne({ original_url: originalUrl });
            
            if (existingUrl) {
                return res.json({
                    original_url: existingUrl.original_url,
                    short_url: existingUrl.short_url
                });
            }
            
            // Find the current highest short_url number
            const lastEntry = await ShortUrl
                .findOne({})
                .sort({ short_url: 'desc' })
                .exec();
            
            // Calculate the new short_url number
            const newShortUrl = lastEntry ? lastEntry.short_url + 1 : 1;

            // Create and save new short URL
            const newUrl = new ShortUrl({
                original_url: originalUrl,
                short_url: newShortUrl
            });
            
            const savedUrl = await newUrl.save();
            
            res.json({
                original_url: savedUrl.original_url,
                short_url: savedUrl.short_url
            });
            
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Database error while shortening URL' });
        }
    });
});

// 5. GET endpoint for redirecting short URLs 
app.get('/api/shorturl/:short_url', async (req, res) => {

    const shortUrl = req.params.short_url; 
    
    try {
        const shortUrlNum = parseInt(shortUrl);

        if (isNaN(shortUrlNum)) {
            // If the format isn't a number, immediately exit
            return res.json({ error: 'wrong format' });
        }

        // Find the URL entry by the short_url number
        const urlEntry = await ShortUrl.findOne({ short_url: shortUrlNum }); 
        
        if (!urlEntry) {
            return res.json({ error: 'no short url found...' });
        }
        
        res.redirect(urlEntry.original_url);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error during redirection' });
    }
});

// 6. Additional endpoint to see all shortened URLs (for testing)
app.get('/api/shorturl', async (req, res) => {
    try {
        const allUrls = await ShortUrl.find({}, 'original_url short_url -_id'); // Select only needed fields
        res.json(allUrls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error fetching all URLs' });
    }
});

app.listen(port, function() {
    console.log(`Listening on port ${port}`);
});