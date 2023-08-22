
const CommonObject = require('../common/obj.js')
const CsvUtil = require('../common/csv.js')
const FastImagePXEImages = require('./pxeimages.js')

var _serverDetail = {
    ilomConfig: '',
    customModel: '',
    rackConfig: '',
    rackModel: '',
    version: '',
    csvTableData: []
}

class FastImage extends CommonObject {
    constructor() {
        super()
        this.logger.info(`FastImage starting...`)
    }

    async printUsage() {
        console.log(`
fastimage [CSV file] <options>
options:
        -h -help: Print this help
        -ilom: Select the custom configuration to load the ILOM ip addresses
        -model: Select the custom configuration to load the GRUB pxe boot
        `)
        process.exit(0)
    }

    async processCsv(filename, ilomConfig, customModel) {
        _serverDetail.ilomConfig = ilomConfig
        _serverDetail.customModel = customModel
        const csvUtil = new CsvUtil(filename)
        await csvUtil.processCSV(filename, _serverDetail)
        await this.selectImage()
    }

    async selectImage() {
        const model = _serverDetail.customModel || _serverDetail.rackModel
        const fastImagePXEImages = new FastImagePXEImages(_serverDetail.csvTableData, model)
        await fastImagePXEImages.startWorkflow()
    }
}

const fastImage = new FastImage()
const args = process.argv.slice(2);
if (args.length == 0 || args.indexOf('-h') != -1 || args.indexOf('-help') != -1)
    fastImage.printUsage()

fastImage.processCsv(args[0],
    args.indexOf('-ilom') != -1 ? args[args.indexOf('-ilom') + 1] : null,
    args.indexOf('-model') != -1 ? args[args.indexOf('-model') + 1] : null
)