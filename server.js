const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
var knex = require('knex');
const { json } = require( 'body-parser' );

/** establish a connection to databsase, smart_brain using knex.js */
const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'test',
      database : 'smart_brain'
    }
});

/** Testing our connection */
// db.select('*').from('users').then(data => {
//     console.log(data)
// });

const app = express();

app.use(bodyParser.json());
app.use(cors());

/** creates a database sample with users. 
 * The databse variable is an object of an array of objects - object of users array
*/
const database = {
    users: [
        {
            id: 123,
            name: 'Joseph',
            email: 'joseph@gmail.co',
            password: 'pass123',
            enteries: 0,
            created_at: new Date() 
        },
        {
            id: 124,
            name: 'Andy',
            email: 'andy@gmail.co',
            password: 'pass124',
            enteries: 0,
            created_at: new Date()
        }
    ]
};


/** get all users from the database 
 * returns our base url which is a list of all our registered users
*/
app.get('/', (req, res) => {
    // res.json(database.users)
    db.select().table('users')
    .then(user => {
        res.json(user)
    }).catch(err => {
        res.status(404).json(err)
    })
});

/** the /sign-in endpoint 
 * making a post request to /sign-in,
 * accepts a request body, compares it with our users' data and returns a response of success or fail
*/
app.post('/sign-in', (req, res) => {
   
   db.select('email', 'hash').from('login')
   .where('email', '=', req.body.email)
   .then(data => {
    const isValid = bcrypt.compareSync(req.body.password, data[0].hash)
       if (isValid){
           return db.select('*').from('users')
            .where('email', '=', req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json(err))
       }else {
           res.status(400).json('wrong credentials, try again')
       }
   })
   .catch(err => res.status(400).json(err))
   
   
    // if (req.body.email === database.users[0].email && 
    //     req.body.password === database.users[0].password){
    //     res.json('success');
    // }else{
    //     res.status(400).json( 'Incorrect username or password');
    // }
})

/**  Register a new user 
 * making a post request to /register to 
 * create a new user with our users object properties from the database
 * returns a response with our newly added user object //[database.users.length-1]
*/
app.post('/register', (req, res) => {
    const {name, email, password} = req.body;
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds );
    db.transaction(trx => {
        trx.insert({
            hash : hash,
            email : email
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
                .returning('*')
                .insert({
                    name: name,
                    email: loginEmail[0],
                    created_at: new Date()
                })
                .then(user => {
                    res.json(user[0])
                })
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })
    .catch(err => res.status(400).json(err))

    // database.users.push(
    //     {
    //         id: 126,
    //         name: req.body.name,
    //         email: req.body.email,
    //         // password: req.body.password,
    //         enteries: 0,
    //         created_at: new Date() 
    //     }
    // )
    // res.json(database.users[database.users.length-1]);
})
/** .../profile/:id endpoint 
 * make a get request to /profile/:id to get a user with the matching id,
 * loop through the users array and return a user with the matching id
 * if not found, respond with an error status 
*/
app.get('/profile/:id', (req, res) => {
    const {id} = req.params;
    db.select('*').from('users').where({id: id})
    .then(user => {
        if(user.length){
            res.json(user[0])
        }else{
            res.status(404).json('User not found')
        }
    })
    .catch(err => res.status(404).json(err))

    // let found = false;
    //     database.users.map(user => {
    //         if (user.id === id){
    //             found = true;
    //             return res.json(user)
    //         }
    //     });
    //     if (!found) {
    //         res.status(404).json('Not found')
    //     }
});

app.put('/profile', (req, res) => {
    const {id, name, entries, email} = req.body;
    db('users')
    .where('id', '=', id)
    .update({
    name: name,
    email: email,
    entries: entries
  })
  .returning('users')
  .then(user => {
      res.json(user[0])
  }).catch(err => {
      res.status(400).json(err)
  })

})

app.put('/image', (req, res ) => {
    const {id} = req.body;
    db('users')
    .where({ id: id })
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0])
    })
    .catch(err => res.status(404).json(err))
    
});

// app.put('/image', (req, res) => {
//     const {id} = req.body;
//     let found = false;
//     database.users.map(user => {
//         found = true;
//         if(user.id === id ){
//             user.enteries++;
//             return res.json(user.enteries)
//         }
//     })
//     if(!found){
//         res.status(404).json('No enteries for this user')
//     }
// })


app.listen(3030, () => {console.log('App is running on port: 3030')})