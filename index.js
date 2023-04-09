const chokidar = require('chokidar');
const diff_match_patch = require('./diff-match-patch.js');
const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const process = require('process');
const roland = require('./roland.json');

const rootDirectory = roland.rootDirectory ? roland.rootDirectory : 'game';
const watchedDir = path.join(process.cwd(), rootDirectory);
const port = roland.port ? roland.port : 3000;

const dmp = new diff_match_patch();

function isInsideDirectory(filePath, directoryPath) {
  const relativePath = path.relative(directoryPath, filePath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

const contentsCache = {};
const patches = {};

const watchSettings = {
  ignored: /^\./,
  persistent: true,
  alwaysStat: true,
  // ignoreInitial: true,
};

const watcher = chokidar.watch(watchedDir, watchSettings);

function fileAdded(filePath) {
  console.log(`File added: ${filePath}`);

  const contents = fs.readFileSync(filePath, 'utf-8');
  contentsCache[filePath] = contents;
  patches[filePath] = {};
}

function fileChanged(filePath, stats) {
  const basename = path.basename(filePath);
  const directory = path.dirname(filePath);
  const contents = fs.readdirSync(directory);
  let found = false
  for (const i in contents) {
    const name = contents[i];
    if (name == basename) {
      found = true;
      break;
    }
  }

  if (!found) {
    fileRemoved(filePath);
  }
  else {
    console.log(`File changed: ${filePath}`);
    const oldContents = contentsCache[filePath] ? contentsCache[filePath] : '';
    const newContents = fs.readFileSync(filePath, 'utf-8');
    const patch = dmp.patch_make(oldContents, newContents);
    const changes = patches[filePath] ? patches[filePath] : {};
    changes[Date.now()] = {
      action: "patch",
      patch: patch,
    };

    contentsCache[filePath] = newContents;
    patches[filePath] = changes;
  }
}

function fileRemoved(filePath) {
  console.log(`File deleted: ${filePath}`);
  patches[filePath] = {
    [Date.now()]: { action: "delete", patch: [] },
  };
  delete contentsCache[filePath];
}

console.log(`Watching ${watchedDir}`);
watcher
  .on('add', fileAdded)
  .on('change', fileChanged)
  .on('unlink', fileRemoved)
  .on('ready', () => {
    console.log('Watching for changes...');
  });
  
const app = express();
app.use(express.json());

app.post('/patch/*', (req, res) => {
  const initial = req.body ? req.body.initial : undefined;
  const filePath = '/' + req.params[0];
  const hasPatch = patches[filePath] !== undefined;

  if (hasPatch) {
    const patchList = {};
    if (initial !== undefined && fs.existsSync(filePath)) {
      const contents = fs.readFileSync(filePath, 'utf-8');
      const patch = dmp.patch_make(initial, contents);
      patchList[Date.now()] = { action: "patch", patch: patch };
    }
    else {
      for (const key in patches[filePath]) {
        const patch = patches[filePath][key];
        patchList[key] = patch;
      }
    }

    let dir = undefined;
    const testDir = path.join(watchedDir, rootDirectory);
    if (isInsideDirectory(filePath, testDir)) {
      dir = path.relative(watchedDir, testDir);
    }

    if (dir === undefined) {
      res.status(500).json({error: `${filePath} is not within the root directory`});
    }
    else {
      const basename = path.basename(filePath);
      const fullExt = basename.substring(basename.indexOf('.'));
      res.json({ 
        fileName: path.basename(filePath, fullExt),
        ext: fullExt,
        parts: dir.split(path.sep),
        list: patchList 
      });
 
      const keys = Object.keys(patchList);
      if (keys.length == 1 && patchList[keys[0]].action === "delete") {
        delete patches[filePath];
      }
      else {
        patches[filePath] = {};
      }
    }
  } else {
    res.status(404).json({ error: `Patch not found for file path: ${filePath}` });
  }
});

/// responds with a list of patch files that are new since the last request
app.get('/patchList', (req, res) => {
  const patchList = [];
  for (const filePath in patches) {
    let dir = undefined;
    const testDir = path.join(watchedDir, rootDirectory);
    if (isInsideDirectory(filePath, testDir)) {
      dir = path.relative(watchedDir, testDir);
      break;
    }
    
    if (dir === undefined) {
      continue;
    }
    
    const basename = path.basename(filePath);
    const fullExt = basename.substring(basename.indexOf('.'));
    patchList.push({
      path: filePath,
      fileName: path.basename(filePath, fullExt),
      ext: fullExt,
      parts: dir.split(path.sep),
    });
  }

  res.json(patchList);
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});