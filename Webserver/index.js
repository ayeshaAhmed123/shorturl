const express = require('express');
const cors=require('cors');
const app = express();
const PORT = process.env.PORT || 3001;
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://i202424:i202424@task5.njfplee.mongodb.net/?retryWrites=true&w=majority&appName=Task5';

app.use(express.json());
app.use(cors())
async function connectToDatabase() {
    try {
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        return client.db('urls');
    } catch (err) {
        console.error('Error connecting to MongoDB Atlas', err);
        throw err;
    }
}

async function generateShortUrl(db, longUrl) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const urls = db.collection('urls');
    let shortUrl;
    while (!shortUrl) {
        const candidateShortUrl = result;
        const existingUrl = await urls.findOne({ shortUrl: candidateShortUrl });
        if (!existingUrl) {
            shortUrl = candidateShortUrl;
        }
    }
    await urls.insertOne({ longUrl, shortUrl });
    return shortUrl;
}

app.post('/shorten', async (req, res) => {
    const longUrl = req.body.longUrl;

    try {
        const db = await connectToDatabase();

        // Check if URL already exists in database
        const existingUrl = await db.collection('urls').findOne({ longUrl });
        if (existingUrl) {
            res.json({ shortUrl: existingUrl.shortUrl });
        } else {
            // Generate a unique short URL and insert into the database
            const shortUrl = await generateShortUrl(db, longUrl);
            res.json({ shortUrl });
        }
    } catch (err) {
        console.error('Error processing URL shortening:', err);
        res.status(500).json({ error: 'An error occurred while processing the request.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl;

    try {
        const db = await connectToDatabase();

        // Find the original URL associated with the short URL
        const urlEntry = await db.collection('urls').findOne({ shortUrl });
        if (urlEntry) {
            res.redirect(urlEntry.longUrl);
        } else {
            res.status(404).send('URL not found');
        }
    } catch (err) {
        console.error('Error fetching original URL:', err);
        res.status(500).send('An error occurred while fetching the original URL.');
    }
});
