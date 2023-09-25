const BashUtil = require('../common/bash')

const path = require('path');

const Table = require('cli-table');
const PatchLink = require('./tasks/patchlink');

// var _LOGIN_DATA = {
//     username: 'carlos.h.duarte@oracle.com',
//     password: '0r@cl3F3d3Mu1t0!'
// }

class FastInstall extends BashUtil {
    constructor() {
        super()
        this.logger.info(`${this.config.app.name} starting...`)
    }

    async printUsage() {
        console.log(`
fastinstall <HTML file> [options]
options:
        -h -help           Print this help
        -t <task #>        Run only the specified task
        -l                 List all the available tasks
        `)
        process.exit(0)
    }

    async getInstallPatches(htmlFilePath) {
        this.logger.info('Get required patches for installation...')
        this.logger.info(`File reference [${htmlFilePath}]`)
        var reqPatches = this.config.patches.system
        fs.readFile(htmlFilePath, 'utf8', async (err, htmlContent) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                return;
            }
            const $ = cheerio.load(htmlContent);
            const table = $('table').map((i, el) => $(el).text().trim()).get();
            const patches = table[table.length - 1].toString().trim().replace(/  +/g, ' ').split('\n')

            for await (var patch of patches) {
                if (patch.indexOf('zip') != -1) {
                    const patchFile = patch.trim()
                    const patchNumber = parseInt(patchFile.split('_')[0].replace(/p/g, ''))
                    reqPatches.push({
                        number: patchNumber,
                        file: patchFile,
                        found: false
                    })
                }
            }
            await this.checkIsAvailable(reqPatches)
        });
    }

    listOptions(invalidStep = false) {
        if (invalidStep)
            this.logger.error('Invalid option selected. Valid option:')
        console.log(`
1. Check if required patches for the installation are in the local filesystem [${this.config.patches.localDir}]
2. Download patches not found in the local filesystem
3. Get patch(es) links. Pass one or more patch numbers separated by ,
`)
        process.exit(0)
    }

    async checkIsAvailable(patches) {
        const directoryPath = this.config.patches.localDir; // Replace with the directory path you want to search in
        this.logger.info(`Searching patches on dir: ${directoryPath}`)


        fs.readdir(directoryPath, async (err, files) => {
            if (err) {
                this.logger.error('Error reading directory:', err);
                return;
            }

            var csvTable = new Table({
                chars: { 'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
                head: [
                    'Number'
                    , 'Notes'
                    , 'File'
                    , 'Found'],
            });
            for await (var patch of patches) {
                const matchingFiles = files.filter(file => file.includes(patch.file || patch.number));
                this.logger.info(`Patch [${patch.file || patch.number}] found: ${(matchingFiles)}`)
                patch.found = (matchingFiles.length > 0)
                csvTable.push([patch.number, patch.notes || '', matchingFiles.toString() || patch.file, patch.found])
            }

            console.log(csvTable.toString())
            fs.writeFile('tmp/patches.json', JSON.stringify(patches), (err) => {
                if (err) this.logger.error(err.message)
            })
        });

    }

}

const fastInstall = new FastInstall()
const args = process.argv.slice(2);
if (args.length < 2 || args.indexOf('-h') != -1 || args.indexOf('-help') != -1)
    fastInstall.printUsage()

const listOptions = args[args.indexOf('-l')]
const runStep = parseInt(args[args.indexOf('-t') + 1])
const stepOption = args[args.indexOf('-t') + 2]
// console.log(listOptions, runStep)
if (listOptions)
    fastInstall.listOptions()

const OEDA_FILENAME = args[0]
switch (runStep) {
    case 1:
        fastInstall.getInstallPatches(OEDA_FILENAME)
        break
    case 2:
        // fastInstall.getPatchLink(OEDA_FILENAME)
        fastInstall.extractLinkToDownload()
        break
    case 3:
        // fastInstall.getPatchLink(stepOption)
        new PatchLink().getPatchLink(stepOption)
        break
    default:
        fastInstall.listOptions(true)

}