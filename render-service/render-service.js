const express = require('express');
const puppeteer = require('puppeteer-core');

const app = express();

app.use(express.json({
    limit: '5mb'
}));

// ========================
// 配置参数（可调）
// ========================

const CONFIG = {

    PAGE_POOL_SIZE: 10,

    RENDER_TIMEOUT: 10000,

    WIDTH: 800,
    HEIGHT: 600

};

// ========================
// 浏览器 + Page池
// ========================

let browser;

let pagePool = [];

async function initBrowser() {

    browser = await puppeteer.launch({

        headless: "new",

        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',

        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]

    });

    for (let i = 0; i < CONFIG.PAGE_POOL_SIZE; i++) {

        const page = await browser.newPage();

        await page.setViewport({
            width: CONFIG.WIDTH,
            height: CONFIG.HEIGHT
        });

        pagePool.push(page);

    }

}

// ========================
// 获取 Page（核心）
// ========================

async function getPage() {

    while (pagePool.length === 0) {

        await new Promise(r => setTimeout(r, 50));

    }

    return pagePool.pop();

}

function releasePage(page) {

    pagePool.push(page);

}

// ========================
// HTML 模板
// ========================
const fs = require('fs');
const echartsCode = fs.readFileSync(`${__dirname}/echarts.min.js`, 'utf-8');


function buildHtml(option, width, height) {
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<script>${echartsCode}</script>
</head>
<body>
<div id="chart" style="width:${width}px;height:${height}px;"></div>
<script>
const chart = echarts.init(document.getElementById('chart'));
chart.setOption(Object.assign({ animation: false }, ${JSON.stringify(option)}));
window.chartRendered = true;
</script>
</body>
</html>
`;
}

// ========================
// 渲染接口
// ========================

app.post('/render', async (req, res) => {

    let page;

    try {

        const {

            option,

            width = CONFIG.WIDTH,

            height = CONFIG.HEIGHT

        } = req.body;

        if (!option) {

            return res.status(400).json({
                error: "option required"
            });

        }

        page = await getPage();

        const html = buildHtml(
            option,
            width,
            height
        );

        await page.setContent(html, {

            waitUntil: 'domcontentloaded',

            timeout: CONFIG.RENDER_TIMEOUT

        });

        await page.waitForFunction(

            'window.chartRendered === true',

            { timeout: 5000 }

        );

        const base64 = await page.screenshot({

            type: 'png',

            encoding: 'base64'

        });

        res.json({

            success: true,

            data: base64

        });

    }
    catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            error: err.message

        });

    }
    finally {

        if (page) {

            releasePage(page);

        }

    }

});

// ========================
// 健康检查
// ========================

app.get('/health', (req, res) => {

    res.json({
        status: "ok"
    });

});

// ========================
// 启动
// ========================

const PORT = 3000;

app.listen(PORT, async () => {

    await initBrowser();

    console.log(
        `Render service running at ${PORT}`
    );

});

// ========================
// 优雅退出
// ========================

process.on('SIGINT', async () => {

    if (browser) {

        await browser.close();

    }

    process.exit();

});