const fs = require("fs");
var { shell } = require('electron');
const crypto = require('crypto')
var spawn = require("child_process").spawn;
function replaceAll_once(str, search, replace, start = 0) {
    while (true) {
        var i = str.indexOf(search, start);
        if (i == -1) break;
        start = i + search.length;
        str = str.substr(0, i) + replace + str.substr(start, str.length - start);
        start += replace.length - search.length;

    }
    return str;
}

const path = require("path");

function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    }
    if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
    }
}
const files = {
    getAppData: () => process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"),
    getMd5: (s) => {
        return crypto.createHash('md5').update(s).digest("hex")
    },
    runCmd: (cmd, callback, onClose) => {
        console.log(cmd);
        return new Promise(function(resolve, reject) {
            var result = spawn('cmd.exe ', ['/s', '/c', cmd], { shell: true });
            result.on('close', function(code) {
                if (typeof(onClose) == 'function') onClose(code);
            });
            result.stdout.on('data', function(data) {
                callback(iconvLite.decode(data, 'cp936'));
            });
            resolve();
        });
    },
    getPath: (p) => {
        return replaceAll_once(p, '%path%', replaceAll_once(__dirname, '\\', '\/'));
    },
    openFile: (path) => {
        if (!fs.existsSync(path)) return false
        shell.openPath(path)
        return true
    },
    openFileInFolder: (path) => {
        if (!fs.existsSync(path)) return false
        shell.showItemInFolder(path)
        return true
    },
    read: (file) => fs.existsSync(file) && fs.readFileSync(file).toString(),
    exists: (path) => fs.existsSync(path),
    isFile: (path) => fs.existsSync(path) && fs.statSync(path).isFile(),
    isDir: (path) => fs.existsSync(path) && fs.statSync(path).isDirectory(),
    mkdir: (dir) => mkdirsSync(dir),
    write: (file, content) => files.mkdir(path.dirname(file)) && fs.writeFileSync(file, content),
    searchDirFiles: (dir, list, fileExts, C) => {
        fs.readdirSync(dir).forEach(fileName => {
            var path = files.join(dir, fileName);
            if (files.isDir(path) && ((!C && C != 0) || C > 0)) {
                if (files.isEmptyDir(path)) return files.removeDir(path);
                searchDirFiles(path, list, fileExts, C - 1);
                return;
            }
            for (var i = 0; i < fileExts.length; i++) {
                if (fileName.endsWith(fileExts[i])) {
                    list.push(path);
                    return;
                }
            }
        });
    },
    getExtension: (file) => path.extname(file).replace('.', ''),
    remove: (file) => { fs.existsSync(file) && fs.rmSync(file) },
    copy: (oldFile, newFile) => {
        fs.copyFileSync(oldFile, newFile);
        return fs.existsSync(newFile);
    },
    copyMove: (oldFile, newFile) => {
        fs.copyFileSync(oldFile, newFile);
        fs.unlinkSync(oldFile);
        // fs.renameSync(oldFile, newFile);
        return fs.existsSync(newFile);
    },
    move: (oldFile, newFile) => {
        fs.renameSync(oldFile, newFile);
    },
    join: (dir, file) => path.join(dir, file),
    listDir: (dir) => {
        var res = [];
        fs.readdirSync(dir).forEach(function(name) {
            var filePath = path.join(dir, name);
            var stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                res.push(filePath);
            }
        });
        return res;
    },
    isEmptyDir: (dir) => fs.readdirSync(dir).length == 0,
    removeDir: (dir) => fs.rmSync(dir, { recursive: true, force: true }),
    stat: (file) => files.exists(file) && fs.statSync(file),
}


module.exports = files;