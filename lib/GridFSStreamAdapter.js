var
  crypto = require('crypto'),
  path = require('path'),
  _ = require('lodash'),
  mongodb = require('mongodb');

/**
 * Generates an ObjectId from any string.
 * Generates an ObjectId by hashing a string using SHA256 and reducing key size down to
 * 96 bits, so that it can be converted to ObjectId
 * @param str
 * @returns {ObjectID}
 */
function strToId(str) {
  var
    binStr = crypto.createHash('sha256').update(str).digest('binary'),
  // reducing key size down to 12 bytes (96 bit)
    buf = new Buffer(binStr, 'binary').slice(0, 12);
  return mongodb.ObjectID.createFromHexString(buf.toString('hex'));
}

/**
 * GridFS-Stream adapter
 *
 * @param {Grid} gfs GridFS stream object
 * @constructor
 */
var GridFSStreamAdapter = function (gfs) {
  this.gfs = gfs;
};

GridFSStreamAdapter.prototype = {
  __proto__: Object.prototype,

  readStream: function (filePath, options) {
    var id = this._filePathToId(this._normalizeFilePath(filePath));
    options = _.extend(options || {}, {_id: id});
    return this.gfs.createReadStream(options);
  },

  writeStream: function (filePath, options) {
    filePath = this._normalizeFilePath(filePath);
    var
      id = this._filePathToId(filePath),
      dirId = this._filePathToDirectoryId(filePath),
      tags = this._filePathToTags(filePath),
      folders = this._splitPathToFolders(this._dirname(filePath)),
      defaults = {
        _id     : id,
        filename: filePath,
        mode    : 'w',
        metadata: {
          dirId: dirId,
          tags : tags
        }
      };
    // using lodash.merge to deep copy metadata
    options = _.merge(options || {}, defaults);
    // The idea is to create folders in parralel with streaming
    // Each folder is a document inside `fs.folders`, which have only two fields:
    // _id: <folder_path>, parent: <parent_folder_path>s
    this.gfs.db.collection('fs.folders', function (err, collection) {
      //TODO: do not ignore err
      for (var f in folders) {
        //`f` is child folder and `folders[f]` is parent
        // this is kinda like upsert, except in returns error if there is
        // already exists a document with the given id, but we just ignore it.
        //TODO: findAndModify
        //noinspection JSUnfilteredForInLoop
        collection.insert({_id: f, parent: folders[f]}, function () {
          // just ignore errors, we don't care about the result
        });
      }
    });
    return this.gfs.createWriteStream(options);
  },

  remove: function (filePath, callback) {
    var id = this._filePathToId(this._normalizeFilePath(filePath));
    this.gfs.remove({_id: id}, callback);
  },

  listFiles: function (directory, options, callback) {
    var dirId = this._filePathToDirectoryId(this._normalizeFilePath(directory));
    callback = (callback || (options));
//		options = (options === callback ? {} : options);
    return this.files.find({'metadata.dirId': dirId}, options, callback);
  },

  listSubFolders: function (directory, options, callback) {
    directory = this._dirname(this._normalizeFilePath(directory));
    callback = (callback || (options));
    return this.gfs.db.collection('fs.folders').find({parent: directory}, options, callback);
  },

  _normalizeFilePath: function (filePath) {
    var n = path.normalize(filePath);
    if (n[0] !== '/') {
      n = '/' + n;
    }
    return n;
  },

  _dirname: function (filePath) {
    // check if we already have a directory
    if (filePath[filePath.length - 1] !== '/') {
      return path.dirname(filePath) + '/';
    }
    return filePath;
  },

  _filePathToId: function (filePath) {
    return strToId(filePath);
  },

  _filePathToDirectoryId: function (filePath) {
    return strToId(this._dirname(filePath));
  },

  _filePathToTags: function (filePath) {
    var tags = filePath.split('/');
    // if the first element is '' remove it
    tags = (tags[0] === '' ? tags.splice(1) : tags);
    return tags;
  },

  _splitPathToFolders: function (filePath) {
    var
      segments = filePath.split('/'),
      parent = '/',
      res = {},
      segment,
      s;
    for (s in segments) {
      segment = segments[s];
      if (segment === '') continue;
      res[parent + segment] = parent;
      parent = parent + segment + '/';
    }
    return res;
  }
};

Object.defineProperty(GridFSStreamAdapter.prototype, 'files', {
  get: function () {
    return this.gfs.files;
  }
});

module.exports = GridFSStreamAdapter;