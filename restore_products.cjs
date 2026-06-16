const fs = require('fs');
let text = fs.readFileSync('e:/Lalitha Mart/frontend/src/pages/admin/Products.jsx', 'utf8');

const missing = `                      {catProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 mr-3 relative rounded overflow-hidden">
                                <ProductImageCarousel 
                                  images={product.images} 
                                  altText={product.name} 
                                  className="absolute inset-0 w-full h-full object-contain" 
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">{product.name} {product.priority > 0 && <span className="text-xs text-primary-600 dark:text-primary-400 font-bold ml-1">P{product.priority}</span>}</p>
                                {product.productId && <p className="text-xs text-gray-400 font-mono">{product.productId}</p>}
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{product.description}</p>
                              </div>`;

text = text.replace(/<tbody className="divide-y divide-gray-100 dark:divide-dark-700">\s*<\/div>\s*<\/td>/, '<tbody className="divide-y divide-gray-100 dark:divide-dark-700">\n' + missing + '\n                            </div>\n                          </td>');
fs.writeFileSync('e:/Lalitha Mart/frontend/src/pages/admin/Products.jsx', text);
console.log('Restored products map');
