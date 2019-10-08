const express = require('express');
const router = new express.Router();
const knex = require('../db/knex')

router.post('/login', function(req, res) {
    let username = req.body.username;
    let password = req.body.password;

    knex('users')
    .where({username, password})
    .then((user)=>{
        if(user){
            res.status(200).json({message: "succesfully logged in up"})
        }
        else{
            res.status(403).json({message: "user not found"})
        }
    })
    .catch(err=>{
        console.log(err);
        res.status(500).json(err);
    })
    
});

router.post('/signup', function(req, res) {
    let username = req.body.username;
    let password = req.body.password;

    knex('users')
    .select('*')
    .then(users=>{
        if(users.length < 10){
            knex('users')
            .insert({username, password})
            .then(()=>{
                res.status(200).json({message: "succesfully signed up"})
            })
            .catch(err=>{
                console.log(err);
                res.status(500).json(err);
            })
        }
        else{
            res.status(500).json({message: "more than 10 users already signed up"});
        }
    });
});

module.exports = router;