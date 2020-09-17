if(!process.env.PROD)
    require('dotenv').config()

const redisQueue = require("./helpers/redisQueue")
const {sleep} = require('./helpers/utils')

const AutoSaver = require('./autoSave')
const AutoCull = require('./autoCull')


const saveQueueName = "auto-save-queue"
const cullQueueName = "auto-cull-queue"

async function run(){
    console.log("Connecting to redis...")
    await redisQueue.connect()
    console.log("Done")

    // Autosave
    if(!process.env.AUTO_SAVE_OFF)
        startAutoSave().then()
    // Auto-cull
    if(!process.env.AUTO_CULL_OFF)
        startAutoCull().then()
}

const startAutoSave = async ()=>{
    console.log("Started auto-save")
    const autoSaver = new AutoSaver()
    await autoSaver.generateToken()

    while(true){
        const task = JSON.parse(`${await redisQueue.pop(saveQueueName)}`)
        if(!task) {
            await sleep(parseInt(process.env.AUTOSAVE_INTERVAL)*1000)
            continue
        }

        const timeDelta = (new Date() - new Date(task.timestamp))/1000;
        if(parseInt(process.env.AUTOSAVE_INTERVAL) > timeDelta)
            await sleep((parseInt(process.env.AUTOSAVE_INTERVAL) - timeDelta)*1000)

        await autoSaver.save(task.roomId)
        if(await redisQueue.exists(cullQueueName, task.roomId))
            await redisQueue.push(saveQueueName, {
                roomId: task.roomId,
                timestamp: new Date().toISOString()
            })
    }
}

const startAutoCull = async ()=>{
    console.log("Starting auto-cull")
    const autoCull = new AutoCull()
    await autoCull.connect()

    while(true){
        const task = JSON.parse(`${await redisQueue.pop(cullQueueName)}`)
        if(!task) {
            await sleep(parseInt(process.env.AUTOCULL_INTERVAL)*1000)
            continue
        }

        const timeDelta = (new Date() - new Date(task.timestamp))/1000;
        if(parseInt(process.env.AUTOCULL_INTERVAL) > timeDelta)
            await sleep((parseInt(process.env.AUTOCULL_INTERVAL) - timeDelta)*1000)

        const {shouldCull, isRunning} = await autoCull.checkAndCull(task.roomId, task.shouldCull)
        if(isRunning)
            await redisQueue.push(cullQueueName, {
                roomId: task.roomId,
                shouldCull,
                timestamp: new Date().toISOString()
            })
    }
}

run().then();