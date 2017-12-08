import merge from 'lodash/merge'
import Serializable from './Serializable'
import {normalizeType} from '../utils/normalize'
import urlOptions from '../utils/urlOptions'

class Type extends Serializable {
  static reopenClass(opt = {}) {
    Object.entries(opt).forEach(([k, v]) => {
      this[k] = v
    })
  }
  constructor(input = {}) {
    super()
    Object.entries(input).forEach(([key, value]) => {
      this[key] = value
    })
    this.schema = null
  }

  toString() {
    return '[Generic type class]'
  }

  getSchema() {
    return this.store.getById('schema', this.type);
  }
  optionsFor(field) {
    const s = this.getSchema()
    if (!s) {
      return []
    }
    return s.optionsFor(field)
  }

  getDefault(field) {
    const s = this.getSchema()
    if (!s) {
      return []
    }
    return s.getDefault(field)
  }

  isRequired(field) {
    const s = this.getSchema()
    if (!s) {
      return []
    }
    return s.isRequired(field)
  }

  // unionArrays=true will append the new values to the existing ones instead of overwriting.
  merge(newData, unionArrays) {
    newData.eachKeys((v, k) => {
      if (newData.hasOwnProperty(k)) {
        const curVal = this[k]
        if (unionArrays && Array.isArray(curVal) && Array.isArray(v) ) {
          curVal.concat(v)
        } else {
          this[k] = v
        }
      }
    })

    return this
  }

  replaceWith(newData) {
    // Add/replace values that are in newData
    newData.eachKeys((v, k) => {
      this[k] = v
    })

    // Remove values that are in current but not new.
    const newKeys = newData.allKeys()
    this.eachKeys((v, k) => {
      // If the key is a valid link name and
      if (newKeys.indexOf(k) === -1 && !this.hasLink(k)) {
        this[k] = undefined
      }
    });

    return this
  }

  clone() {
    const store = this.store
    const output = store.createRecord(
      JSON.parse(JSON.stringify(this.serialize())),
      {updateStore: false}
    )
    return output
  }

  linkFor(name) {
    return this.links[name]
  }

  hasLink(name) {
    return !!this.linkFor(name)
  }

  actionFor(name) {
    return this.actions[name]
  }

  hasAction(name) {
    return !!this.actionFor(name)
  }

  pageFor(name) {
    return this.pagination[name]
  }

  request(opt) {
    if (!opt.headers) {
      opt.headers = {}
    }
    const headers = {}
    merge(headers, this.constructor.headers, opt.headers)
    return this.store.request({...opt, headers})
  }

  followPagination(name) {
    const url = this.pageFor(name);

    if (!url) {
      throw new Error('Unknown link')
    }

    return this.request({
      method: 'GET',
      url: url,
      depaginate: false,
    })
  }

  followLink(name, opt = {}) {
    let url = this.linkFor(name)

    if (!url) {
      throw new Error('Unknown link')
    }

    url = urlOptions(url, opt, this.constructor)

    return this.request({
      method: 'GET',
      url,
    })
  }

  importLink(name, opt = {}) {
    const self = this

    return new Promise(function(resolve,reject) {
      self.followLink(name, opt).then(function(data) {
        self[opt.as || name] =  data
        resolve(self)
      }).catch(function(err) {
        reject(err)
      })
    })
  }

  doAction(name, opt = {}) {
    if (name === 'delete' || name === 'remove') {
      return this.delete(opt)
    }

    const url = this.actionFor(name);
    if (!url) {
      return Promise.reject(new Error(`Unknown action: ${name}`))
    }

    opt.method = 'POST'
    opt.url = opt.url || url

    // Note: The response object may or may not be this same object, depending on what the action returns.
    return this.request(opt)
  }

  save(opt = {}) {
    const self = this
    const store = this.store

    const id = this.id
    const type = normalizeType(this.type)
    if (id) {
      // Update
      opt.method = opt.method || 'PUT'
      opt.url = opt.url || this.linkFor('self')
    } else {
      // Create
      if (!type) {
        return Promise.reject(new Error('Cannot create record without a type'));
      }

      opt.method = opt.method || 'POST'
      opt.url = opt.url || type
    }

    const json = this.serialize()
    // Don't send included link maps/arrays
    Object.keys(json.links || {}).forEach((k) => {
      delete json[k]
    })
    delete json['links']
    delete json['actions']

    if (typeof opt.data === 'undefined') {
      opt.data = json
    }

    return this.request(opt).then(function(newData) {
      if (!newData) {
        return newData
      }

      const newId = newData.id
      const newType = normalizeType(newData.type)
      if (!id && newId && type === newType) {
        // A new record was created.  Typeify will have put it into the store,
        // but it's not the same instance as this object.  So we need to fix that.
        self.merge(newData)
        let existing = store.getById(type, newId)
        if (existing) {
          store._remove(type, existing)
        }
        store._add(type, self)

        // And also for the base type
        let baseType = self.baseType
        if (baseType) {
          baseType = normalizeType(baseType)
          if (baseType !== type) {
            existing = store.getById(baseType,newId)
            if (existing) {
              store._remove(baseType, existing)
            }
            store._add(baseType, self)
          }
        }
      }

      return self
    })
  }
  delete(opt = {}) {
    const self = this;
    const store = this.store
    const type = this.type

    opt.method = 'DELETE'
    opt.url = opt.url || this.linkFor('self')

    return this.request(opt).then(function(newData) {
      if (store.removeAfterDelete || opt.forceRemove) {
        store._remove(type, self)
      }
      return newData
    })
  }
  reload(opt = {}) {
    if (!this.hasLink('self')) {
      return Promise.reject('Resource has no self link');
    }

    let url = this.linkFor('self')
    if (this.constructor && this.constructor.alwaysInclude) {
      this.constructor.alwaysInclude.forEach(function(key) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + 'include=' + encodeURIComponent(key)
      })
    }
    if (!'undefined') {
      opt.method = 'GET'
    }

    if (!opt.url) {
      opt.url = url
    }

    const self = this
    return this.request(opt).then(function(/*newData*/) {
      return self
    })
  }

  isInStore() {
    const store = this.store
    return store && this.id && this.type && store.hasRecord(this)
  }
}

export default Type
