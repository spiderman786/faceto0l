import 'dotenv/config'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import './db.js'
import { authRouter } from './routes/auth.js'

const app = express()
const port = Number(process.env.PORT || 8787)
const origin = process.env.APP_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin,
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'faceto0l',
    foundation: 'D',
    time: new Date().toISOString(),
  })
})

app.use('/api/auth', authRouter)

app.listen(port, () => {
  console.log(`[faceto0l] API listening on http://127.0.0.1:${port}`)
})
