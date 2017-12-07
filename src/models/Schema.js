import Resource from './Resource'
import {normalizeType} from '../utils/normalize'

export const SCHEMA = {
  SIMPLE: [
    'string',
    'password',
    'masked',
    'multiline',
    'float',
    'int',
    'date',
    'blob',
    'boolean',
    'enum',
    'reference',
    'json',
  ],
  NESTED: [
    'array',
    'map',
  ],
}

function parseType(type) {
  return type.replace(/]/g, '').split('[')
}

class Schema extends Resource {
  static create(input) {
  }
  constructor(...args) {
    super(...args)
  }
  getFieldNames() {
    return Object.keys(this.resourceFields)
  }

  typeifyFields() {
    // Schemas are special..
    if (this.id === 'schema') {
      return []
    }

    const fields = this.resourceFields
    const keys = Object.keys(fields)

    const out = keys.filter(k => {
      let parts = parseType(fields[k].type)
      for (let i = 0; i < parts.length; i++ ) {
        if (SCHEMA.SIMPLE.includes(parts[i])) {
          return false
        }
      }

      return true
    })

    out.concat(this.includeableLinks || [])
    return out
  }

  getDefault(field) {
    return this.resourceFields[field] && this.resourceFields[field]['default']
  }

  isRequired(field) {
    return this.resourceFields[field] && this.resourceFields[field]['required']
  }

  getCreateDefaults(more) {
    const out = {}
    const fields = this.resourceFields

    Object.keys(fields).forEach(key => {
      const field = fields[key]
      const def = field['default']

      if (field.create && def !== null) {
        if (typeof def !== 'undefined') {
          out[key] = JSON.parse(JSON.stringify(def))
        }
      }
    })

    if (more) {
      Object.keys(more).forEach(key => {
        out[key] = more[key]
      })
    }
    return out
  }

  optionsFor(field) {
    const obj = this.resourceFields[field]
    if (obj && obj.options) {
      return (obj.options||[]).slice()
    }
    return []
  }

  typesFor(fieldName) {
    const field = this.resourceFields[fieldName]
    if (!field || !field.type) {
      return []
    }

    return field.type.replace(/\]/g, '').split('[')
  }

  primaryTypeFor(field) {
    const types = this.typesFor(field)
    if (types) {
      return types[0]
    }
    return null
  }

  subTypeFor(field) {
    const types = this.typesFor(field)
    if (types.length < 2 ) {
      return null;
    } else if ( types.length === 2 ) {
      return types[1]
    } else {
      let out = types[types.length-1]
      for (let i = types.length - 2; i >= 1; i--) {
        out = `${types[i]}[${out}]`
      }
      return out
    }
  }

  referencedTypeFor(field) {
    const obj = this.resourceFields[field]
    const type = obj.type;
    const match = type.match(/^reference\[([^\]]*)\]$/)
    if ( match ) {
      return match[1];
    }
    return null
  }
}

Schema.reopenClass({
  mangleIn(data) {
    // Pass IDs through the type normalizer so they will match the case in other places like store.find('schema',normalizeType('thing'))
    data._id = data.id
    data.id = normalizeType(data.id)
    return data
  },
})

export default Schema
