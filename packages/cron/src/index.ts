import dotenv from 'dotenv'
dotenv.config()

import { startCron } from './cron'

const API_URL          = process.env.ORAKU_API_URL!
const DELIVERY_WEBHOOK = process.env.DELIVERY_WEBHOOK_URL!
const CRON_EXPRESSION  = process.env.CRON_EXPRESSION!

startCron(API_URL, DELIVERY_WEBHOOK, CRON_EXPRESSION)
