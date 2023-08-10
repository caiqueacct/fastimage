
const FastImageBash = require('./fastimagebash')
const FastImageSSH = require('./fastimagessh.js')
const inquirer = require('inquirer');

let _selected = {
    cell: {
        version: '',
        iso: '',
        initrd: '',
        vmlinux: ''
    },
    db: {
        version: '',
        iso: '',
        initrd: '',
        vmlinux: ''
    }
}

var _useOvs = 'No'

var _ovsOptions = {
    Yes: 'ovs=only',
    No: 'ovs=no'
}
var _reimageData = []
var _serverModel = ''
var _uniqNodeTypes = []

/**
 * 
 */
class FastImagePXEImages extends FastImageBash {
    constructor(reimageData, serverModel) {
        super()
        _reimageData = reimageData
        _serverModel = serverModel
        var nodeTypes = []
        _reimageData.forEach(row => {
            nodeTypes.push(row[0])
        })
        _uniqNodeTypes = [...new Set(nodeTypes)]
        this.logger.info(`This reimage have ${_uniqNodeTypes.length == 1 ? 'only ' + _uniqNodeTypes[0] + ' server(s)' : 'both cell and db nodes'}`)
    }

    async useOvsPrompt() {
        const ovsOptions = [
            {
                type: 'list',
                name: 'useOvs',
                message: `Is this imaging to be used for Virtualization (OVM or KVM)?`,
                default: _useOvs,
                choices: ['Yes', 'No']
            }
        ];
        await inquirer.prompt(ovsOptions).then(async answers => {
            _useOvs = answers.useOvs
            // console.log(`Selected: ${answers.useOvs}. Setting grub to [${_ovsOptions[_useOvs]}]`);
        });
    }

    /**
     * 
     * @param {*} nodeType 
     */
    async getAvailableImages(nodeType = 'cell', defaultValue) {
        console.log()
        const cmd = `cd ${this.config.pxe.path.iso};ls ${this.decodeNodeType(nodeType)}*.iso | cut -d '_' -f2 | sort -r`
        var { stdout, stderr } = await this.runCmd(cmd)

        const availableImages = [
            {
                type: 'list',
                name: 'image',
                message: `Select the version to reimage the ${nodeType} node:`,
                default: defaultValue,
                choices: stdout.trim().split('\n')
            }
        ];

        await inquirer.prompt(availableImages).then(async answers => {
            // console.log(`Selected: ${answers.image}`);
            _selected[nodeType].version = answers.image
            await this.getImageDetails(nodeType)
        });

    }

    decodeNodeType(nodeType) {
        return nodeType == 'db' ? 'compute' : nodeType
    }

    async getImageDetails(nodeType = 'cell') {
        const cmd = `cd ${this.config.pxe.path.iso};ls ${this.decodeNodeType(nodeType)}*${_selected[nodeType].version}*.iso;cd ${this.config.pxe.path.efi};ls *${_selected[nodeType].version}*${this.decodeNodeType(nodeType)}* | sort`
        var { stdout, stderr } = await this.runCmd(cmd)
        const imageDetails = stdout.trim().split('\n')
        _selected[nodeType].iso = imageDetails[0]
        _selected[nodeType].initrd = imageDetails[1]
        _selected[nodeType].vmlinux = imageDetails[2]
        await this.extractEfi(nodeType)
    }

    async createGrubFiles() {
        console.log()
        const fileTemplate = this.config.pxe.templates[_serverModel]
        const pxecfg = this.config.pxe.path.pxecfg
        for await (var element of _reimageData) {
            const nodeType = element[0]
            const grubDetail =
            {
                nodeType: nodeType,
                hostname: element[1],
                mac: element[2].replace(/:/g, '-'),
                template: `templates/${fileTemplate[nodeType]}`,
                outfile: `${pxecfg}grub.cfg-01-${element[2].replace(/:/g, '-')}`,
                VMLINUX_FILE: _selected[nodeType].vmlinux,
                INITRD_FILE: _selected[nodeType].initrd,
                ISO_FILE: _selected[nodeType].iso
            }
            // console.log(grubDetail)
            await this.writeGrubData(grubDetail)
        }
    }

    async writeGrubData(grubDetail) {
        this.logger.info(`Processing GRUB for mac: [${grubDetail.mac}]`)
        const filelines = await this.openFile(grubDetail.template)
        const httpServer = this.config.pxe.httpServer
        var newfilelines = ''
        for await (var element of filelines) {
            const newline = element
                .replace(/<VMLINUX_FILE>/g, grubDetail.VMLINUX_FILE)
                .replace(/<HTTP_SERVER>/g, httpServer)
                .replace(/<ISO_FILE>/g, grubDetail.ISO_FILE)
                .replace(/<INITRD_FILE>/g, grubDetail.INITRD_FILE)
                .replace(/<VERSION>/g, _selected[grubDetail.nodeType].version)
                .replace(/<NODE>/g, grubDetail.hostname)
                .replace(/<OVS_TYPE>/g, _ovsOptions[_useOvs])
            newfilelines += newline + '\n'
        }
        await this.saveData(grubDetail.outfile, newfilelines)
    }

    async extractEfi(nodeType) {
        const inputFile = this.config.pxe.path.efi + _selected[nodeType].initrd
        var cmd = `bin/extract_efi_from_initrd.sh -i ${inputFile} -e ${this.config.pxe.efi[nodeType]}`

        this.logger.info(`Extracting EFI: ${cmd}`)
        try {
            var { stdout, stderr } = await this.runCmd(cmd)
            console.log(stdout, stderr)
            if (nodeType == 'cell' && _uniqNodeTypes.length == 2) return
            const extractPath = this.config.pxe.efi[nodeType]
            const pxeCfg = this.config.pxe.path.pxecfg
            const cpFiles = [
                ['grubx64.efi', 'bootx64.efi'],
                ['grubx64.efi', 'grubx64.efi'],
                ['shim.efi', 'shim.efi']
            ]
            this.logger.info(`Copying required files...`)
            for await (var file of cpFiles) {
                cmd = `cp -f ${extractPath}${file[0]} ${pxeCfg}${file[1]}; chmod 755 ${pxeCfg}${file[1]}`
                try {
                    var { stdout, stderr } = await this.runCmd(cmd)
                    this.logger.info('🍺 ' + cmd)
                }
                catch (e) {
                    this.logger.error(e.message)
                }
            }
        }
        catch (e) {
            this.logger.error(`Error: ${e.message} - ${e.stdout}`)
        }
    }

    async startReimage() {
        this.logger.info('Starting the re-image...')
        const bashConfig = this.config.bash
        const fastImageSSH = new FastImageSSH({
            host: '',
            port: 22,
            username: bashConfig.user,
            password: bashConfig.password
        })
        // FIND AND CHANGE
        const reimageCommands = ['/usr/local/bin/set /HOST boot_device=pxe',
            '/usr/local/bin/reset -script /SYS',
            '/usr/local/bin/set /SYSTEM locator_indicator=on']
        for await (var server of _reimageData) {
            fastImageSSH.setHost(server[4])
            for await (var cmd of reimageCommands) {
                var result = await fastImageSSH.run(cmd)
                console.log(result.output)
            }
            const timeoutSeconds = this.config.pxe.reimage.timeout
            this.logger.info(`Sleeping for ${timeoutSeconds} seconds to don't overload the server`)
            await this.runCmd(`sleep ${timeoutSeconds}`)
        }
    }

    /**
     * 
     */
    async startWorkflow() {
        // await this.useOvsPrompt()
        // if (_uniqNodeTypes.includes('cell'))
        //     await this.getAvailableImages()
        // if (_uniqNodeTypes.includes('db'))
        //     await this.getAvailableImages('db', _selected.cell.version)
        // await this.createGrubFiles()
        await this.startReimage()
    }
}

module.exports = FastImagePXEImages

async function runCmd() {
    const serverModel = 'X10M-2'
    const reimageData = [
        [
            'cell',
            'rag0p205c07mgmt',
            'a8:69:8c:10:76:44',
            '10.14.16.164',
            '127.0.0.1'
        ],
        [
            'db',
            'rag0p205db02mgmt',
            '3e:22:fb:e0:b9:65',
            '10.14.16.157',
            '192.168.99.2'
        ]
    ]
    const fastImagePXEImages = new FastImagePXEImages(reimageData, serverModel)
    await fastImagePXEImages.startWorkflow()
    // console.log(_selected)
}

runCmd()