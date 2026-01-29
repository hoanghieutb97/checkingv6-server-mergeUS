const jsonServer = require('json-server');
const path = require('path');
const net = require('net');
const { JSON_SERVER } = require('../config/constants');

// Hàm kiểm tra port có đang được sử dụng không
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
            resolve(true); // Port đang được sử dụng
        });
        server.once('listening', () => {
            server.close();
            resolve(false); // Port chưa được sử dụng
        });
        server.listen(port);
    });
}

async function startJSONServer() {
    // Kiểm tra port 3333
    const portInUse = await isPortInUse(JSON_SERVER.PORT);
    if (portInUse) {
     
        return;
    }

    // Nếu port chưa được sử dụng, khởi động JSON Server
    const server = jsonServer.create();
    const router = jsonServer.router(path.join(__dirname, '../../dbjson/db.json'));
    const middlewares = jsonServer.defaults({
        logger: false // Tắt hoàn toàn logger
    });

    server.use(middlewares);
    server.use(router);
    server.listen(JSON_SERVER.PORT, () => {
   
    });
}

function resetServer() {
  // Thư mục cần thiết để chạy Node server
  const resetServerDir = 'F:\\reset-server';
  const nodeCommand = 'node .';

  // Thực thi lệnh Node server
  exec(nodeCommand, { cwd: resetServerDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting Node server: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`Node server stderr: ${stderr}`);
      return;
    }

    console.log(`Node server stdout: ${stdout}`);
  });
}

function startCheckingv4Ultimate() {
  const checkingDir = 'F:\\checkingv4-ultimate';
  const npmCommand = 'npm start';

  exec(npmCommand, { cwd: checkingDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting checkingv4-ultimate: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`checkingv4-ultimate stderr: ${stderr}`);
      return;
    }

    console.log(`checkingv4-ultimate stdout: ${stdout}`);
  });
}

function startDongBoFile() {
  const dongBoFileDir = 'F:\\dongBoFile';
  const nodeCommand = 'node .';

  exec(nodeCommand, { cwd: dongBoFileDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting dongBoFile: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`dongBoFile stderr: ${stderr}`);
      return;
    }

    console.log(`dongBoFile stdout: ${stdout}`);
  });
}

function startTaiExcel() {
  const taiExcelDir = 'F:\\tai-excel';
  const nodeCommand = 'node .';

  exec(nodeCommand, { cwd: taiExcelDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting tai-excel: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`tai-excel stderr: ${stderr}`);
      return;
    }

    console.log(`tai-excel stdout: ${stdout}`);
  });
}

module.exports = { startJSONServer, resetServer, startCheckingv4Ultimate, startDongBoFile, startTaiExcel };
