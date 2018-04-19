import Type from '../core/Type'
import {normalizeType} from '../utils/normalize'
import {displayKeyFor, validateLength, validateChars, validateDnsLabel, validateHostname} from '../utils/validate'

const STRING_LIKE_TYPES = [
  'string',
  'date',
  'blob',
  'enum',
  'multiline',
  'masked',
  'password',
  'dnslLabel',
  'hostname',
]

class Resource extends Type {
  intl = {
    t: (key) => key,
  }
  constructor(opt) {
    super(opt)
  }
  toString() {
    let str = `resource:${this.type}`
    const id = this.id
    if (id) {
      str += ':' + id
    }

    return str
  }
  serialize(...args) {
    const data = super.serialize(...args)
    if (this.constructor.mangleOut) {
      return this.constructor.mangleOut(data)
    } else {
      return data
    }
  }
  validationErrors() {
    // const intl = this.intl

    const errors = []
    const originalType = this.type
    if (!originalType) {
      console.warn('No type found to validate', this)
      return []
    }

    const type = normalizeType(originalType)
    const schema = this.store.getById('schema', type)

    if (!schema) {
      console.warn('No schema found to validate', type, this)
      return []
    }

    // this.trimValues()

    const fields = schema.resourceFields || {}
    const keys = Object.keys(fields)
    let field, key, val, displayKey
    for (let i = 0; i < keys.length; i++) {
      key = keys[i]
      field = fields[key]
      val = this[key]
      displayKey = displayKeyFor(type, key, this)

      if (val === undefined) {
        val = null
      }

      if (field.type.indexOf('[') >= 0) {
        // array, map, reference
        // @TODO something...
      } else if (val && typeof val.validationErrors === 'function') {
        // embedded schema type
        console.log(val, 'poi')
        errors.pushObjects(val.validationErrors())
      } else if (field.type === 'float' && typeof val === 'string') {
        // Coerce strings to floats
        val = parseFloat(val) || null
        this[key] = val
      } else if (field.type === 'int' && typeof val === 'string') {
        // Coerce strings to ints
        val = parseInt(val, 10)

        if (isNaN(val)) {
          val = null
        }

        this[key] = val
      }

      if (field.nullable &&
          typeof val === 'string' &&
          val.length === 0 &&
          STRING_LIKE_TYPES.includes(field.type)
      ) {
        val = null
        this[key] = val
      }

      let len = 0
      if (val) {
        len = val.lenth
      }

      if (
        field.required &&
        (
          val === null ||
          (typeof val === 'string' && len === 0) ||
          (Array.isArray(val) && len === 0)
        )
      ) {
        console.log(field, val)
        errors.push(`validation.required ${displayKey}`)
        continue
      }

      validateLength(val, field, displayKey, errors)
      validateChars(val, field, displayKey, errors)
    }

    if (field.type === 'dnslLabel' || field.type === 'hostname') {
      const tolower = (val || '').toLowerCase()
      if (tolower !== val) {
        val = tolower
        this[key] = val
      }

      if (field.type === 'dnslLabel') {
        validateDnsLabel(val, displayKey, errors)
      } else if (field.type === 'hostname') {
        validateHostname(val, displayKey, errors)
      }
    }

    console.log(this, '000000')

    console.log(errors, 'errors')

    return errors
  }

  trimValues(depth=0, seenObjs=[]) {
    this.eachKeys((val, key) => {
      Object.assign(this, {[key]: recurse(val,depth)})
    }, false)

    return this

    function recurse(val, depth) {
      if (depth > 10) {
        return val
      } else if (typeof val === 'string') {
        return val.trim()
      } else if (Array.isArray(val)) {
        val.forEach((v, idx) => {
          var out = recurse(v, depth + 1)
          if (val.objectAt(idx) !== out) {
            val.replace(idx, 1, out)
          }
        })
        return val
      } else if (val && typeof val === 'object') {
        Object.keys(val).forEach(function(key) {
          // Skip keys with dots in them, like container labels
          if (key.indexOf('.') === -1) {
            val[key] = recurse(val[key], depth + 1)
          }
        })
        return val
      } else {
        return val
      }
    }
  }
}

Resource.reopenClass({
  defaultSortBy: '',

  // You can provide an array of link names to always include when retrieving resources of this type
  alwaysInclude: null,

  // You can provide a function here to mangle data before it is passed to
  // store.createRecord() for purposes of evil.
  mangleIn: null,

  // You can provide a function here to mangle data after it
  // is serialized for purposes of even more evil.
  mangleOut: null,
})

export default Resource
