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
        this.saveRec(res.data.body.data["tree"], projectId, `${process.env.USER_DATA_BASE_PATH}/${projectId}`, "root").then()
    }

    saveRec = async (dataTree, projectId, basePath, dir) => {
        const files = dataTree.nodes[dir].children;

        // Create directory if it does not exist
        if (!fs.existsSync(basePath))
            fs.mkdirSync(basePath)

        files.map(async (file) => {
            // If node-data has children, it's a directory so call saveRec recursively else save file
            if (dataTree.nodes[file].children) {
                this.saveRec(dataTree, projectId, `${basePath}/${dataTree.nodes[file].name}`, file).then()
            } else {
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
                fs.writeFile(`${basePath}/${filename}`, fileRes.data.body.data.content + "\n", (err) => {
                    if (err)
                        console.log(err)
                    else
                        console.log(`AutoSave : Saved file ${basePath.split(process.env.USER_DATA_BASE_PATH)[1].substr(1)}/${filename}`)
                })
            }
        })
    }
}

module.exports = autoSaver