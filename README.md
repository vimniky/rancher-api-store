Rancher API Store
===============

Storage adapter to [compatible APIs](http://github.com/rancher/api-spec).

## Usage

**Installation**

```bash
  npm install rancher-api-store
```

This assumes that you’re using npm package manager with a module bundler like Webpack or Browserify to consume CommonJS modules.

If you don’t yet use npm or a modern module bundler, and would rather prefer a single-file UMD build that makes apiStore available as a global object.

**Import**

- ES6 module

```js
import {Store, Resource} from 'rancher-api-store'

```

- CommonJS

```js
const {Store, Resource} = require('rancher-api-store')

```


- Browser global

```html
  <script src="path/to/rancher-api-store/dist/index.js" ></script>
  
  <script>
  	console.log(apiStore.Store)
  </script>
```

**Develope**

```bash
  git clone git@github.com:vimniky/rancher-api-store.git
  cd rancher-api-store && npm install
  npm run dev

  # link
  cd rancher-api-store && npm link
  cd your-project && npm link rancher-api-store
```

**Build**

```bash
npm run build
```


**Getting started**

```javascript

import {Store} from 'rancher-api-store'

const store = new Store()

yourStore.find('container').then(container => {
  console.log(container)
})

```

**Advanced**

```javascript

// models/Container.js
import {Resource, Store} from 'rancher-api-store'

// `Container` Model Should extend from the build-in `Resource` Model
class Container extends Resource {
  constructor(...args) {
    super(...args)
    // ....
  }
  doSomething() {
  	// ...
  }
}

// stores.js
import {Store} from 'rancher-api-store'

const store = new Store('userStore', {
  baseUrl: '/v2-bata',
  
  // whether schemas should be loaded upon store niitalization
  loadSchemas: true, // default is false
})

store.registerModel('container', Container)

// If the `Container` Model is registered,
// it will be used to create the corresponding instances,
// if not a, fallback build-in `Resource` Model will be used behind the scenes.
store.find('container').then(container => {
	container.doSomething()
})

```

## API

### Store

The store performs all communication with the API service and maintains a single copy of all the resources that come back from it.  This ensures that changes to a resource in one place propagate propertly to other parts of your application that use the same resource.


**Methods:**

* `constructor([name] [,opt]):` `name` and `opt` are optional. basically, it is use to prevent from creating multiply store instance with the same name, if not passed, a uniq name will be generated every time your invoke `new Store()`.  `opt` are use to configure the created store instance's behavior.

* `find(type [,id] [,options])`: Query API for records of `type`, optionally with `id` and other `options` like `filter` and `include`.  Returns a promise.

* `getById(type, id)`: Get a record from the local cache by `type` and `id`.  Returns a resource or undefined synchronously.

* `hasRecordFor(type, id)`: Returns true if a record for `type` and `id` exists in cache synchronously.

* `all(type)`: Returns a "live" array of all the records for [type] in the store.  The array will be updated as records are added and removed from the store.

* `findAll(type)`: Calls `find(type)` if it hasn't been called before, then returns `all(type)` to give you back a live list of all the records in one call.  Convenient for a model hook.

* `createRecord(data)`: Create a record given fields `data`.  Returns a `Resource`.  Does **not** add the record to the store, call `resource.save()` on the response or `\_add()` on the store.

**More methods, that you shouldn't need often:**

* `_add(type, obj)`: Add a record to the store.  This is normally done automatically when reading objects, but you might have created one with `createRecord` manually want it added without `resource.save()`.

* `_remove(type, obj)`: Remove a record from the store.  This doesn't tell the server about it, so you probably want `resource.delete()`.

* `_bulkAdd(type, array)`: add a lot of instances of the same type at once.

  - There must be a model for the type already defined.
  - Instances cannot contain any nested other types (e.g. include or subtypes),
  - (they will not be deserialzed into their correct type.)
  - wasAdded hooks are not called
  - Basically this is just for loading schemas faster.

**Properties:**

* `removeAfterDelete: true`: Set to false to disable automatically removing from the store after `record.delete()`.  You might want this if your API has a 2-step deleted vs purged state.

### Resource
A resource is a model object representing a single resource in the API.

**Methods:**

* `.merge(data)`: Take the values in `data` and replace the corresponding values in this resource with them.  Returns the resource so you can chain calls.
* `.replaceWith(data)`: Replace all the values in this resource with the ones in `newData`.  Returns the resource so you can chain calls.
* `.clone()`: Returns a duplicate of this resource.  Changes to the clone will not initially affect the original.  If `.save()` is called on the clone, the response data will be merged into both the clone and original.
* `.hasLink(name)`: Returns a boolean for whether this resource has a link with the given `name` or not.
* `.followLink(name [,options])`: Retrieves the link with the given `name` and returns a promise that resolves with the response data.
* `.importLink(name [,options])`: Retrieves the link with the given `name` and assigns the response data as a property with the same `name`  (or you can use opttion.as to change the name) on the resource.  Returns a promise that resolves with the resource.

* `.hasAction(name)`: Returns a boolean for whether this resource has an action with the given `name` or not.
* `.doAction(name [,data])`: Performs the action given by `name`, optionally sending `data` and returns a promise that resolves with the response data.
* `.save()`: Sends the resource to the API to persist it.  On success, adds the resource to the store if it wasn't already in there.  Returns a promise that resolves to the resource, and also updates the store record with the response data if it is provided.
* `.delete()`: Sends a delete request to the API to remove a resource.  On success, the resource is removed from the store if it was in it.
* `.serialize()`: Returns a plain JavaScript object representation of the resource.
* `optionsFor(field)`: Returns an array with options of the `field`, only for enum fields.
* `isRequired(field)`: Returns a boolean, which indecates whether the `field` is required.
* `getDefault(field)`: Returns the field's default value.

**Static Properties:**

* `alwaysInclude: []`: An array of fields to always request be included when making requests for this tyep of resource.


### Collection
A collection is a model object representing an array of resources in the API.  It is an ArrayProxy that proxies array requests to the `data` elements of the collection, but collections are themselves resources that may have links and actions themselves that you can use (as a resource, above).

**methods**

* `length ()` Returns the length of the collection.

* `getById(id)` Returns the resource with the passed id or undefined if not found.

* `getAt(index)` Returns the resource at provided index.

* `call(nameOfmethod, [...args])`. Call any array method on the collection. such as `collection.call('map', function(item, idx) {...})`

* `.serialize()`: Returns a plain JavaScript array representation of the collection.


