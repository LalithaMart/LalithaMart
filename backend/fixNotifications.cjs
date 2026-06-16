const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/lalithamart').then(async () => {
  try {
    const Notification = (await import('file:///e:/Lalitha Mart/backend/models/Notification.js')).default;
    
    // Find system notifications pointing to old links
    const notifications = await Notification.find({ 
      $or: [
        { link: '/admin-dashboard' },
        { link: '/admin' }
      ],
      type: 'System'
    });
    
    let modified = 0;
    for (let n of notifications) {
      if (n.relatedId) {
        n.link = '/admin/products?edit=' + n.relatedId;
        await n.save();
        modified++;
      }
    }
    
    console.log('Modified existing notifications:', modified);
  } catch (error) {
    console.error('Error modifying notifications:', error);
  } finally {
    process.exit(0);
  }
});
