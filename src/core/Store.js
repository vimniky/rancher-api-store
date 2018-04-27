import merge from 'lodash/merge'
import Serializable from './Serializable'
import {normalizeType} from '../utils/normalize'
import urlOptions from '../utils/urlOptions'
import createHttp from '../utils/createHttp'

// build-in Models
import Resource  from '../models/Resource'
import Error  from '../models/Error'
import Schema  from '../models/Schema'
import Collection  from '../models/Collection'


export const defaultMetaKeys = [
  'type',
  'actions',
  'createDefaults',
  'createTypes',
  'filters',
  'links',
  'pagination',
  'resourceType',
  'sort',
  'sortLinks',
]

export const neverMissing = [
  'error',
]

const PREFIX = 'store'
let count = 0

class Store {
  static __stores = {}
  static headers = {}

  constructor(name, opt) {
    if (typeof name ==='string') {
      const catchedStore = Store.__stores[name]
      if(catchedStore) {
        return catchedStore
      }
    } else {
      if (typeof opt === 'undefined') {
        opt = name || {}
      }
      name = `${PREFIX}-${count++}`
    }

    opt = opt || {}

    Store.__stores[name] = this

    let {http, ...rest} = opt

    this.header = {}

    Object.entries(rest).forEach(([k, v]) => {
      this[k] = v
    })

    if (!http) {
      http = createHttp()
    }

    this.http = http

    if (!this.neverMissing) {
      this.neverMissing = neverMissing.slice()
    }

    // Registering build-in Models
    this.registerModel('schema', Schema)
    this.registerModel('resource', Resource)
    this.registerModel('collection', Collection)
    this.registerModel('error', Error)

    this._state = {
      cache: {},
      cacheMap: {},
      foundAll: {},
      findQueue: {},
      missingMap: {},
    }
  }

  modelFor(type) {
    if (!this._modelMap) {
      this._modelMap = {}
    }
    let Model = this._modelMap[type]
    if (!Model) {
      console.log(`model for [${type}] not found, fallback to resource model`)
      Model = this.modelFor('resource')
    }
    this._modelMap[type] = Model
    return Model
  }

  registerModel(type, model) {
    if (!this._modelMap) {
      this._modelMap = {}
    }

    if (typeof type === 'string') {
      this._modelMap[type] = model
      return
    }

    if (typeof type === 'object') {
      Object.entries(type).map(([k, v]) => {
        this._modelMap[k] = v
      })
      return
    }
  }

  replaceModel(type, model) {
    this._modelMap[type] = model
    return this
  }

  unRegisterModel(type) {
    const modelMap = this._modelMap
    if (typeof type === 'string') {
      modelMap[type] = null
    }
    if (Array.isArray(type)) {
      type.forEach(t => {
        modelMap[t] = null
      })
    }
  }

  getById(type, id) {
    type = normalizeType(type)
    const group = this._groupMap(type)
    return group[id]
  }

  // Synchronously returns whether record for [type] and [id] is in the local cache.
  hasRecordFor(type, id) {
    return !!this.getById(type, id)
  }

  // Synchronously returns whether this exact record object is in the local cache
  hasRecord(obj) {
    if (!obj) return false
    const type = normalizeType(obj.type)
    const group = this._groupMap(type)
    return group[obj.id] === obj
  }

  haveAll(type) {
    type = normalizeType(type)
    return this._state.foundAll[type]
  }

  // Returns a 'live' array of all records of [type] in the cache.
  all(type) {
    type = normalizeType(type)
    return this._group(type)
  }

  // find(type) && return all(type)
  findAll(type, opt = {}) {
    type = normalizeType(type)
    if (this.haveAll(type) && opt.forceReload !== true) {
      // already cached
      return Promise.resolve(this.all(type));
    } else {
      return this.find(type, undefined, opt).then(() => this.all(type))
    }
  }

  // Get the cache array group for [type]
  _group(type) {
    type = normalizeType(type)
    const cache = this._state.cache
    let group = cache[type]
    if (!group) {
      group = []
      cache[type] = group
    }
    return group
  }

  // Get the cache map group for [type]
  _groupMap(type) {
    type = normalizeType(type)
    const cache = this._state.cacheMap
    let group = cache[type]
    if (!group) {
      group = {}
      cache[type] = group
    }
    return group
  }

  // Handle missing records in denormalized arrays
  // Get the cache map missing for [type]
  _missingMap(type) {
    type = normalizeType(type)
    const cache = this._state.missingMap
    let group = cache[type]
    if (!group) {
      group = {}
      cache[type] = group
    }
    return group
  }

  _missing(type, id, dependent, key) {
    type = normalizeType(type)
    const missingMap = this._missingMap(type)
    let entries = missingMap[id]
    if (!entries) {
      entries = []
      missingMap[id] = entries
    }
    entries.push({o: dependent, k: key})
  }

  _notifyMissing(type, id) {
    const missingMap = this._missingMap(type)
    const entries = missingMap[id]
    // todo
    if (entries) {
      entries.forEach((entry) => {
        entry.o.notifyPropertyChange(entry.k)
      })
      entries.clear()
    }
  }

  // Add a record instance of [type] to cache
  _add(type, obj) {
    type = normalizeType(type)
    const group = this._group(type)
    const groupMap = this._groupMap(type)
    group.push(obj)
    groupMap[obj.id] = obj

    if (obj.wasAdded && typeof obj.wasAdded === 'function') {
      obj.wasAdded()
    }
  }

  // Add a lot of instances of the same type quickly.
  //  - There must be a model for the type already defined.
  //  - Instances cannot contain any nested other types (e.g. include or subtypes),
  //     (they will not be deserialzed into their correct type.)
  //  - wasAdded hooks are not called
  //  - Basically this is just for loading schemas faster.
  _bulkAdd(type, pojos) {
    type = normalizeType(type)
    const group = this._group(type)
    const groupMap = this._groupMap(type)
    const Model = this.modelFor(type)
    group.concat(pojos.map(input=>  {
      // Schemas are special
      if (type === 'schema') {
        input._id = input.id
        input.id = normalizeType(input.id)
      }
      const obj =  new Model(input)
      groupMap[obj.id] = obj
      return obj
    }))
  }

  // Remove a record of [type] from cache, given the id or the record instance.
  _remove(type, obj) {
    type = normalizeType(type)
    const group = this._group(type)
    const groupMap = this._groupMap(type)
    const idx = group.indexOf(obj);
    if (idx !== -1) {
      group.splice(idx, 1);
    }
    delete groupMap[obj.id]
    if (obj.wasRemoved && typeof obj.wasRemoved === 'function') {
      obj.wasRemoved()
    }
  }

  isCacheable(opt) {
    return !opt || (opt.depaginate && !opt.filter && !opt.include);
  }

  // Forget about all the resources that hae been previously remembered.
  reset() {
    const cache = this._state.cache
    if (cache) {
      Object.keys(cache).forEach(key => {
        if (cache[key] && cache[key].clear) {
          cache[key].clear();
        }
      })
    } else {
      this._state.cache = {}
    }

    const foundAll = this._state.foundAll
    if (foundAll) {
      Object.keys(foundAll).forEach(key => {
        foundAll[key] = false
      })
    } else {
      this._state.foundAll = {}
    }
    this._state.cacheMap = {}
    this._state.findQueue = {}
    this._state.missingMap = {}
  }

  resetType(type) {
    type = normalizeType(type)
    const group = this._group(type)
    this._state.foundAll[type] = false
    this._state.cacheMap[type] = {}
    group.clear()
  }

  // Asynchronous, returns promise.
  // find(type[,null, opt]): Query API for all records of [type]
  // find(type,id[,opt]): Query API for record [id] of [type]
  // opt:
  //  filter: Filter by fields, e.g. {field: value, anotherField: anotherValue} (default: none)
  //  include: Include link information, e.g. ['link', 'anotherLink'] (default: none)
  //  forceReload: Ask the server even if the type+id is already in cache. (default: false)
  //  limit: Number of records to return per page (default: 1000)
  //  depaginate: If the response is paginated, retrieve all the pages. (default: true)
  //  headers: Headers to send in the request (default: none).  Also includes ones specified in the model constructor.
  //  url: Use this specific URL instead of looking up the URL for the type/id.  This should only be used for bootstrap
  find(type, id, opt = {}) {
    type = normalizeType(type)
    opt.depaginate = opt.depaginate !== false
    if (!id && !opt.limit) {
      opt.limit = this.defaultPageSize
    }
    if (!type) {
      return Promise.reject('type not specified')
    }

    // If this is a request for all of the items of [type], then we'll remember that and not ask again for a subsequent request
    const isCacheable = this.isCacheable(opt)
    opt.isForAll = !id && isCacheable
    // See if we already have this resource, unless forceReload is on.
    if (opt.forceReload !== true) {
      if (opt.isForAll && this._state.foundAll[type]) {
        return Promise.resolve(this.all(type))
      } else if (isCacheable && id) {
        const existing = this.getById(type, id)
        if (existing) {
          return Promise.resolve(existing)
        }
      }
    }
    // If URL is explicitly given, go straight to making the request.
    // This is used for bootstraping to load the schema initially, and shouldn't be used for much else.
    if (opt.url) {
      return this._findWithUrl(opt.url, type, opt)
    } else {
      // Otherwise lookup the schema for the type and generate the URL based on it.
      return this
        .find('schema', type, {url: `schemas/${encodeURIComponent(type)}`})
        .then(schema => {
          const url = schema.linkFor('collection') + (id ? '/' + encodeURIComponent(id) : '')
          return this._findWithUrl(url, type, opt)
        })
    }
  }

  _headers(perRequest) {
    const out = {
      'Accept': 'application/json',
      'Content-type': 'application/json',
    }
    merge(out, Store.headers, this.headers, perRequest)
    return out
  }

  rawRequest(opt) {
    opt.headers = this._headers(opt.headers)
    if (opt.data) {
      if (opt.data instanceof Serializable) {
        opt.data = JSON.stringify(opt.data.serialize())
      } else if (typeof opt.data === 'object') {
        opt.data = JSON.stringify(opt.data)
      }
    }

    const baseURL = opt.baseURL || this.baseURL || Store.baseURL

    if (baseURL) {
      opt.baseURL = baseURL
    }

    return this.http.request(opt)
  }

  _requestSuccess(response, opt) {
    // 204 not content
    if (response.status === 204) {
      return
    }
    if (response.data && typeof response.data === 'object') {
      response = this._typeify(response.data)

      Object.defineProperty(response, 'response', {value: response, configurable: true})

      // Note which keys were included in each object
      if (opt.include && opt.include.length && response.forEach) {
        response.forEach((obj) => {
          obj.includedKeys = obj.includedKeys || []
          obj.includedKeys.concat(opt.include.slice())
          obj.includedKeys = obj.includedKeys.uniq()
        })
      }

      // Depaginate
      if (opt.depaginate && typeof response.depaginate === 'function') {
        return response.depaginate().then(() => {
          return response
        }).catch((response) => {
          return this._requestFailed(response, opt)
        })
      } else {
        return response
      }
    } else {
      return response.data
    }
  }

  _requestFailed(error, opt = {}) {
    let data
    if (!error.data) {
      data = {
        status: error.status,
        message: error.err,
        detail: (opt.method || 'GET') + ' ' + opt.url,
      }
      return finish(data)
    } else if (error.data && typeof error.data === 'object' ) {
      const out = finish(this._typeify(error.data))
      return out
    } else {
      data = {
        status: error.status,
        message: error.data,
      }
      return finish(data)
    }

    function finish(data) {
      delete error.data;
      Object.defineProperty(data, 'error', {value: error, configurable: true});
      return Promise.reject(data);
    }
  }

  // Makes an AJAX request that resolves to a resource model
  request(opt) {
    opt.depaginate = opt.depaginate !== false

    if (this.mungeRequest) {
      opt = this.mungeRequest(opt)
    }

    return this.rawRequest(opt).then(res => {
      return this._requestSuccess(res, opt)
    }).catch(error => {
      return this._requestFailed(error, opt)
    })
  }

  _findWithUrl(url, type, opt) {
    const queue = this._state.findQueue
    const Model = this.modelFor(type)
    url = urlOptions(url, opt, Model)

    // Collect Headers
    const newHeaders = {}
    if (Model && Model.headers) {
      merge(newHeaders, Model.headers)
    }
    merge(newHeaders, opt.headers)
    // End: Collect headers

    let later
    const queueKey = JSON.stringify(newHeaders) + url

    // check to see if the request is in the findQueue
    if (queue[queueKey]) {
      // get the filterd promise object
      const filteredPromise = queue[queueKey]
      const defer = {}
      defer.promise = new Promise(function(resolve, reject) {
        defer.resolve = resolve
        defer.reject = reject
      })
      filteredPromise.push(defer)
      later = defer.promise
    } else { // request is not in the findQueue
      opt.url = url
      opt.headers = newHeaders
      later = this.request(opt).then((result) => {
        if (opt.isForAll) {
          this._state.foundAll[type] = true

          // todo what is removeMissing ?
          if (opt.removeMissing && result.type === 'collection') {
            const all = this._group(type)
            const toRemove = []
            all.forEach(obj => {
              if (!result.includes(obj)) {
                toRemove.push(obj)
              }
            })

            toRemove.forEach((obj) => {
              this._remove(type, obj)
            })
          }
        }
        this._finishFind(queueKey, result, 'resolve')
        return result
      }/*, reason => {
        this._finishFind(queueKey, reason, 'reject')
        return Promise.reject(reason)
      }*/)
      // set the queue array to empty indicating we've had 1 promise already
      queue[queueKey] = []
    }
    return later
  }

  _finishFind(key, result, action) {
    const queue = this._state.findQueue
    const promises = queue[key]

    if (promises) {
      while (promises.length) {
        if (action === 'resolve') {
          promises.pop().resolve(result)
        } else if (action === 'reject') {
          promises.pop().reject(result)
        }
      }
    }
    delete queue[key]
  }

  // Create a collection: {key: 'data'}
  createCollection(input, opt) {
    const dataKey = (opt && opt.key ? opt.key : 'data')
    const Model = this.modelFor('collection')
    const content = input[dataKey].map(x => this._typeify(x, opt))
    const output = new Model({content})

    Object.defineProperty(output, 'store', {value: this, configurable: true})
    // todo, should be this.metaKeys
    defaultMetaKeys.forEach(key => {
      output[key] = input[key]
    })
    return output
  }

  // Create a record: {applyDefaults: false}
  createRecord(data, opt = {}) {
    const type = normalizeType(opt.type || data.type)
    if (!type) {
      throw new Error('Missing type:  can not create record without a type')
    }

    const schema = this.getById('schema', type)
    let input = data
    if (opt.applyDefaults !== false && schema) {
      input = schema.getCreateDefaults(data)
    }

    const Model = this.modelFor(type)
    if ( Model.mangleIn && typeof Model.mangleIn === 'function' ) {
      input = Model.mangleIn(input, this)
    }

    if (schema) {
      const fields = schema.typeifyFields
      for (let i = fields.length-1; i >= 0; i--) {
        const k = fields[i]
        if (input[k]) {
          input[k] = this._typeify(input[k], opt)
        }
      }
    }
    const output = new Model(input)
    Object.defineProperty(output, 'store', {enumerable: false, value: this, configurable: true})
    return output
  }

  // Turn a POJO into a Model: {updateStore: true}
  _typeify(input, opt = null) {
    if ( !input || typeof input !== 'object') {
      // Simple values can just be returned
      return input
    }
    if (!opt) {
      opt = {applyDefaults: false}
    }
    let type = input.type
    type = normalizeType(type)
    if (Array.isArray(input) ) {
      // Recurse over arrays
      return input.map(x => this._typeify(x, opt))
    }

    if (type === 'collection') {
      return this.createCollection(input, opt)
    } else if (!type) {
      return input
    }

    const rec = this.createRecord(input, opt)
    if (!input.id || opt.updateStore === false) {
      return rec
    }

    // This must be after createRecord so that mangleIn() can change the baseType
    let baseType = rec.baseType
    if (baseType) {
      baseType = normalizeType(baseType)

      // Only use baseType if it's different from type
      if (baseType === type) {
        baseType = null
      }
    }

    let out = rec
    const cacheEntry = this.getById(type, rec.id)
    let baseCacheEntry
    if (baseType) {
      baseCacheEntry = this.getById(baseType, rec.id)
    }
    if (cacheEntry) {
      cacheEntry.replaceWith(rec)
      out = cacheEntry
    } else {
      this._add(type, rec)
      if (baseType) {
        this._add(baseType, rec)
      }
    }
    if (type && !this.neverMissing.includes(type)) {
      this._notifyMissing(type, rec.id)
      if (baseType && !this.neverMissing.includes(type)) {
        this._notifyMissing(baseType, rec.id)
      }
    }
    return out
  }
}

export default Store
