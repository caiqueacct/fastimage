
const FastImageObject = require('./fastimageobj.js')
const FastImageCsv = require('./fastimagecsv.js')

class FastImage extends FastImageObject {
    constructor() {
        super()
        this.logger.info(`FastImage starting...`)
    }

    async printUsage() {
        console.log(`
fastimage [CSV file]
        `)
        process.exit(0)
    }

    async processCsv(filename) {
        const fastImageCsv = new FastImageCsv(filename)
        await fastImageCsv.processCSV(filename)
        await this.selectImage()
    }

    async selectImage(){
        
    }
}

const fastImage = new FastImage()
const args = process.argv.slice(2);
if (args.length == 0)
    fastImage.printUsage()

fastImage.processCsv(args[0])