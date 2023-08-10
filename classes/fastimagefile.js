const FastImageObject = require('./fastimageobj.js')

const fs = require('fs');
const readline = require('readline');

class FastImageFile extends FastImageObject {
    constructor() {
        super()
    }

    async openFile(filename) {
        const fileStream = fs.createReadStream(filename);
        return await readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity, // To handle both '\r\n' and '\n' line endings
        });
    }

    async saveData(filename, filedata) {
        return new Promise(async (resolve, reject) => {
            await fs.writeFile(filename, filedata, (err) => {
                if (err) {
                    this.logger.error(`Error writing to the file [${filename}]:`, err);
                } else {
                    this.logger.log(`🍺 File: [${filename}] saved`);
                }
                resolve()
            });
        })
    }

}

module.exports = FastImageFile