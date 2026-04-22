// CSEN503 Travelling Website Project
// Technologies: Node.js, Express, EJS, MongoDB (no mongoose), express-session

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { MongoClient } = require('mongodb');

const app = express();

// ---------------- CONFIGURATION ----------------

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files (public folder from the provided zip)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(
    session({
        secret: 'csen503-secret-key', // in real apps use env var
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 // 1 hour
        }
    })
);

// ---------------- MONGODB CONNECTION ----------------

// IMPORTANT: DB name must be "myDB" and collection must be "myCollection"
const mongoUrl = 'mongodb://127.0.0.1:27017'; // default local Mongo URL
const dbName = 'myDB';
const collectionName = 'myCollection';

let usersCollection;

// In this project, each document in myCollection will look like:
// {
//   _id: ObjectId,
//   username: "user",
//   password: "plainOrHashed",
//   wantToGo: ["Paris", "Bali Island", ...]  // list of destinations
// }

// NOTE: For a simple course project, plaintext passwords are often accepted.
// In production you MUST hash passwords.

// ---------------- DESTINATIONS CONFIG ----------------
// This helps with search and want-to-go.
// name: textual name shown to the user
// route: Express route path for that destination

const destinations = [
    { name: 'Paris', route: '/paris' },
    { name: 'Rome', route: '/rome' },
    { name: 'Bali Island', route: '/bali' },
    { name: 'Santorini Island', route: '/santorini' },
    { name: 'Inca Trail to Machu Picchu', route: '/inca' },
    { name: 'Annapurna Circuit', route: '/annapurna' }
];

// Helper to look up a destination by exact name
function findDestinationByName(name) {
    return destinations.find(
        (d) => d.name.toLowerCase() === String(name).toLowerCase()
    );
}

// ---------------- AUTH + SESSION MIDDLEWARE ----------------

// Middleware to make username available in all EJS templates (optional)
app.use((req, res, next) => {
    res.locals.currentUser = req.session.username || null;
    next();
});

// Middleware to protect routes that require login
function requireLogin(req, res, next) {
    if (!req.session.username) {
        // User is not logged in, only allow login and registration
        return res.redirect('/login');
    }
    next();
}

// ---------------- ROUTES ----------------

// ----- ROOT -----
app.get('/', (req, res) => {
    // Redirect to login if not logged in, else to home
    if (!req.session.username) {
        return res.redirect('/login');
    }
    res.redirect('/home');
});

// ----- LOGIN -----

// GET /login  => show login page
app.get('/login', (req, res) => {
    if (req.session.username) {
        // If already logged in, go to home
        return res.redirect('/home');
    }
    // Pass optional error/success messages via query params
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('login', { error, message });
});

// POST /login  => attempt login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
        return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password.'));
    }

    try {
        const user = await usersCollection.findOne({ username: username });

        if (!user || user.password !== password) {
            // user not found or password mismatch
            return res.redirect('/login?error=' + encodeURIComponent('Invalid username or password.'));
        }

        // Credentials correct
        req.session.username = user.username;
        return res.redirect('/home');
    } catch (err) {
        console.error('Error during login:', err);
        return res.redirect('/login?error=' + encodeURIComponent('An error occurred. Please try again.'));
    }
});

// ----- REGISTRATION -----

// GET /registration  => show registration page
app.get('/registration', (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('registration', { error, message });
});

// POST /register => handle registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Check fields not empty
    if (!username || !password) {
        return res.redirect(
            '/registration?error=' + encodeURIComponent('Username and password are required.')
        );
    }

    try {
        // Check if username already exists
        const existing = await usersCollection.findOne({ username: username });
        if (existing) {
            return res.redirect(
                '/registration?error=' + encodeURIComponent('Username is already taken.')
            );
        }

        // Insert new user with empty wantToGo list
        await usersCollection.insertOne({
            username: username,
            password: password,
            wantToGo: []
        });

        // Redirect to login with success message
        return res.redirect(
            '/login?message=' + encodeURIComponent('Registration successful. Please login.')
        );
    } catch (err) {
        console.error('Error during registration:', err);
        return res.redirect(
            '/registration?error=' + encodeURIComponent('An error occurred. Please try again.')
        );
    }
});

// ----- LOGOUT -----
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// ----- HOME (REQUIRES LOGIN) -----
app.get('/home', requireLogin, (req, res) => {
    res.render('home');
});

// ----- CATEGORY PAGES (REQUIRE LOGIN) -----
app.get('/hiking', requireLogin, (req, res) => {
    res.render('hiking');
});

app.get('/cities', requireLogin, (req, res) => {
    res.render('cities');
});

app.get('/islands', requireLogin, (req, res) => {
    res.render('islands');
});

// ----- DESTINATION PAGES (REQUIRE LOGIN) -----
app.get('/paris', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('paris', { error, message });
});

app.get('/rome', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('rome', { error, message });
});

app.get('/bali', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('bali', { error, message });
});

app.get('/santorini', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('santorini', { error, message });
});

app.get('/inca', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('inca', { error, message });
});

app.get('/annapurna', requireLogin, (req, res) => {
    const error = req.query.error || null;
    const message = req.query.message || null;
    res.render('annapurna', { error, message });
});

// ----- WANT-TO-GO LIST PAGE (REQUIRES LOGIN) -----
app.get('/wanttogo', requireLogin, async (req, res) => {
    try {
        const user = await usersCollection.findOne({ username: req.session.username });
        const list = (user && user.wantToGo) || [];
        res.render('wanttogo', { list });
    } catch (err) {
        console.error('Error fetching want-to-go list:', err);
        res.render('wanttogo', { list: [], error: 'Could not load list.' });
    }
});

// ----- ADD TO WANT-TO-GO LIST (POST) -----
app.post('/addToWantToGo', requireLogin, async (req, res) => {
    const { destinationName } = req.body;
    const dest = findDestinationByName(destinationName);

    if (!dest) {
        // Invalid destination sent
        return res.status(400).send('Invalid destination.');
    }

    try {
        const user = await usersCollection.findOne({ username: req.session.username });
        if (!user) {
            return res.redirect('/login');
        }

        const list = user.wantToGo || [];

        // Check for duplicate
        const exists = list.some(
            (item) => item.toLowerCase() === destinationName.toLowerCase()
        );
        if (exists) {
            // Redirect back to the destination page with error
            return res.redirect(
                dest.route +
                '?error=' +
                encodeURIComponent('Destination is already in your Want-to-Go list.')
            );
        }

        // Add destination
        await usersCollection.updateOne(
            { username: req.session.username },
            { $push: { wantToGo: destinationName } }
        );

        // Redirect back with success message
        return res.redirect(
            dest.route +
            '?message=' +
            encodeURIComponent('Destination added to your Want-to-Go list.')
        );
    } catch (err) {
        console.error('Error adding to Want-To-Go list:', err);
        return res.redirect(
            dest.route + '?error=' + encodeURIComponent('An error occurred. Please try again.')
        );
    }
});

// ----- SEARCH (POST) -----
app.post('/search', requireLogin, (req, res) => {
    const key = (req.body.Search || '').trim().toLowerCase();

    if (!key) {
        return res.render('searchresults', {
            results: [],
            notFound: 'Destination not found'
        });
    }

    // Find destinations whose names contain the substring
    const matches = destinations.filter((d) =>
        d.name.toLowerCase().includes(key)
    );

    if (matches.length === 0) {
        return res.render('searchresults', {
            results: [],
            notFound: 'Destination not found'
        });
    }

    res.render('searchresults', {
        results: matches,
        notFound: null
    });
});

// ---------------- START SERVER AFTER DB CONNECTION ----------------

async function startServer() {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        console.log('Connected successfully to MongoDB');

        const db = client.db(dbName);
        usersCollection = db.collection(collectionName);

        const PORT = 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

startServer();