const { MongoClient } = require('mongodb');

async function main() {
  const uri = 'mongodb://127.0.0.1:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('lalithamart');
    const notifications = db.collection('notifications');

    const cursor = notifications.find({ 
      $or: [{ link: '/admin-dashboard' }, { link: '/admin' }],
      type: 'System'
    });

    let modified = 0;
    for await (const doc of cursor) {
      if (doc.relatedId) {
        await notifications.updateOne(
          { _id: doc._id },
          { $set: { link: '/admin/products?edit=' + doc.relatedId.toString() } }
        );
        modified++;
      }
    }
    console.log('Done modifying ' + modified + ' documents.');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
