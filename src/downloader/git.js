
const log = require('npmlog');


const path = require('path');
const cheerio = require('cheerio');

log.addLevel('git', 3000, { fg: 'yellow' });
const loglvl = 'git'

import { getGitName, copyFoldersTo } from '../utils/util';
import { readDir, mkTempDir } from '../utils/fileutil';
import { request } from '../utils/request';


// let Git = null;
// try {
//   Git = require('nodegit');
// } catch(err) {
//   log.error('git', 'package nodegit is not available');
//   log.error('git', 'be sure to have the package <nodegit> installed if you want to use git based addons');
// }

const SimpleGit = require('simple-git');

class Commit {
  constructor(com) {
    this.com = com;
  }

  sha() {
    return this.com.hash;
  }
}

class Repo {
  constructor(git) {
    this.git = git;
  }

  getMasterCommit() {
    return new Promise((resolve, reject) => {
      this.git.log((err, log) => {
        if (err)
          return reject(err);
        resolve(new Commit(log.all[0]));
      })
    });
  }
}

const Git = {
  Clone: (repo, localdir) => {
    return new Promise((resolve, reject) => {
      const g = SimpleGit(localdir);
      g.clone(repo, './', (err) => {
        if (err)
          return reject(err);
        resolve(new Repo(g));
      });
    });
  }
}

export class GitAddon {
  constructor() {

  }

  scrapAddonVersion(body) {
    let $ = cheerio.load(body);
    let lastCommit = $('.last-commit').first();
    let a = $('a', lastCommit);
    let commit = a.attr('href').split('/')
    commit = commit[commit.length - 1];
    log.log(loglvl, commit);
    return commit;
  }

  async getDownloadURL(slug, version) {
    if (Git === null) {
      throw "Can't use nodegit because binaries aren't available";
    }
    const re = /git\.tukui\.org/;
    if (re.exec(slug)) {
      const url = slug.split('.git')[0] + '/tree/master';
      log.http('GET', url);
      const [res, body] = await request({ url: url });
      const version = this.scrapAddonVersion(body);
      if (!version) {
        throw 'git :: version scrapped is null';
      }
      return [slug, version];
    } else {
      const folder = await mkTempDir('git');
      const repo = await Git.Clone(slug, folder);
      const commit = await repo.getMasterCommit();
      return [slug, commit.sha()];
    }
  }

  async install(url, addonsDir) {
    if (Git === null) {
      throw "Can't use nodegit because binaries aren't available";
    }
    const gitName = getGitName(url);
    log.log(loglvl, 'git.install', 'git name: ' + gitName);
    const folder = await mkTempDir('git');
    log.log(loglvl, 'git.install.0', 'begin clone ' + gitName + ' into tmp folder');
    const repo = await Git.Clone(url, folder);
    log.log(loglvl, 'git.install.1', 'cloned ' + gitName + ' into tmp folder');
    const commit = await repo.getMasterCommit();
    let version = commit.sha();
    log.log(loglvl, 'git.install.2', 'cloned ' + gitName + ' into tmp folder');

    const listOrigin = await readDir(folder);
    log.log(loglvl, 'git.install', 'examining repo ' + gitName);
    const list = listOrigin.filter(f => (path.basename(f) !== '.git' && path.basename(f) !== '.gitlab'));

    let foundToc = false;
    const listPathJoined = [];
    for (let entry of list) {
      listPathJoined.push(path.join(folder, entry));
      log.log(loglvl, 'entry', entry);
      if (path.extname(entry) == '.toc') {
        foundToc = true;
        log.log(loglvl, 'tocfile found');
      }
    }

    let dest, tmpFolders, folders;
    if (foundToc) {
      log.log(loglvl, 'git.install', 'copying root folder');
      tmpFolders = [folder];
      dest = path.join(addonsDir, gitName);
    } else {
      tmpFolders = listPathJoined;
      dest = addonsDir
    }

    await copyFoldersTo(tmpFolders, dest);
    log.log(loglvl, 'git.install', 'tpmFolder: ' + tmpFolders.join(', '))
    if (foundToc) {
      folders = [gitName];
    } else {
      folders = list;
    }

    if (version && folders) {
      return {
        platform: 'git',
        version: version,
        folders: folders
      }
    }

    // return commit.getTree();
  }
}
