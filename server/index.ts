import { createApp } from './api';
import { db } from './db';

const port = Number(process.env.PORT ?? 8787);
const app = createApp(db, { secureCookies: process.env.NODE_ENV === 'production' });

app.listen(port, () => {
  console.log(`CV Builder API listening on http://localhost:${port} (SQLite: server/data/portfolio.db)`);
});
