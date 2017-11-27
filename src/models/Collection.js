import TypeMixin from '../Type'
import {copyHeaders} from '../utils/applyHeaders'
import {normalizeType} from '../utils/normalize'

class Collection {
  static repoenClass(opt = {}) {
    Object.entries(opt).forEach(([k, v]) => {
      this[k] = v
    })
  }

  constructor(opt) {
    Object.keys(opt).forEach(key => {
      this[key] = opt[key]
    })
    this.reservedKeys =  ['content']
  }

  getById(id) {
    const idx = this.content.find(item => {
      return item.id === id
    })
  }

  getAt(idx) {
    return this.content[idx]
  }

  call(method, ...args) {
    return this.content[method](...args)
  }

  length() {
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
    const cls = this.store.modelFor(type)
    if (cls && cls.constructor.alwaysInclude) {
      if (!opt.include) {
        opt.include = []
      }
      opt.include.concat(cls.constructor.alwaysInclude)
    }

    if (cls && cls.constructor.headers) {
      copyHeaders(cls.constructor.headers, opt.headers)
    }

    return this.store.request(opt)
  }

  depaginate(depth = 1) {
    const self = this
    const promise = new Promise((resolve, reject) => {
      const next = self.pagination.next
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
        body.forEach(function(obj) {
          self.push(obj)
        })

        if (self.pagination.next) {
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
