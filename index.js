const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const uuid = require('uuid');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
}));

function isAuthenticated(req, res, next) {
    const whitelist = ['/login', '/'];
    if (whitelist.includes(req.path)) {
        next();
    } else if (req.session.user) {
        next();
    } else {
        console.log('User not authenticated');
        res.redirect('/');
    }
}

app.use(isAuthenticated);

// Insecure global variable to store user data (for demonstration purposes only)
let users = [
    { id: 1, name: 'Alice', email: 'alice@example.com', password: 'password1' },
    { id: 2, name: 'Bob', email: 'bob@example.com', password: 'password2' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', password: 'password3' },
];

for (const user of users) {
    user.id = uuid.v4();
}

// Insecure global variable to store product data (for demonstration purposes only)
let products = [
    { id: 1, name: 'Shoes', price: 50, image: 'images/shoes.jpg' },
    { id: 2, name: 'Apple', price: 5, image: 'images/apple.png' },
    { id: 3, name: 'Hat', price: 15, image: 'images/hat.jpg' },
];

// Vulnerable page with Path Traversal vulnerability for image recovery
app.get('/images', (req, res) => {
    const imageName = req.query.name;
    const filePath = path.join(__dirname, 'public', imageName);
    res.sendFile(filePath);
});

// CSRF token generation middleware
// app.use((req, res, next) => {
//     if (!req.session.csrfToken) {
//         req.session.csrfToken = Math.random().toString(36).substr(2);
//     }
//     next();
// });
// To include in the HTML form later -> <input type="hidden" name="csrf_token" value="${req.session.csrfToken}">

// Shop homepage with login form
app.get('/', (req, res) => {
    const name = req.query.name || '';
    res.send(`
        <h1>Welcome to the Shop</h1>
        <form action="/login" method="post">
            <label for="email">Email:</label>
            <input type="email" name="email" id="email" required>
            <label for="password">Password:</label>
            <input type="password" name="password" id="password" required>
            <button type="submit">Login</button>
        </form>
    `);
});

// User login route
app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const user = users.find((user) => user.email === email && user.password === password);
    if (user) {
        req.session.user = user;
        res.redirect(`/products`);
    } else {
        res.send('Invalid credentials. Please try again.');
    }
});

// Product listing route
app.get('/products', (req, res) => {
    const user = req.session.user;
    if (user) {
        res.send(`
            <h1>Product Listing</h1>
            <ul>
                ${products.map((product) => `
                    <li>
                        <img src="/images?name=${product.image}" alt="${product.name}" width="100">
                        <h3>${product.name}</h3>
                        <p>Price: $${product.price}</p>
                        <form action="/place-order" method="post">
                            <input type="hidden" name="product_id" value="${product.id}">
                            <button type="submit">Place Order</button>
                        </form>
                    </li>
                `).join('')}
            </ul>
        `);
    } else {
        res.redirect('/');
    }
});

// Order placement route (vulnerable to CSRF)
app.post('/place-order', (req, res) => {
    const user = req.session.user;
    const product_id = req.body.product_id;
    // const csrf_token = req.body.csrf_token;

    // Verify CSRF token
    // if (csrf_token === req.session.csrfToken) {
    if (user) {
        const product = products.find((product) => product.id === parseInt(product_id));
        if (product) {
            res.send(`
                    <h1>Order Placed</h1>
                    <p>Thank you for placing an order for ${product.name}.</p>
                `);
        } else {
            res.status(404).send('Product not found');
        }
    } else {
        res.redirect('/');
    }
    // } else {
    //     res.status(403).send('Invalid CSRF token');
    // }
});

// Start the server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
