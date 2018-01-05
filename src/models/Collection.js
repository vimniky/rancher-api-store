import merge from 'lodash/merge'
import {normalizeType} from '../utils/normalize'

class Collection {
  static repoenClass(opt = {}) {
    Object.entries(opt).forEach(([k, v]) => {
      this[k] = v
    })
  }

  static reservedKeys = ['content']

  constructor(opt) {
    Object.keys(opt).forEach(key => {
      this[key] = opt[key]
    })
  }

  getById(id) {
    const idx = this.content.find(item => {
      return item.id === id
    })
  }

  get first() {
    return this.content[0]
  }

  get last() {
    return this.content[this.content.length - 1]
  }

  getAt(idx) {
    return this.content[idx]
  }

  call(method, ...args) {
    return this.content[method](...args)
  }

  get length() {
    return this.content.length
  }

  toString() {
    return `connection:${this.resourceType}[${this.length()}]`
  }

  request(opt) {
    const type = normalizeType(this.resourceType)
    if (!opt.headers ) {
      opt.headers = {}
    }
    const Model = this.store.modelFor(type)
    if (Model && Model.alwaysInclude) {
      if (!opt.include) {
        opt.include = []
      }
      opt.include.concat(Model.alwaysInclude)
    }

    if (Model && Model.headers) {
      merge(Model.headers, opt.headers)
    }

    return this.store.request(opt)
  }

  depaginate(depth = 1) {
    const self = this
    const promise = new Promise((resolve, reject) => {
      const next = self.pagination && self.pagination.next
      if (next) {
        self.request({
          method: 'GET',
          url: next,
          depaginate: false,
          forPagination: true
        }).then(gotPage, fail)
      } else {
        resolve()
      }
      function gotPage(body) {
        // Depaginate, got page
        self.pagination = body.pagination
        body.content.forEach(function(obj) {
          self.content.push(obj)
        })

        if (next) {
          resolve(self.depaginate(depth+1))
        }
        else {
          // Depaginate, no more pages
          resolve();
        }
      }

      function fail(body) {
        // Depaginate fail
        reject(body)
      }
    })

    return promise
  }
}

export default Collection
