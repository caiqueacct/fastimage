
const FastImageFile = require('./fastimagefile')
const FastImageSSH = require('./fastimagessh.js')

const _ = require('underscore')

let x = 0
let rackConfig = ''
let rackModel = ''

var reimageConfig

const Table = require('cli-table');

class FastImageCsv extends FastImageFile {
    constructor() {
        super()
    }

    async processCSV(filename) {
        this.logger.info(`Processing CSV file: [${filename}]`)
        // const fastImageBash = new FastImageBash()
        const bashConfig = this.config.bash
        const fastImageSSH = new FastImageSSH({
            host: '',
            port: 22,
            username: bashConfig.user,
            password: bashConfig.password
        })
        // const fileStream = fs.createReadStream(filename);
        const jsonObj = await this.openFile(filename)
        // readline.createInterface({
        //     input: fileStream,
        //     crlfDelay: Infinity, // To handle both '\r\n' and '\n' line endings
        // });

        var updatedCSV = ''
        var csvTableData = []
        var csvTable = new Table({
            chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
            head: [
                'Type'
                , 'hostname'
                , 'MAC'
                , 'eth0'
                , 'ILOM'],
        });
        for await (var element of jsonObj) {
            const version = element
            const isRack = version.indexOf('Rack') != -1
            if (isRack) {
                const rackType = version.split(' ')
                _.findIndex(rackType, (v, i) => {
                    if (v == 'Rack') {
                        rackConfig = rackType[i - 1] + rackType[i]
                        rackModel = rackType[1].split(',')[2]
                        this.logger.info(`Rack: ${version}`)
                        this.logger.info(`Rack config: ${rackConfig}`)
                        this.logger.info(`Rack model: ${rackModel}`)
                    }
                })
                try {
                    reimageConfig = this.config.get(`ilom.${rackConfig}`);
                }
                catch (e) {
                    this.logger.error(e.message.indexOf(
                        'is not defined') > 0 ?
                        `Cannot find configuration for ${rackConfig}. Exiting...` :
                        `Unknown error: ${e.message}`)
                    process.exit(1)
                }
            }
            const line = element.split(',')
            const nodeType = line[2]
            if (nodeType == 'db' || nodeType == 'cell') {
                let ilomIp = reimageConfig[x]
                fastImageSSH.setHost(ilomIp)
                // FIND AND CHANGE
                const result = await fastImageSSH.run('/usr/local/bin/show /SYS/MB/NET0 fru_macaddress')
                if (result.code == 1) {
                    this.logger.error(result.err)
                    line[6] = 'ERROR'
                }
                else {
                    try {
                        line[6] = result.output.split('=')[1].trim()
                    }
                    catch (e) {
                        this.logger.error(`OUT: ${result.output}`, `ERR: ${e.message}`)
                        line[6] = 'ERROR'
                    }
                }
                element = line.join(',')
                csvTableData.push([nodeType, line[0], line[6], line[7], ilomIp])
                csvTable.push([nodeType, line[0], line[6], line[7], ilomIp])
                x++
            }
            updatedCSV += element + '\n'
        }
        console.log(csvTable.toString())
        this.logger.info('CSV file processed.')
        await this.exportCSVtoPreconf(updatedCSV)
    }

    async exportCSVtoPreconf(csvData) {
        const preconf = this.config.pxe.path.iso + this.config.pxe.preconf;
        await this.saveData(preconf, csvData)
    }

}

module.exports = FastImageCsv