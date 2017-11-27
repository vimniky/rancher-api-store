import Type from '../core/Type'

class Resource extends Type {
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
