if (!process.env.PROD)
    require('dotenv').config()

const Convergence = require("@convergence/convergence");
const WebSocket = require('ws');

const roomId = "316f24a3-4dae-4a56-93a5-de6672d738fd"

const domainUrl = `${process.env.OT_SERVER_URL}/realtime/convergence/default`
const convergenceOptions = {
    webSocket: {class: WebSocket}
}

Convergence.connectAnonymously(domainUrl, JSON.stringify({isBot: true}), convergenceOptions).then(
    async (domain) => {
        console.log(await getParticipantCount(domain, roomId));
    }
);

const getParticipantCount = async (domain, roomId) => {
    const model = await domain.models().open(roomId)
    console.log("isOpen", model.session().isConnected())
    const activity = await domain.activities().join(model.modelId())
    const participants = activity.participants()
    return participants.length
};

module.exports = function () {

}