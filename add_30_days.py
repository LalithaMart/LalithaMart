import os

files = [
    'e:/Lalitha Mart/frontend/src/pages/admin/AdminOrders.jsx',
    'e:/Lalitha Mart/frontend/src/pages/admin/Dashboard.jsx',
    'e:/Lalitha Mart/frontend/src/pages/admin/Settlements.jsx',
    'e:/Lalitha Mart/frontend/src/pages/customer/Profile.jsx',
    'e:/Lalitha Mart/frontend/src/pages/delivery/History.jsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Add option
    if '<option>Last 30 Days</option>' not in content:
        content = content.replace('<option>Last 7 Days</option>', '<option>Last 7 Days</option>\n              <option>Last 30 Days</option>')
    
    # Add logic
    if "dateFilter === 'Last 30 Days'" not in content:
        # standard list filter
        logic_part = "} else if (dateFilter === 'Last 30 Days') {\n          const last30 = new Date(now);\n          last30.setDate(last30.getDate() - 30);\n          match = match && orderDate >= last30;\n        "
        if "} else if (dateFilter === 'This Month') {\n          match = match && orderDate.getMonth()" in content:
            content = content.replace("} else if (dateFilter === 'This Month') {\n          match = match && orderDate.getMonth()", logic_part + "} else if (dateFilter === 'This Month') {\n          match = match && orderDate.getMonth()")
        
        # admin dashboard chart
        logic_part2 = "} else if (dateFilter === 'Last 30 Days') {\n      const d = new Date();\n      d.setDate(d.getDate() - 30);\n      minTime = d.setHours(0,0,0,0);\n    "
        if "} else if (dateFilter === 'This Month') {\n      const d = new Date();\n      d.setDate(1);" in content:
             content = content.replace("} else if (dateFilter === 'This Month') {\n      const d = new Date();\n      d.setDate(1);", logic_part2 + "} else if (dateFilter === 'This Month') {\n      const d = new Date();\n      d.setDate(1);")

        # History.jsx custom filter logic
        # history uses: if (dateFilter === 'This Month') { const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1); match = match && orderDate >= thisMonth; }
        if "if (dateFilter === 'This Month') {\n        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);\n        match = match && orderDate >= thisMonth;\n      }" in content:
            content = content.replace("if (dateFilter === 'This Month') {\n        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);\n        match = match && orderDate >= thisMonth;\n      }", "if (dateFilter === 'Last 30 Days') {\n        const last30 = new Date(now);\n        last30.setDate(last30.getDate() - 30);\n        match = match && orderDate >= last30;\n      } else if (dateFilter === 'This Month') {\n        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);\n        match = match && orderDate >= thisMonth;\n      }")

        # Profile.jsx has standard logic but maybe different whitespace
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Updated 30 days')
