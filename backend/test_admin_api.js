

async function testAdmin() {
    try {
        // Log in as admin
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '9999999999', password: 'adminpassword123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) {
            console.log('Login failed:', loginData);
            return;
        }
        const token = loginData.token;
        const headers = { 'Authorization': `Bearer ${token}` };

        // Test /products?all=true
        console.log('Testing /products...');
        const pRes = await fetch('http://localhost:5000/api/products?all=true', { headers });
        console.log('Products:', pRes.status);
        
        // Test /orders
        console.log('Testing /orders...');
        const oRes = await fetch('http://localhost:5000/api/orders', { headers });
        console.log('Orders:', oRes.status);
        if (oRes.status !== 200) console.log(await oRes.text());
        
        // Test /users
        console.log('Testing /users...');
        const uRes = await fetch('http://localhost:5000/api/users', { headers });
        console.log('Users:', uRes.status);
        if (uRes.status !== 200) console.log(await uRes.text());

        // Test /notifications/analytics
        console.log('Testing /notifications/analytics...');
        const nRes = await fetch('http://localhost:5000/api/notifications/analytics', { headers });
        console.log('Notifs:', nRes.status);
        if (nRes.status !== 200) console.log(await nRes.text());

    } catch (e) {
        console.error(e);
    }
}
testAdmin();
