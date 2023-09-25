const BashUtil = require('../../common/bash')

const fs = require('fs');
const cheerio = require('cheerio');

const inquirer = require('inquirer');

var _LOGIN_DATA = {
    username: 'carlos.h.duarte@oracle.com',
    password: '0r@cl3F3d3Mu1t0!'
}

var _availablePatches = []

var _patchNumber = ''

class PatchLink extends BashUtil {
    constructor() {
        super()
    }

    getWgetCmd(url, outfile) {
        const cmd = `SSO_USERNAME=${_LOGIN_DATA.username}
SSO_PASSWORD=${_LOGIN_DATA.password}
wget -c --no-check-certificate --http-user=\$\{SSO_USERNAME\} --http-password=\$\{SSO_PASSWORD\} "${url}" -O tmp/${outfile}.html --keep-session-cookies`
        return cmd
    }

    async getPatchLink(patchNumber) {
        _patchNumber = patchNumber
        this.logger.info(`Downloading links for patch [${_patchNumber}]`)
        // https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=33456946&plat_lang=226P&display_type=&search_style=8&orderby=&direction=&old_type_list=&gobuttonpressed=&sortcolpressed=&tab_number=&email=carlos.h.duarte%40oracle.com&userid=O-carlos.h.duarte%40oracle.com&c_release_parent=product&c_product_child=release
        // https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=30640393&plat_lang=226P
        // const url = 'https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=30640393&plat_lang=226P'

        // const patchNumber = 30640393
        //         const cmd = `SSO_USERNAME=${_LOGIN_DATA.username}
        // SSO_PASSWORD=${_LOGIN_DATA.password}
        // wget -c --no-check-certificate --http-user=\$\{SSO_USERNAME\} --http-password=\$\{SSO_PASSWORD\} "https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=${_patchNumber}&plat_lang=226P" -O tmp/${_patchNumber}.html --keep-session-cookies`
        const cmd = this.getWgetCmd(`https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=${_patchNumber}&plat_lang=226P`, _patchNumber)

        // await this.runCmd(cmd)
        this.extractLinkToDownload()
    }

    async getPatchVersion(patch) {
        const outfile = patch.release + '_' + patch.updated
        this.logger.info(`Getting patch version [${patch.release} ${patch.updated}]`)
        const cmd = this.getWgetCmd(patch.href, outfile)
        await this.runCmd(cmd)
        await this.extractLinkToDownload(outfile)
    }

    async seekDownloadBtn(btnDwnld) {
        this.logger.info(`Checking if the patch is available to download...`)
        console.log(btnDwnld.attr('href'))
    }

    async extractLinkToDownload(outfile = _patchNumber) {
        // const patchNumber = 30640393
        this.logger.info(`🍺 Processing links for [${outfile}.html]`)
        fs.readFile(`tmp/${outfile}.html`, 'utf8', async (err, htmlContent) => {
            if (err) {
                console.error('Error reading HTML file:', err);
                return;
            }
            const $ = cheerio.load(htmlContent);
            // var availablePatches = []
            var patchLine = []

            const oraTableCellNumberElements = $('.OraTableCellNumber');
            if (oraTableCellNumberElements.length == 0) {
                this.seekDownloadBtn($('#btn_Download'))
                return
            }
            this.logger.info(`Versions found: ${oraTableCellNumberElements.length}`)

            // Iterate through each element and extract text and href attributes
            oraTableCellNumberElements.each((index, element) => {
                const anchorElement = $(element).find('a'); // Find the <a> element within the <td>
                const text = anchorElement.text(); // Extract the text content
                const href = anchorElement.attr('href'); // Extract the href attribute
                _availablePatches.push({
                    patch: text,
                    href: `https://updates.oracle.com${href}`
                })
            });

            const oraTableCellTextElements = $('.OraTableCellText');

            // Iterate through each element and extract text and href attributes
            var tmpcol = 0
            var tmprow = 0
            var tmpobj = {}
            var tmpdetail =
                ['description',
                    'release',
                    'updated',
                    'size',
                    'notes1',
                    'notes2']

            oraTableCellTextElements.each((index, element) => {
                const text = $(element).text(); // Extract the text content
                tmpobj[tmpdetail[tmpcol]] = text
                tmpcol++
                if (tmpcol == 6) {
                    _availablePatches[tmprow] = { ..._availablePatches[tmprow], ...tmpobj }
                    tmpcol = 0
                    tmprow++
                }
            });

            this.selectPatch()
        })
    }

    async selectPatch() {
        // Create a list of choices for Inquirer
        console.log()
        const choices = _availablePatches.map((entry, index) => ({
            name: `${entry.description} - ${entry.release} - ${entry.updated}`,
            value: index
        }));

        // Prompt the user to select an entry
        inquirer
            .prompt([
                {
                    type: 'checkbox',
                    name: 'selectedEntry',
                    message: `Select a version of patch [${_availablePatches[0].patch}]`,
                    choices: choices
                }
            ])
            .then(async answers => {
                // const selectedEntry = _availablePatches[answers.selectedEntry];
                // console.log('Selected Entry:', selectedEntry);
                const selectedEntry = answers.selectedEntry;
                for await (var entry of selectedEntry) {
                    const patch = _availablePatches[entry]
                    this.logger.info(`Checking if version [${patch.release} - ${patch.updated}] is availabe...`)
                    await this.getPatchVersion(patch)
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });

    }
}

module.exports = PatchLink