const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const hbs = require('hbs')
const mysql = require('mysql')
const date = require('date-and-time');
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { check, validationResult } = require('express-validator')

const ACCESS_TOKEN_SECRET = 'pr!v@te_key'

const app = express()

app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, '/public')))
app.use(cookieParser())
app.set('view engine','hbs')

const partialPath = path.join(__dirname,'./views/partials')
hbs.registerPartials(partialPath)

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'todo_app'
})

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token
    if (token){
        jwt.verify(token, ACCESS_TOKEN_SECRET, (err,user) => {
            if (err) return res.sendStatus(403)
            req.user = user
            next()
        })    
    }else{
        res.render('login')
    }
}

app.get('/',authenticateToken, (req,res) => {
    const user = req.user
    db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
        if (err) throw err;
        res.render('main',{ userID:user.id, todos:result })
    })               
})

app.post('/',
    [check('username','Fill username').notEmpty(),
     check('password','Fill password').notEmpty()],
    (req,res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const alert = errors.array()
        res.render('login',{ errors: alert })
    }else {
        const username = req.body.username
        const password = req.body.password
        
        db.query("SELECT * FROM users WHERE username='"+username+"'",(err,result) => {
            if (err) throw err;
            if (!result.length) {
                res.render('login',{ errors: [{msg: "User not found"}] })
            }else{
                if (bcrypt.compareSync(password,result[0].password)){
                    const user = { 'id':result[0].id, 'username':result[0].username, 'password':result[0].password }
                    const token = jwt.sign(user, ACCESS_TOKEN_SECRET)
                    res.cookie('token', token)
                    db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
                        if (err) throw err;
                        res.render('main',{ userID:user.id, todos:result })
                    })
                }else{
                    res.render('login',{ errors: [{msg: "Wrong password"}] })
                }   
            }
        }) 
    }
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.post('/register',[
    check('username','Fill username').notEmpty(),
    check('password','Password must be longer than 6 characters').exists().isLength({ min:6 })],
    (req,res)=>{
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const alert = errors.array()
        res.render('register',{ errors: alert })
    }else{
        const username = req.body.username
        db.query("SELECT username FROM users WHERE username='"+username+"'",(err,result)=>{
            if (result.length){
                res.render('register',{ errors: [{msg:'Username is already in use'}] })
            }else{
                const password = req.body.password
                const password_hash = bcrypt.hashSync(password, 10)
                db.query("INSERT INTO users(username,password) VALUES ('"+username+"','"+password_hash+"')",(err,result)=>{
                    if(err) throw err;
                    res.render('result',{message: 'You succesfully registered!'})
                })
            }
        })
    }
})

app.post('/add', authenticateToken, [
    check('name',"Fill To Do name").notEmpty()], 
    (req,res)=> {
    const user = req.user
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const alert = errors.array()
        db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
            if (err) throw err;
            res.render('main',{ userID:user.id, todos:result, error:alert[0]})
        })
    }else{
        const now = new Date();
        const pattern = date.compile('ddd, MMM DD YYYY HH:mm:ss');
        const todoname = req.body.name
        const sqlquery = "INSERT INTO todos(name,date,userId) VALUES ('"+todoname+"','"+date.format(now,pattern)+"','"+req.body.userid+"')"
        db.query(sqlquery, (err,result)=> {
            if (err) throw err;
        })
        db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
            if (err) throw err;
            res.render('main',{ userID:user.id, todos:result })
        })     
    }
})

app.get('/edit/:id', authenticateToken, (req,res) => {
    res.render('edit', {id: req.params.id})
})

app.post('/edit/:id', authenticateToken, [
    check('name',"Fill To Do name for updating").notEmpty()], 
    (req,res) => {
    const user = req.user
    const errors = validationResult(req)
    if (!errors.isEmpty()){
        const alert = errors.array()
        res.render('edit',{id: req.params.id, error: alert[0] })
    }else{
        const now = new Date();
        const pattern = date.compile('ddd, MMM DD YYYY HH:mm:ss');
        db.query("UPDATE todos SET name='"+req.body.name+"' , date='"+date.format(now,pattern)+"' WHERE id='"+req.params.id+"'", (err,result) => {
            if (err) throw err;
        })
        db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
            if (err) throw err;
            res.render('main',{ userID:user.id, todos:result })
        })
    }
})

app.get('/delete/:id', authenticateToken, (req,res) => {
    const user = req.user
    db.query("DELETE FROM todos WHERE id='"+req.params.id+"'",(err,result) => {
        if(err) throw err;
    })
    db.query("SELECT * FROM todos WHERE userId='"+user.id+"'",(err,result)=>{
        if (err) throw err;
        res.render('main',{ userID:user.id, todos:result })
    })  
})

app.get('/logout', authenticateToken, (req,res) => {
    res.clearCookie('token'); 
    res.render('login')
})

app.listen(3000,() => {console.log('http://localhost:3000')})