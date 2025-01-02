const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const keys_json_path = path.join(app.getPath('userData'), 'keys.json');

// Read in the templete JSON file
const template_json_path = path.join(app.getAppPath(), 'src/data/template.json');

// Ensure the directory exists
const keys_json_dir = path.dirname(keys_json_path);
if (!fs.existsSync(keys_json_dir)) {
  fs.mkdirSync(keys_json_dir, { recursive: true });
}

// Ensure the JSON file exists with template data
if (!fs.existsSync(keys_json_path)) {
  fs.copyFileSync(template_json_path, keys_json_path);
}

// Development mode check
const isDev = process.env.NODE_ENV === 'development';

const getIconPath = () => {
  const icon = 'icon.png'; // Define the asset variable
  // if (isDev) {
  //   return path.join(__dirname, '../assets', asset);
  // } else {
  //   // In production, assets are in the resources directory
  //   return path.join(process.resourcesPath, 'assets', asset);
  // }
  return path.join(__dirname, '../assets', icon);
};

let mainWindow = null; // the main window object
let tray = null; // the tray object

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "Save your keys",
    width: 600,
    height: 800,
    resizable: false,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), 'src/preload.js')
    },
  });



  // // and load the index.html of the app.
  // mainWindow.loadURL(isDev ? MAIN_WINDOW_WEBPACK_ENTRY : `file://${path.join(__dirname, '../build/index.html')}`)

  // Load the local HTML file instead of localhost URL
  const startUrl = isDev 
  ? 'http://localhost:3000'
  : `file://${path.join(app.getAppPath(), 'dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Disable the default menu bar
  mainWindow.setMenuBarVisibility(false);

  // Hide thw window instead of closing it
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Ensure you're showing your window only after it's ready to be displayed.
  // This can prevent showing a blank window.
  // Use the ready-to-show event:
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  //create the tray
  tray = new Tray(getIconPath());
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App', click: function () {
        mainWindow.show();
      }
    },
    {
      label: 'Quit', click: function () {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Save your keys');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// // Quit when all windows are closed, except on macOS. There, it's common
// // for applications and their menu bar to stay active until the user quits
// // explicitly with Cmd + Q.
// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// read the keys json file
ipcMain.on('read-keys', (event) => {
  // the json file is like this:
  // [
  //   {
  //       "Provider": "chatGPT",
  //       "keys": [
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           },
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           }
  //       ]
  //   }, ...
  // ]
  // console.log('read-keys')
  fs.readFile(keys_json_path, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      event.reply('read-keys-reply', err)
    }
    // parse the json file
    event.reply('read-keys-reply', data)
  })
});




// listen to save-key to save new name and token, only unique name is allowed for each provider
ipcMain.on('save-key', (event, { provider, oldName, newName, oldToken, newToken}) => {
  // the json file is like this:
  // [
  //   {
  //       "Provider": "chatGPT",
  //       "keys": [
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           },
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           }
  //       ]
  //   }, ...
  // ]
  // console.log(provider, oldName, newName, oldToken, newToken)
  // read the json file
  fs.readFile(keys_json_path, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    
    // parse the json file
    const keys_json = JSON.parse(data)
    // find the key to update
    const provider_index = keys_json.findIndex((item) => item.Provider === provider)
    const key_index = keys_json[provider_index].keys.findIndex((item) => item.name === oldName)
    // if the new name is not unique, except for itself
    if (keys_json[provider_index].keys.some((item) => item.name === newName && item.name !== oldName)) {
      event.reply('save-key-error', { provider, oldName, newName, oldToken, newToken, error: 'The key name must be unique' });
      return
    }
    // if the new name is empty, contains invalid characters, or is too short or too long
    if (!newName || newName.length < 3 || newName.length > 20 || !/^[a-zA-Z0-9_]+$/.test(newName)) {
      event.reply('save-key-error', { provider, oldName, newName, oldToken, newToken, error: 'The key name must be 3-20 characters long, and contain only letters, numbers, and underscores' });
      return
    }
    // update the key
    keys_json[provider_index].keys[key_index].name = newName
    keys_json[provider_index].keys[key_index].token = newToken

    // write the new json file
    fs.writeFile(keys_json_path, JSON.stringify(keys_json), (err) => {
      if (err) {
        console.error(err)
        return
      }
      // rerender the keys
      event.reply('save-key-success', { provider, oldName, newName, newToken });
    })
  })
})



// listen to delete key
// receive the provider and name of the key
ipcMain.on('delete-key', (event, { provider, name }) => {
  // the json file is like this:
  // [
  //   {
  //       "Provider": "chatGPT",
  //       "keys": [
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           },
  //           {
  //               "name": "YOUR_KEY_NAME",
  //               "token": "YOUR_API_KEY"
  //           }
  //       ]
  //   }, ...
  // ]
  // console.log('delete-key', provider, name)
  // read the json file
  fs.readFile(keys_json_path, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    // parse the json file
    const keys_json = JSON.parse(data)
    // find the key to delete
    const provider_index = keys_json.findIndex((item) => item.Provider === provider)
    const key_index = keys_json[provider_index].keys.findIndex((item) => item.name === name)
    // delete the key
    keys_json[provider_index].keys.splice(key_index, 1)

    // if the provider has no keys left, delete the provider
    if (keys_json[provider_index].keys.length === 0) {
      keys_json.splice(provider_index, 1)
    }

    // write the new json file
    fs.writeFile(keys_json_path, JSON.stringify(keys_json), (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      // rerender the keys
      // console.log('delete-key-success', provider, name)
      event.reply('delete-key-success', { provider, name });
    });
  })
})


// listen to add key
// receive the provider and name and token of the new key
ipcMain.on('add-key', (event, { provider, name, token }) => {
  // console.log('add-key', provider, name, token);

  // Read the JSON file
  fs.readFile(keys_json_path, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      event.reply('add-key-error', { provider, name, token, error: 'Failed to read the keys file' });
      return;
    }

    // Parse the JSON file
    let keys_json;
    try {
      keys_json = JSON.parse(data);
    } catch (parseErr) {
      console.error(parseErr);
      event.reply('add-key-error', { provider, name, token, error: 'Failed to parse the keys file' });
      return;
    }

    // Validate the key name
    if (!name || name.length < 3 || name.length > 20 || !/^[a-zA-Z0-9_]+$/.test(name)) {
      event.reply('add-key-error', { provider, name, token, error: 'The key name must be 3-20 characters long, and contain only letters, numbers, and underscores' });
      return;
    }

    // Find the provider to add the key
    const provider_index = keys_json.findIndex((item) => item.Provider === provider);

    if (provider_index === -1) {
      // If the provider does not exist, create it
      keys_json.push({
        Provider: provider,
        keys: [
          {
            name,
            token
          }
        ]
      });
    } else {
      // If the key name is not unique, except for itself
      if (keys_json[provider_index].keys.some((item) => item.name === name)) {
        event.reply('add-key-error', { provider, name, token, error: 'The key name must be unique' });
        return;
      }

      // Add the key to the provider
      keys_json[provider_index].keys.push({
        name,
        token
      });
    }

    // Write the new JSON file
    fs.writeFile(keys_json_path, JSON.stringify(keys_json, null, 2), (err) => {
      if (err) {
        console.error(err);
        event.reply('add-key-error', { provider, name, token, error: 'Failed to write to the keys file' });
        return;
      }

      // Notify success
      event.reply('add-key-success', { provider, name, token });
    });
  });
});