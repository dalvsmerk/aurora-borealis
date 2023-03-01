const fs = require('fs').promises;
const Koa = require('koa');
const Router = require('koa-router');
const { configure } = require('./config');

const config = configure();
const app = new Koa();
const router = new Router();

router.get('/healthcheck', (ctx) => {
    ctx.status = 200;
});

router.get('/cron-logs', async (ctx) => {
    try {
        const logs = await fs.readFile('/var/log/cron.log', { 
            encoding: 'utf8', 
            flag: 'r',
        });
        
        ctx.status = 200;
        ctx.body = logs;
    } catch (error) {
        ctx.throw(500, 'Failed to read logs', error);
    } 
});

app.use(router.routes());

app.listen(config.port, () => {
    console.log(`Server started at ${config.port}`);
});
