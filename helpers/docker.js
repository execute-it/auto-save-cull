const Docker = require('dockerode');
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });

stopAndRemoveContainer = (containerId)=>{
    const container = docker.getContainer(containerId)
    return new Promise(((resolve, reject) => {
        container.stop({}, (err)=>{
            if(err && err.statusCode === 404)
                reject(JSON.stringify({code: 404, error: "Container does not exist"}))
            else if(err)
                reject(JSON.stringify({code: 0, error: "Unknown error"}))
            else {
                container.remove({}, (err)=>{
                    if(err && err.statusCode === 404)
                        reject(JSON.stringify({code: 404, error: "Container does not exist"}))
                    else if(err)
                        reject(JSON.stringify({code: 0, error: "Unknown error"}))
                    else
                        resolve()

                })
            }
        })
    }))
}

module.exports.stopAndRemoveContainer = stopAndRemoveContainer