'use strict'

var Transform = require('readable-stream').Transform
var inherits = require('inherits')
var sax = require('sax')

function Element (path, attributes) {
  this.path = new Array(path.length)
  this.text = null
  this.attributes = attributes
  this.children = null

  // fast array clone
  for (var i = 0; i < path.length; i++) {
    this.path[i] = path[i]
  }
}

function createParser (instance, tag) {
  var parser = sax.parser(true, {
    trim: false,
    normalize: false,
    lowercase: true,
    xmlns: false,
    position: false
  })

  var currentPath = []
  var elements = []

  parser.onopentag = function (node) {
    currentPath.push(node.name)

    var parent = elements[elements.length - 1]
    var element

    if (node.name === tag || parent) {
      element = new Element(currentPath, node.attributes)
      if (parent) {
        if (parent.children === null) {
          parent.children = [element]
        } else {
          parent.children.push(element)
        }
      }
      elements.push(element)
    }
  }

  parser.onclosetag = function (tag) {
    currentPath.pop()
    var element = elements.pop()
    if (elements.length === 0 && element) {
      instance.push(element)
    }
  }

  parser.ontext = function (value) {
    var element = elements[elements.length - 1]
    if (element) {
      element.text = value
    }
  }

  parser.oncdata = function (value) {
    var element = elements[elements.length - 1]
    if (element) {
      if (element.text) {
        element.text += value
      } else {
        element.text = value
      }
    }
  }

  parser.onerror = instance.emit.bind(instance, 'error')

  return parser
}

function Saxophonist (tag, opts) {
  if (!(this instanceof Saxophonist)) {
    return new Saxophonist(tag, opts)
  }

  if (typeof tag !== 'string') {
    throw new Error('tag must be a string')
  }

  Transform.call(this, opts)

  // this stream is in object mode for the readable part
  this._readableState.objectMode = true
  this._readableState.highWaterMark = 16

  this._parser = createParser(this, tag)
}

inherits(Saxophonist, Transform)

Saxophonist.prototype._transform = function (chunk, enc, cb) {
  var parser = this._parser
  parser.write(chunk.toString('utf8'))
  cb()
}

module.exports = Saxophonist
