if(!process.env.PROD)
    require('dotenv').config()

const redisQueue = require("./helpers/redis")
const {sleep} = require('./helpers/utils')

const save = require('./autoSave')
const cull = require('./autoCull')


const saveQueueName = "auto-save-queue"
const cullQueueName = "auto-cull-queue"

async function run(){
    await redisQueue.connect()

    // Autosave
    startAutoSave().then()
    // Auto-cull
    startAutoCull().then()
}

const startAutoSave = async ()=>{
    console.log("Started auto-save")
    while(true){
        const task = JSON.parse(`${await redisQueue.pop(saveQueueName)}`)
        if(!task) {
            await sleep(parseInt(process.env.AUTOSAVE_INTERVAL)*1000)
            continue
        }

        const timeDelta = (new Date() - new Date(task.timestamp))/1000;
        if(parseInt(process.env.AUTOSAVE_INTERVAL) > timeDelta)
            await sleep((parseInt(process.env.AUTOSAVE_INTERVAL) - timeDelta)*1000)

        await save(task.roomId)
        await redisQueue.push(saveQueueName, {roomId: task.roomId, timestamp: new Date().toISOString()})
    }
}

const startAutoCull = async ()=>{
    console.log("Started auto-cull")
    while(true){
        const task = JSON.parse(`${await redisQueue.pop(cullQueueName)}`)
        if(!task) {
            await sleep(parseInt(process.env.AUTOCULL_INTERVAL)*1000)
            continue
        }

        const timeDelta = (new Date() - new Date(task.timestamp))/1000;
        if(parseInt(process.env.AUTOCULL_INTERVAL) > timeDelta)
            await sleep((parseInt(process.env.AUTOCULL_INTERVAL) - timeDelta)*1000)

        await cull(task.roomId)
        await redisQueue.push(cullQueueName, {roomId: task.roomId, timestamp: new Date().toISOString()})
    }
}

run().then();