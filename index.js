const { Octokit } = require("@octokit/rest");
const puppeteer = require('puppeteer');
const cron = require('node-cron');
const express = require('express');

const app = express();
const PORT = 7860;

// Define a route that returns "Hello World"
app.get('/', (req, res) => {
  res.send('Hello World');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

class UrlVisitor {
  constructor() {
    this.urlGroups = [];
    this.browser = null;
    this.stopTimes = [
      null,
      this.parseTimeRange(process.env.TIME2 || '01:00-06:00'),
      this.parseTimeRange(process.env.TIME3 || '01:00-06:00')
    ];
    this.urlInterval = 5000; // 5 second interval between URL visits
    this.groupInterval = 60000; // 1 minute interval between groups
    this.isRunning = false;
    this.owner = process.env.GITHUB_OWNER;
    this.repo = process.env.GITHUB_REPO;
  }

  parseTimeRange(timeStr) {
    const [start, end] = timeStr.split('-');
    return { start, end };
  }

  isInStopTime(groupIndex) {
    if (!this.stopTimes[groupIndex]) return false;
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= this.stopTimes[groupIndex].start && currentTime <= this.stopTimes[groupIndex].end;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.browser = await puppeteer.launch({ headless: true });
    await this.loadUrlsFromGitHub();
    this.visitUrls();
  }

  async stop() {
    this.isRunning = false;
    if (this.browser) {
      await this.browser.close();
    }
  }

  async loadUrlsFromGitHub() {
    const files = ['url1.json', 'url2.json', 'url3.json'];
    this.urlGroups = [];

    for (let file of files) {
      try {
        const response = await octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: file,
        });

        const content = Buffer.from(response.data.content, 'base64').toString();
        const urls = content.split('\n').filter(line => line.trim() !== '');
        if (urls.length > 0) {
          this.urlGroups.push(urls);
        } else {
          console.warn(`No valid URLs found in ${file}.`);
        }
        console.log(`URLs loaded successfully from ${file} in GitHub repository.`);
      } catch (error) {
        console.error(`Error reading ${file} from GitHub:`, error.message);
      }
    }

    if (this.urlGroups.length === 0) {
      console.warn('No valid URLs were loaded from any file in the GitHub repository.');
    }
  }

  async visitUrls() {
    while (this.isRunning) {
      await this.loadUrlsFromGitHub();  // Refresh URLs before each round
      for (let groupIndex = 0; groupIndex < this.urlGroups.length; groupIndex++) {
        if (!this.isInStopTime(groupIndex)) {
          await this.visitUrlGroup(groupIndex);
        }
        // Wait for 1 minute before moving to the next group
        await new Promise(resolve => setTimeout(resolve, this.groupInterval));
      }
    }
  }

  async visitUrlGroup(groupIndex) {
    const urls = this.urlGroups[groupIndex];
    if (!urls || urls.length === 0) return;

    console.log(`Starting to visit URLs in Group ${groupIndex + 1}`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const page = await this.browser.newPage();
        
        await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await page.waitForTimeout(Math.random() * 2000 + 1000); // Random wait between 1-3 seconds on the page

        console.log(`Visited (Group ${groupIndex + 1}): ${url}`);
        
        await page.close();
      } catch (error) {
        console.error(`Error visiting ${url}: ${error.message}`);
      }

      // Wait for 5 seconds before the next URL visit
      await new Promise(resolve => setTimeout(resolve, this.urlInterval));
    }

    console.log(`Completed all URLs in Group ${groupIndex + 1}`);
  }
}

const visitor = new UrlVisitor();

visitor.start().catch(console.error);

cron.schedule('* * * * *', () => {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  console.log(`Current time (Beijing): ${beijingTime.toISOString()}`);
});

console.log('URL visitor started');

process.on('SIGINT', async () => {
  console.log('Stopping URL visitor...');
  await visitor.stop();
  process.exit(0);
});