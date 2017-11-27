import Store from './Store'

const store = new Store()

store.find('stack', '1st13').then(r => {
  // API test

  // Resource
  //----------- getById
  // const stack =  store.getById('stack', '1st13');

  //-------------linkFor
  // const self = stack.linkFor('self')
  // console.log('test for linkFor ----------', self);

  //-------------hasLink
  // const hasLink = stack.hasLink('account')
  // const hasLink2 = stack.hasLink('viky')
  // console.log('test for hasLink ----------', hasLink, hasLink2);

  //-------------followLink
  // stack.followLink('services').then(res => {
  //   console.log('instances', res);
  // })
  // stack.importLink('services', {as: 'importedResource'}).then(res => {
  //   console.log(stack.importedResource);
  // })

  // ------------ hasAction
  // console.log(stack.hasAction('deactivateservices')) // true
  // console.log(stack.hasAction('noexisting')) // false

  //------------ doAction
  // stack.delete({
  //   withCredentials: true,
  // }).then(res => {
  //   console.log('deleted');
  // })

  // stack.doAction('remove').then(res => {
  //   console.log('------------', res);
  // })

  // store._bulkAdd('stack', [stack]);
  // s.save();
  // console.log(stack)
});

// static headers = {
//   'X-Api-Csrf': 'D4FEB167B2',
//   'X-Api-No-Challenge': true,
//   'x-api-action-links': 'actionLinks',
// }
