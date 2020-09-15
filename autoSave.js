const axios = require('axios')
const fs = require('fs')


const apiKey = process.env.CONVERGENCE_API_KEY;
const config = {
    headers: {
        "Authorization": `UserApiKey ${apiKey}`
    }
}

async function autoSave(projectId) {
    const res = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${projectId}`, config)
    saveRec(res.data.body.data.tree, projectId, "root")
}

async function saveRec(dataTree, projectId, dir){
    const files = dataTree.nodes[dir].children;
    files.map(async (file)=>{
        const fileRes = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${file}`, config)
        const filename = dataTree.nodes[file].name
        // console.log(file)
        // If data has content, it's a file so save it, else call saveRec recursively
        // TODO: verify recursive working, currently works for all files in root directory
        if(fileRes.data.body.data.content)
            fs.writeFile(`${process.env.USER_DATA_BASE_PATH}/${projectId}/${filename}`, fileRes.data.body.data.content+"\n", (err, data)=>{
                if(err)
                    console.log(err)
            })
        else
            saveRec(dataTree, projectId, filename)
    })
}

module.exports = autoSave