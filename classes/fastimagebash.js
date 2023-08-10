const { exec } = require('child_process');
const util = require('util');

const FastImageFile = require('./fastimagefile')

class FastImageBash extends FastImageFile {
    
    constructor() {
        super()
    }

    async runCmd(cmd){
        this.logger.debug(cmd)
        const asyncExec = util.promisify(exec);
        return await asyncExec(`${cmd}`);
    }

    async runIpmi(ipAddress) {
        const bashConfig = this.config.bash
        const ipmitool = bashConfig.ipmitool
        const user = bashConfig.user
        const password = bashConfig.password
        const cmd = `${ipmitool} -I lanplus -H ${ipAddress} -U ${user} -P ${password} sunoem cli "show /SYS/MB/NET0 fru_macaddress" | grep "fru_macaddress = "`
        try {
            var { stdout, stderr } = await this.runCmd(cmd) //await asyncExec(`bash ${cmd}`);
            stdout = stdout.trim().split('=')[1].trim()
            if (stdout.split(':').length != 6) {
                this.logger.error(`Mac address not valid for IP: ${ipAddress} MAC: ${stdout}`)
                process.exit(1)
            }
            stderr = stderr.trim()
            if (stderr) {
                this.logger.error(`Error: ${stderr}`);
                process.exit(1)
            }
            return { stdout, stderr }
        }
        catch (error) {
            this.logger.error(`Error: ${error.message}`);
            process.exit(1)
        }
    }
}

module.exports = FastImageBash