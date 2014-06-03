var through = require('through');
var innersource = require('innersource');
var detective = require('detective');
var combine = require('combine-source-map');

var addRequireSource = innersource(addRequire);
var addModuleSource = innersource(addModule);

function addRequire(){
  var global = (function(){return this;}).call(null);
  if (!global.require) {
    global.require = function require(key){
      return global.require[key.replace(/\\/g, '/')]
    };
  }
}

function addModule(){
  var global = (function(){ return this; }).call(null);
  if (typeof __filename !== 'undefined') {
    // Strip the extension from the filename.
    var filenameWithoutExt =  __filename.slice(0, __filename.lastIndexOf('.'));
    var moduleName = filenameWithoutExt.replace(/\\/g, '/');
    global.require[moduleName] = module.exports;
  }
}

function getRequires(source) {
  var requires = detective(source);
  return requires.map(function(require){
    require = require.replace(/\\/g, '/');
    if (require[0] !== '.') {
      // Handle node module requires here.
      return ";var global=(function(){return this;}).call(null);global.require['"+require+"']=require('"+require+"');";
    } else {
      return '';
    }
  }).join('');
}

module.exports = function(filename) {
  var buffer = '';

  return through(function(chunk) {
    buffer += chunk.toString();
  }, function() {
    var header = addRequireSource + getRequires(buffer);
    var headerOffset = header.split('\n').length + 1;
    var source = header + ';\n' + buffer +';\n' + addModuleSource;

    var map = combine.create().addFile({
      sourceFile: filename, source: source
    }, {line: headerOffset});

    this.queue(source + '\n' + map.comment())
    this.queue(null);
  });
};

      // Resolve local file relative to "filename".
