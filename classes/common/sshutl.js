const { Client } = require('ssh2');

// fru_macaddress ssh root@10.14.16.194 "show /SYS/MB/NET0 fru_macaddress" | grep fru_macaddress
// Replace these with your own credentials
// const host = '10.14.16.194';
// const port = 22; // Default SSH port is 22
// const username = 'root';
// const password = 'welcome1';

// const conn = new Client();

var _sshInfo

const CommonObject = require('./obj.js')

class SSHUtil extends CommonObject {

  constructor(sshInfo) {
    super()
    _sshInfo = sshInfo
  }

  setHost(newHost) {
    _sshInfo.host = newHost
  }

  // 'show /SYS/MB/NET0 fru_macaddress'
  async run(cmd) {
    this.logger.info(`Connecting to ${_sshInfo.username}@${_sshInfo.host}`)
    const conn = new Client();
    return new Promise((resolve, reject) => {
      conn.on('ready', async () => {
        this.logger.info(`Running [${cmd}]`)
        conn.exec(cmd,
          (err, stream) => {
            if (err) throw err;
            let output = '';

            stream.on('close', (code, signal) => {
              conn.end();
              resolve({ code, output });
            }).on('data', (data) => {
              output += data.toString();
            }).stderr.on('data', (data) => {
              output += data.toString();
            });
          }
        );
      }).on('keyboard-interactive', function (name, descr, lang, prompts, finish) {
        // For illustration purposes only! It's not safe to do this!
        // You can read it from process.stdin or whatever else...
        // var password = "welcome1";
        return finish([_sshInfo.password]);

        // And remember, server may trigger this event multiple times
        // and for different purposes (not only auth)
      }).connect({
        host: _sshInfo.host,
        port: _sshInfo.port,
        username: _sshInfo.username,
        password: _sshInfo.password,
        tryKeyboard: true
      });

      conn.on('error', (err) => {
        resolve({ code: 1, err: err.message });
      });
    })

  }

}

module.exports = SSHUtil

// const SSHUtil = new SSHUtil({
//   // host: '10.14.16.194',
//   host: '192.168.1.101',
//   port: 22,
//   username: 'root',
//   password: 'welcome1'
// })

// async function main() {
//   const result = await SSHUtil.run('show /SYS/MB/NET0 fru_macaddress')
//   console.debug(result)
//   console.log('acabou')
// }

// main()