const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  powerSaveBlocker,
} = require('electron');
const { join } = require('path');
const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { uploadCode } = require('./upload-code.js');

// The list of menu options for the companion app
let menuItems = [
  {
    label: 'ElectroBlock Companion App v1.0.0',
    type: 'normal',
    enabled: false,
  },
  { type: 'separator' },
  { label: 'Debug', type: 'normal' },
];

// Product Ids to name of boards
const productIdMap = {
  '0043': 'uno',
  '0042': 'mega',
};

// A list of product ids we support
const productIds = ['0043', '0042'];

// A list of the vendor ids we support
const vendorIds = ['2341'];

app.whenReady().then(() => {
  powerSaveBlocker.start('prevent-display-sleep');

  /**
   * This is the selected port / port info for board
   */
  let selectedPort = null;
  const tray = new Tray(join(__dirname, 'favicon.png'));
  tray.displayBalloon;
  let contextMenu = Menu.buildFromTemplate(menuItems);
  tray.setToolTip('This is my application.');
  tray.setContextMenu(contextMenu);

  // Start the socket server
  const wss = new WebSocket.WebSocketServer({ port: 14532 });

  // Listen for connections
  wss.on('connection', function connection(ws) {
    ws.on('message', async function message(data) {
      console.log(await uploadCode(data, selectedPort.path, 'uno'));
    });
    ws.send(JSON.stringify({ selectedPort }));
  });

  setInterval(async () => {
    try {
      const ports = await getBoardPorts();
      // If the port did not change do nothing
      if (didSelectedPortChange(ports, selectedPort)) {
        // if ports is empty set it to null
        // otherwise set it to last the first item in the array of ports
        selectedPort = ports.length === 0 ? null : ports[0];
        // Send the selected port to all the clients
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ selectedPort }));
          }
        });
      }
    } catch (e) {
      console.log(e);
    }
  }, 150);
});

/**
 * Return a list of valid supported board ports
 *
 * @returns PortInfo
 */
async function getBoardPorts() {
  const rawPorts = await SerialPort.list();
  return rawPorts.filter(
    (p) => vendorIds.includes(p.vendorId) && productIds.includes(p.productId)
  );
}

/**
 * Returns true if the serial has been selected
 *
 * @param {Array<SerialPort.PortInfo>} ports
 * @param {SerialPort.PortInfo} selectedPort
 * @returns boolean
 */
function didSelectedPortChange(ports, selectedPort) {
  // This means that previous state was empty
  if (selectedPort === null && ports.length === 0) {
    return false;
  }

  // This means that we already found our selected port
  if (
    selectedPort !== null &&
    ports.find((p) => p.path === selectedPort.path)
  ) {
    return false;
  }

  return true;
}
