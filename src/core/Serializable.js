const reservedKeys = [
  'reservedKeys',
  'includedKeys',
  'store',
]

class Serializable {
  serialize(depth = 0) {
    let output
    if (depth > 10) {
      return null
    }

    if (Array.isArray(this)) {
      output = this.map((item) => {
        return recurse(item, depth+1)
      })
    }
    else {
      output = {}
      this.eachKeys((v,k) => {
        output[k] = recurse(v,depth+1)
      })
    }

    return output

    function recurse(obj, depth = 0) {
      if (depth > 10) {
        return null
      }

      if (Array.isArray(obj)) {
        return obj.map(item => {
          return recurse(item, depth+1)
        })
      }
      else if (obj instanceof Serializable) {
        return obj.serialize(depth+1)
      }
      else if (obj && typeof obj === 'object') {
        const out = {}
        const keys = Object.keys(obj)
        keys.forEach(function(k) {
          out[k] = recurse(obj[k], depth+1)
        })
        return out
      } else {
        return obj
      }
    }
  }

  allKeys(withIncludes) {

    const reserved = [
      ...reservedKeys,
      ...(this.constructor.reservedKeys || []),
      ...(this.reservedKeys || [])
    ]

    let alwaysIncluded = []
    if (withIncludes === false) {
      alwaysIncluded = this.constructor.alwaysInclude || []
    }

    const thisIncluded = this.includedKeys || []

    const out = Object.keys(this).filter(k => {
      return k.charAt(0) !== '_' &&
        reserved.indexOf(k) === -1 &&
        alwaysIncluded.indexOf(k) === -1 &&
        thisIncluded.indexOf(k) === -1 &&
        typeof this[k] !== 'function'
    })

    return out
  }

  eachKeys(fn, withIncludes) {
    this.allKeys(withIncludes).forEach(k => {
      fn.call(this, this[k], k)
    })
  }
}

export default Serializable
