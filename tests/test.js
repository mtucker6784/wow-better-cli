// test.js
'use strict';
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const temp = require('temp').track();

const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const IsNumeric = (n) => {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

const curse = require('../lib/curse.js');
const downloader = require('../lib/downloader.js');
const Wow = require('../lib/wow.js');

const utils = require('../lib/util.js');

const testTimeout = 30*1000;

const makeTmpWowFolder = utils.makeTmpWowFolder;

describe('Curse', function() {
    describe('getDownloadUrl()', function() {

        it('should return the download url of an addon', function(done) {
            this.timeout(testTimeout)
            curse.getDownloadURL('Ace3', null, (err, url, version) => {
                should.not.exist(err);
                should.exist(url);
                should.exist(version);
                const zipRegex = /\.zip/;
                let hasZip = zipRegex.exec(url);

                should.not.equal(null, hasZip);
                should.not.equal(null, version);

                IsNumeric(version).should.equal(true);
                done()
            })
        })

        it('should tell the new version of the addon', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 0,
                            folders: null
                        }
                    }
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkupdate('Ace3', (err, isNew, platform, zipUrl, version) => {
                        should.not.exist(err);
                        isNew.should.equal(true);
                        done()
                    })
                })
            })
        })

        it('should tell addon version is up to date (be sure to update the number ...)', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 924908,
                            folders: null
                        }
                    }
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkupdate('Ace3', (err, isNew, platform, zipUrl, version) => {
                        should.not.exist(err);
                        isNew.should.equal(false);
                        done()
                    })
                })
            })
        })


        it('should tell the new version of multiple addons', function(done) {
            this.timeout(testTimeout)
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                let mockAddonData = {
                    addons: {
                        'Ace3': {
                            platform: 'curse',
                            version: 924908,
                            folders: null
                        },
                        'Auctionator': {
                            platform: 'curse',
                            version: 0,
                            folders: null
                        },
                        'Bagnon': {
                            platform: 'curse',
                            version: 0,
                            folders: null
                        }
                    }
                }
                wow.saveFd.write(mockAddonData, (err) => {
                    should.not.exist(err);
                    wow.checkAllAddonsForUpdate((err, addonsToUpdate) => {
                        should.not.exist(err);
                        addonsToUpdate.length.should.equal(2);
                        done();
                    })
                })
            })
        })
    })
});

describe('downloader', function() {
    describe('downloadZipToTempFile()', function() {
        it('should download the zip of an addon', function(done) {
            this.timeout(testTimeout);
            curse.getDownloadURL('Ace3', null, (err, url, version) => {
                downloader.downloadZipToTempFile(url, (err, path) => {
                    should.not.exist(err);
                    should.exist(path);
                    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        done();
                    });
                })
            })
        })
    })
});

describe('download wow addon into wow folder', function() {
    describe('with curse', function () {
        it('should download an addon, extract it, and place it into the wow interface addons folder', function(done) {
            this.timeout(testTimeout);
            makeTmpWowFolder(function(err, wowPath) {
                should.not.exist(err);
                should.exist(wowPath);

                let wow = new Wow(wowPath, wowPath);
                wow.install('curse', 'Ace3', null, (err) => {
                    should.not.exist(err);
                    fs.access(wow.getSaveFile(), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        done();
                    });
                })
            })
        })

        it('should do as above and delete it', function(done) {
            this.timeout(testTimeout);
            let deleteAddon = (wow) => {
                wow.uninstall('Ace3', (err) => {
                    let Ace3toc = path.join(wow.getAddonsDir(), 'Ace3', 'Ace3.toc');
                    fs.access(Ace3toc, fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.exist(err);
                        err.code.should.equal('ENOENT')
                        done();
                    });
                })
            }

            makeTmpWowFolder(function(err, wowPath) {
                let wow = new Wow(wowPath, wowPath);
                wow.install('curse', 'Ace3', null, (err) => {
                    fs.access(wow.getSaveFile(), fs.constants.R_OK | fs.constants.W_OK, (err) => {
                        should.not.exist(err);
                        deleteAddon(wow);
                    });
                })
            })
        })
    })
})

