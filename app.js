const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const hbs = require('hbs')
const mysql = require('mysql')
const date = require('date-and-time');
var bodyParser = require('body-parser')

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

app.get('/',(req,res) => {
    const userdata = req.cookies.userData
    console.log(userdata)
    if(userdata){
        db.query("SELECT * FROM users WHERE username='"+userdata.username+"' AND password='"+userdata.password+"'",(err,result) => {
            if (err) throw err;
            if (!result.length) {
                res.send('Cookie data is wrong. Login again!')
            }else{
                db.query("SELECT * FROM todos WHERE userId='"+result[0].id+"'",(err,reslt)=>{
                    if (err) throw err;
                    res.render('main',{userID:result[0].id, todos:reslt})
                })
                    
            }
        })
    }
    else{
        res.render('login')
    }
})

app.post('/',(req,res) => {
    const username = req.body.username
    const password = req.body.password
    db.query("SELECT * FROM users WHERE username='"+username+"' AND password='"+password+"'",(err,result) => {
        if (err) throw err;
        if (!result.length) {
            res.send('Wrong username or password')
        }else{
            const user = {'username':result[0].username,'password':result[0].password}
            res.cookie('userData',user ,{maxAge: 360000})
            db.query("SELECT * FROM todos WHERE userId='"+result[0].id+"'",(err,reslt)=>{
                if (err) throw err;
                res.render('main',{userID:result[0].id, todos:reslt})
            })
            
        }
    })
})

app.get('/register',(req,res)=>{
    res.render('register')
})

app.post('/register',(req,res)=>{
    const username = req.body.username
    const password = req.body.password
    db.query("INSERT INTO users(username,password) VALUES ('"+username+"','"+password+"')",(err,result)=>{
        if(err) throw err;
        res.render('result',{message: 'You succesfully registered!'})
    })
})

app.post('/add',(req,res)=> {
    const now = new Date();
    const pattern = date.compile('ddd, MMM DD YYYY HH:mm:ss');
    const todoname = req.body.name
    if (todoname){
    const sqlquery = "INSERT INTO todos(name,date,userId) VALUES ('"+todoname+"','"+date.format(now,pattern)+"','"+req.body.userid+"')"
        db.query(sqlquery, (err,result)=> {
            if (err) throw err;
            res.render('result',{message: "To Do succesfully added!"})
            })
    }else{
        res.render('result',{message: "To Do name can not be empty"})
    }
})

app.get('/edit/:id',(req,res) => {
    res.render('edit', {id: req.params.id})
})

app.post('/edit/:id',(req,res) => {
    const now = new Date();
    const pattern = date.compile('ddd, MMM DD YYYY HH:mm:ss');
    db.query("UPDATE todos SET name='"+req.body.name+"' , date='"+date.format(now,pattern)+"' WHERE id='"+req.params.id+"'", (err,result) => {
        if (err) throw err;
        res.render('result',{message: "To Do succesfully updated!"})
    })
})

app.get('/delete/:id',(req,res) => {
    db.query("DELETE FROM todos WHERE id='"+req.params.id+"'",(err,result) => {
        if(err) throw err;
        res.render('result',{message: "To Do succesfully deleted!"})
    })
})

app.get('/logout',(req,res) => {
    res.clearCookie('userData'); 
    res.render('login')
})

app.listen(3000,() => {console.log('http://localhost:3000')})