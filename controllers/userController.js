const User = require('../models/User')
const Post = require('../models/Post')
const Follow = require('../models/Follow')
const jwt = require('jsonwebtoken')

exports.apiGetPostsByUsername = async function(req,res){
    try{
        let authorDoc = await User.findByUsername(req.params.username)
        let post = await Post.findByAuthorId(authorDoc._id)
        res.json(post)
    }catch{
        res.json("Sorry invalid user detected")
    }
}

exports.doesUsernameExist = function(req,res){
    User.findByUsername(req.body.username).then(()=>{
        res.json(true)
    }).catch(()=>{
        res.json(false)
    })
}

exports.doesEmailExist = async function(req,res){
    let emailBool = await User.findByEmail(req.body.email)
    if(emailBool){
        emailBool = true
    }else{
        emailBool = false
    }
    res.json(emailBool)
}


exports.sharedProfileData = async function(req, res,next){
    let isVisitorsProfile = false
    let isFollowing = false
    if (req.session.user){
        isVisitorsProfile = req.profileUser._id == req.session.user._id
        isFollowing = await Follow.isVisitorFollowing(req.profileUser._id,req.visitorId)
    }

    req.isFollowing = isFollowing
    req.isVisitorsProfile = isVisitorsProfile
    // retrive post follower and following counts
    let postCountPromise = Post.countPostsByAuthor(req.profileUser._id)
    let followerCountPromise = Follow.countFollowersById(req.profileUser._id)
    let followingCountPromise = Follow.countFollowingById(req.profileUser._id)
    let [postCount,followerCount,followingCount] = await Promise.all([postCountPromise,followerCountPromise,followingCountPromise])
    req.postCount = postCount
    req.followingCount = followingCount
    req.followerCount = followerCount
    next()
}

exports.login = (req,res) =>{
    let user = new User(req.body)
    user.login().then(function(result){
        req.session.user={
            avatar:user.avatar,
            username:user.data.username,
            _id:user.data._id,
            email:user.data.email
        }
        req.session.save(function(){
            res.redirect('/')
        })
        
    }).catch(function(err){
        req.flash('errors',err)
        req.session.save(function(){
            res.redirect('/')
        })
    })
}

exports.apiLogin = (req,res) =>{
    let user = new User(req.body)
    user.login().then(function(result){
    res.json(jwt.sign({_id:user.data._id},process.env.JWTSECRET,{expiresIn:'7d'}))    
    })
    .catch(function(err){
        res.json("incorrect username/password")
    })
}

exports.logout = (req,res) =>{
    req.session.destroy(function(){res.redirect('/')})
}

exports.register = (req,res) =>{
    let user = new User(req.body)
    user.register().then(()=>{
        req.session.user ={username:user.data.username,avatar:user.avatar,_id:user.data._id}
        req.session.save(()=>{res.redirect('/')})
    }).catch((regErrors)=>{
        regErrors.forEach(function(err){
            req.flash('regErrors',err)
        })
        req.session.save(()=>{
            res.redirect('/')
        })
    })
}

exports.mustBeLoggedIn = (req,res,next)=>{
if(req.session.user){
    next()
}else{
    req.flash("errors","You must be logged in to perform that action")
    req.session.save(function(){res.redirect('/')})
}
}

exports.apiMustBeLoggedIn = (req,res,next)=>{
    try{
        req.apiUser = jwt.verify(req.body.token,process.env.JWTSECRET)
        next()
    }catch{
        res.json("You must provide a valid token")
    }
    }
    

exports.ifUserExists = function(req,res,next){
    User.findByUsername(req.params.username).then((userDocument)=>{
        req.profileUser = userDocument
        next()
    }).catch(()=>{
        res.render('404')
    })
}

exports.profilePostsScreen = function(req,res){
    //Ask post model for finding posts by a certain person
    Post.findByAuthorId(req.profileUser._id).then(function(posts){
        res.render('profile',{
            title: `${req.profileUser.username}'s posts | Facegram`,
            currentPage:"posts",
            posts:posts,
            profileUsername:req.profileUser.username,
            profileAvatar:req.profileUser.avatar,
            isFollowing:req.isFollowing,
            isVisitorsProfile:req.isVisitorsProfile,
            counts:{postCount:req.postCount,followingCount:req.followingCount,followerCount:req.followerCount}
        })
    }).catch(function(){
        res.render('404')
    })

    
}

exports.profileFollowersScreen = async function(req,res){
    try{
        //Ask post model for finding followers by a certain person
        let followers = await Follow.getFollowersById(req.profileUser._id)
        res.render('profile-followers',{
            title: `${req.profileUser.username}'s followers | Facegram`,
            currentPage:"followers",
            followers:followers,
            profileUsername:req.profileUser.username,
            profileAvatar:req.profileUser.avatar,
            isFollowing:req.isFollowing,
            isVisitorsProfile:req.isVisitorsProfile,
            counts:{postCount:req.postCount,followingCount:req.followingCount,followerCount:req.followerCount}
        })
    }catch{
        res.render('404')
    }
}

exports.profileFollowingScreen = async function(req,res){
    try{
        //Ask post model for finding posts by a certain person
        let following = await Follow.getFollowingById(req.profileUser._id)
        res.render('profile-following',{
            title: `who is ${req.profileUser.username} following | Facegram`,
            currentPage:"following",
            following:following,
            profileUsername:req.profileUser.username,
            profileAvatar:req.profileUser.avatar,
            isFollowing:req.isFollowing,
            isVisitorsProfile:req.isVisitorsProfile,
            counts:{postCount:req.postCount,followingCount:req.followingCount,followerCount:req.followerCount}
        })
    }catch{
        res.render('404')
    }
}

exports.home = async (req,res) =>{
    if(req.session.user){
        //fetch feed of posts for current user
        let posts = await Post.getFeed(req.session.user._id)
        res.render('home-dashboard',{posts: posts})
    }else{
        res.render('home-guest',{regErrors: req.flash('regErrors')})
    }
}