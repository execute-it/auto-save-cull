const axios = require('axios')
const fs = require('fs')

class autoSaver {
    constructor() {
        this.token = null
        this.config = {}
    }

    generateToken = async () => {
        const data = {
            username: process.env.CONVERGENCE_USERNAME,
            password: process.env.CONVERGENCE_PASSWORD
        }
        try {
            const res = await axios.post(`${process.env.OT_SERVER_URL}/rest/auth/login`, data)
            this.token = res.data.body.token
            this.config = {
                headers: {
                    "Authorization": `SessionToken ${this.token}`
                }
            }
            console.log(this.config)
        }catch (e) {
            console.error(`AutoSave Error : Convergence login error`)
        }
    }

    save = async (projectId) => {
        let res;
        try {
            res = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${projectId}`, this.config)
        } catch (e) {
            if(e.response && (e.response.status === 401 || e.response.status === 403)){
                await this.generateToken()
                try{
                    res = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${projectId}`, this.config)
                } catch (e) {
                    console.error(`AutoSave Error : Convergence generated token not accepted for roomID ${projectId}`)
                    return;
                }
            } else {
                console.error(`AutoSave Error : Convergence API error occurred for roomID ${projectId}`)
                return
            }
        }
        if (!fs.existsSync(`${process.env.USER_DATA_BASE_PATH}/${projectId}`))
            fs.mkdirSync(`${process.env.USER_DATA_BASE_PATH}/${projectId}`)
        this.saveRec(res.data.body.data["tree"], projectId, "root").then()
    }

    saveRec = async (dataTree, projectId, dir) => {
        const files = dataTree.nodes[dir].children;
        files.map(async (file) => {
            let fileRes;
            try {
                fileRes = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${file}`, this.config)
            } catch (e) {
                if(e.response && (e.response.status === 401 || e.response.status === 403)){
                    await this.generateToken()
                    try{
                        fileRes = await axios.get(`${process.env.OT_SERVER_URL}/rest/domains/convergence/default/models/${file}`, this.config)
                    } catch (e) {
                        console.error(`AutoSave Error : Convergence generated token not accepted for roomID ${projectId}`)
                        return;
                    }
                } else {
                    console.error(`AutoSave Error : Convergence API error occurred for roomID ${projectId}`)
                }
            }
            const filename = dataTree.nodes[file].name
            console.log(`AutoSave : Saved file ${projectId}/${filename}`)
            // If data has children, it's a folder so call saveRec recursively else save file
            // TODO: verify recursive working, currently works for all files in root directory
            if (fileRes.data.body.data.children) {
                this.saveRec(dataTree, projectId, filename).then()
            } else {
                fs.writeFile(`${process.env.USER_DATA_BASE_PATH}/${projectId}/${filename}`, fileRes.data.body.data.content + "\n", (err) => {
                    if (err)
                        console.log(err)
                })
            }
        })
    }
}

module.exports = autoSaver