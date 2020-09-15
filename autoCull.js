if (!process.env.PROD)
    require('dotenv').config()

const Convergence = require("@convergence/convergence");
const WebSocket = require('ws');

const {stopAndRemoveContainer} = require("./helpers/docker")

const domainUrl = `${process.env.OT_SERVER_URL}/realtime/convergence/default`
const convergenceOptions = {
    webSocket: {class: WebSocket}
}

class AutoCull {
    constructor() {
        this.convergenceDomain = null;
    }

    connect = async () => {
        this.convergenceDomain = await Convergence.connectAnonymously(domainUrl, JSON.stringify({isBot: true}), convergenceOptions)
    }

    checkAndCull = async (roomId, shouldCull)=>{
        const participantsCount = await getParticipantCount(this.convergenceDomain, roomId) - 1;
        if(shouldCull && participantsCount > 0){
            // Cancel culling and return
            shouldCull=false
            return {shouldCull, isRunning: true};
        }
        if(shouldCull) {
            // Cull
            try{
                await stopAndRemoveContainer(roomId)
            } catch (e) {
                if(JSON.parse(e).code === 404)
                    console.log("Container does not exist, assuming it has crashed")
                else
                    console.error(e)
            }
            return {shouldCull, isRunning: false};
        }
        if (participantsCount===0) {
            // Cull in next iteration
            shouldCull = true
            return {shouldCull, isRunning: true};
        }
    }
}

const getParticipantCount = async (domain, roomId) => {
    const model = await domain.models().open(roomId)
    const activity = await domain.activities().join(model.modelId())
    const participants = activity.participants()
    return participants.length
};

module.exports = AutoCull