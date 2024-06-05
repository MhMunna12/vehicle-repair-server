
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = 3000
app.use(cors());
app.use(express.json());

function createToken(user) {
    const token = jwt.sign(
        {
            email: user.email,
        },
        "secret",
        { expiresIn: "7d" }
    );
    return token;
}
function verifyToken(req, res, next) {
    const authToken = req.headers.authorization.split(" ")[1];
    // console.log('authToken', authToken);
    const verify = jwt.verify(authToken, "secret");
    console.log(verify);
    if (!verify?.email) {
        return res.send("You are not authorized");
    }
    req.user = verify.email;
    next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nwuix.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db("vehicle_repair").collection('services');
        const usersCollection = client.db("vehicle_repair").collection('users');

        //service route
        app.post('/services', verifyToken, async (req, res) => {
            const body = req.body;
            const result = await servicesCollection.insertOne(body);
            res.send(result);
        })
        app.get('/services', async (req, res) => {
            const search = req.query.search;
            const query = {
                title: { $regex: search, $options: 'i' }
            };
            const serviceData = servicesCollection.find(query);
            const result = await serviceData.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const data = { _id: new ObjectId(id) }
            const result = await servicesCollection.findOne(data)
            res.send(result);
        })
        app.patch('/services/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const result = await servicesCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData })
            res.send(result);
        })
        app.delete('/services/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const result = await servicesCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })
        //user route
        app.post('/user', verifyToken, async (req, res) => {
            const user = req.body;
            const token = createToken(user);
            const isUserExist = await usersCollection.findOne({ email: user?.email })
            if (isUserExist?._id) {
                return res.send({
                    status: 'success',
                    message: "Login success",
                    token
                })
            } await usersCollection.insertOne(user);
            return res.send({ token });
        });
        app.get('/user/get/:id', async (req, res) => {
            const id = req.params.id;
            const result = await usersCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email })
            res.send(result);
        })
        app.patch('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const updatedData = req.body;
            const result = await usersCollection.updateOne({ email }, { $set: updatedData }, { upsert: true })
            res.send(result);
        })
        app.get('/', (req, res) => {
            res.send("Vehicle Services")
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Vehicle Services")
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})