const FileUtil = require("./fileutl");
const SSHUtil = require("./sshutl.js");

const _ = require("underscore");

let x = 0;
let rackConfig = "";
let rackModel = "";

var reimageConfig;

var _LOGGER;

const Table = require("cli-table");

class CsvUtil extends FileUtil {
  constructor() {
    super();
    _LOGGER = this.logger;
  }

  async processCSV(filename, serverDetail) {
    _LOGGER.info(
      `Processing CSV file: [${filename}]. ${
        serverDetail.ilomConfig
          ? "Custom configuration selected: " + serverDetail.ilomConfig
          : ""
      }`
    );
    // const BashUtil = new BashUtil()
    const bashConfig = this.config.bash;
    const sshUtil = new SSHUtil({
      host: "",
      port: 22,
      username: bashConfig.user,
      password: bashConfig.password,
    });
    // const fileStream = fs.createReadStream(filename);
    const jsonObj = await this.openFile(filename);
    // readline.createInterface({
    //     input: fileStream,
    //     crlfDelay: Infinity, // To handle both '\r\n' and '\n' line endings
    // });

    var updatedCSV = "";
    // var csvTableData = []
    var csvTable = new Table({
      chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
      head: ["Type", "hostname", "MAC", "eth0", "ILOM"],
    });
    for await (var element of jsonObj) {
      const version = element;
      // _LOGGER.debug(version);
      const isRack = version.indexOf("# OneCommand") != -1;
      if (isRack) {
        const rackType = version.split(",")[2];
        _LOGGER.info(`Rack: ${rackType}`);
        const rackDetails = rackType.split(" ");
        serverDetail.rackConfig = rackDetails[rackDetails.indexOf("Rack") - 1];
        serverDetail.rackModel = rackDetails[0];
        _LOGGER.info(`Rack config: ${serverDetail.rackConfig}`);
        _LOGGER.info(`Rack model: ${serverDetail.rackModel}`);
        const useConfig =
          serverDetail.ilomConfig || serverDetail.rackConfig;
        try {
          _LOGGER.info(`Using configuration: [${useConfig}]`);
          reimageConfig = this.config.get(`ilom.${useConfig}`);
          _LOGGER.info(`🍺 Configuration found...\n`);
        } catch (e) {
          _LOGGER.error(
            e.message.indexOf("is not defined") > 0
              ? `Cannot find configuration for [${useConfig}]. Exiting...`
              : `Unknown error: ${e.message}`
          );
          process.exit(1);
        }
      }
      const line = element.split(",");
      // _LOGGER.debug(line)
      const nodeType = line[2];
      if (nodeType == "db" || nodeType == "cell") {
        const managementPos = line.indexOf('Management')+1
        let ilomIp = reimageConfig[x];
        sshUtil.setHost(ilomIp);
        const result = await sshUtil.run("show /SYS/MB/NET0 fru_macaddress");
        if (result.code == 1) {
          _LOGGER.error(result.err);
          line[managementPos] = "ERROR";
        } else {
          try {
            line[managementPos] = result.output.split("=")[1].trim();
            _LOGGER.info(`MacAddress: [${line[managementPos]}]\n`)
          } catch (e) {
            _LOGGER.error(`OUT: ${result.output}`, `ERR: ${e.message}`);
            line[managementPos] = "ERROR";
          }
        }
        element = line.join(",");
        serverDetail.csvTableData.push([
          nodeType,
          line[0],
          line[managementPos],
          line[7],
          ilomIp,
        ]);
        csvTable.push([nodeType, line[0], line[managementPos], line[7], ilomIp]);
        x++;
      }
      updatedCSV += element + "\n";
    }
    console.log(csvTable.toString());
    _LOGGER.info("CSV file processed.");
    await this.exportCSVtoPreconf(updatedCSV);
  }

  async exportCSVtoPreconf(csvData) {
    const preconf = this.config.pxe.path.iso + this.config.pxe.preconf;
    await this.saveData(preconf, csvData);
  }
}

module.exports = CsvUtil;

// const args = process.argv.slice(2);
// const csvFile = args[0]

// var _serverDetail = {
//   ilomConfig: 'Full',
//   customModel: 'Jaca',
//   rackConfig: "",
//   rackModel: "",
//   version: "",
//   csvTableData: [],
// };

// const csvClass = new CsvUtil();
// csvClass.processCSV(
//   csvFile,
//   _serverDetail
// );
