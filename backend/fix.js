db.notifications.find({ $or: [{ link: '/admin-dashboard' }, { link: '/admin' }], type: 'System' }).forEach(function(n) {
  if (n.relatedId) {
    db.notifications.updateOne({ _id: n._id }, { $set: { link: '/admin/products?edit=' + n.relatedId.valueOf() } });
  }
});
print('Done');
