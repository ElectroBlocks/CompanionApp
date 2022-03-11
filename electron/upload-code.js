const cmd = require('node-cmd');
const fs = require('fs');
const path = require('path');

const arduinoMakeFolder = path.join(__dirname, 'sketches');

/**
 * Writes the arduino code
 */
const writeArduinoCodeFileAndMakeFile = (code, sketchName, board) => {
  const filePath = path.join(arduinoMakeFolder, `${sketchName}`);

  const fileAndFolderName = path.join(filePath, `${sketchName}.ino`);

  fs.mkdirSync(filePath);

  fs.chmodSync(filePath, '777');

  fs.writeFileSync(fileAndFolderName, code);

  return fileAndFolderName;
};

const getBoard = (board) => {
  if (board === 'uno') {
    return 'arduino:avr:uno';
  }
  if (board === 'mega') {
    return 'arduino:avr:mega';
  }

  if (board === 'flora') {
    return 'adafruit:avr:flora8';
  }

  return null;
};

async function uploadCode(code, portPath, board) {
  try {
    console.time('compiling');

    const boardName = getBoard(board);

    if (!boardName) {
      console.log('invalid board name');
      return;
    }
    const sketchName = Date.now();
    const sketchDirectory = path.join(arduinoMakeFolder, `${sketchName}`);
    const sketchPath = await writeArduinoCodeFileAndMakeFile(
      code,
      sketchName,
      board
    );

    console.log(
      cmd.runSync(
        `arduino-cli compile --fqbn ${boardName}  ${sketchPath} --output-dir ${sketchDirectory}`
      )
    );

    console.log(
      cmd.runSync(
        `arduino-cli upload -p ${portPath} -v --fqbn ${boardName}  ${sketchPath}`
      )
    );
    console.timeEnd('compiling');
    return `${sketchPath}.with_bootloader.hex`;
  } catch (err) {
    console.error('ERROR COMPILING: ' + err);
  }
}

module.exports = {
  uploadCode,
};
