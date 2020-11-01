const validator = require('validator')
const md5 = require('md5')
const userCollection = require('../db').db().collection("users")
const bcrypt =require('bcryptjs')
const { response } = require('express')

let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if(getAvatar == undefined){getAvatar = false}
    if(getAvatar){this.getAvatar()}
}

User.prototype.cleanUp =function(){
    if(typeof(this.data.username) != "string"){this.data.username = ""}
    if(typeof(this.data.email) != "string"){this.data.email = ""}
    if(typeof(this.data.password) != "string"){this.data.password = ""}
    //Get rid of any other properties
    this.data={
        username:this.data.username.trim().toLowerCase(),
        email:this.data.email.trim().toLowerCase(),
        password:this.data.password
    }
}


User.prototype.validate = function(){
    return new Promise(async (resolve,reject) => {
        if(this.data.username == ""){this.errors.push("You must provide a username.")}
        if(this.data.username != "" && !validator.isAlphanumeric(this.data.username)){this.errors.push("Username can only contain letters and numbers.")}
        if(!validator.isEmail(this.data.email)){this.errors.push("You must provide a email.")}
        if(this.data.password == ""){this.errors.push("You must provide a password.")}
        if(this.data.password.length > 0 && this.data.password.length <12){this.errors.push("Password must be atleast 12 characters long")}
        if(this.data.password.length > 50){this.errors.push("Password cannot excede 50 characters")}
        if(this.data.username.length > 0 && this.data.username.length <4){this.errors.push("Username must be atleast 4 characters long")}
        if(this.data.username.length > 30){this.errors.push("Username cannot excede 30 characters")}

        if(this.data.username.length>2 && this.data.username.length <31 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await userCollection.findOne({username:this.data.username})
            console.log(usernameExists)
            if (usernameExists){this.errors.push("Username already taken")}
        }
        if(validator.isEmail(this.data.email)){
            let emailExists = await userCollection.findOne({email:this.data.email})
            if (emailExists){this.errors.push("Email is already in use")}
        }
        resolve()
    })
}

User.prototype.login =function(){
    return new Promise((resolve,reject)=>{
        this.cleanUp()
        userCollection.findOne({username:this.data.username}).then((pastUser)=>{
            if(pastUser && bcrypt.compareSync(this.data.password, pastUser.password)){
                this.data = pastUser
                this.getAvatar()
                resolve("User logged in")
            }else{
                reject("Invalid username or password")
            }
        }).catch((err)=>{
            reject("please try again later(It has nothing to do with your input)")
        })
    })
}


User.prototype.register = function(){
    return new Promise(async (resolve,reject)=>{
        //step 1: Validate user data
        this.cleanUp()
        await this.validate()
        console.log(this.errors)
        //Step 2: Only if there no validation error Save user data in a database
        if(!this.errors.length){
            // hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password,salt)
            await userCollection.insertOne(this.data)
            this.getAvatar()
            resolve()
        }else{reject(this.errors)}
    })
}

User.prototype.getAvatar = function(){
    encrypted=md5(this.data.email)
    this.avatar = `https://gravatar.com/avatar/${encrypted}?s=128`
}



User.findByUsername = function(username){
    return new Promise((resolve,reject)=>{
        if(typeof(username) != "string"){
            reject()
            return
        }else{
            userCollection.findOne({username:username}).then(function(userDoc){
                if(userDoc){
                    userDoc = new User(userDoc,true)
                    userDoc = {
                        _id:userDoc.data._id,
                        username:userDoc.data.username,
                        avatar: userDoc.avatar,
                    }
                    resolve(userDoc)
                }else{
                    reject()
                }
            }).catch(function(){
                reject()
            })
        }
    })
}

User.findByEmail = function(email){
    return new Promise(async (resolve,reject)=>{
        if(typeof(email) != "string"){
            resolve(false)
            return
        }
        let user = await userCollection.findOne({email:email})
        resolve(user)
    })
}

module.exports = User