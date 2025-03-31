const express = require('express');
const puppeteer = require('puppeteer-core'); // note: puppeteer-core here
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// This is the key line for Puppeteer on Heroku:
const chromeExecutablePath = process.env.GOOGLE_CHROME_BIN || '/app/.apt/usr/bin/google-chrome';

app.post('/api/getVanityUrl', async (req, res) => {
    const { linkedinUrl } = req.body;

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: chromeExecutablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setRequestInterception(true);
        page.on('request', req => {
            if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(linkedinUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const finalUrl = page.url();

        await browser.close();

        res.json({ vanityUrl: finalUrl });

    } catch (error) {
        console.error("Error resolving LinkedIn URL:", error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Unable to resolve URL' });
    }
});

app.get('/', (req, res) => res.send('LinkedIn Vanity URL Resolver running.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
});
