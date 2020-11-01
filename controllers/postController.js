const Post = require('../models/Post')
const sendgrid = require('@sendgrid/mail')
const session = require('express-session')

sendgrid.setApiKey(process.env.SENDGRIDAPIKEY)

exports.viewCreateScreen = (req,res) =>{
    res.render('create-post',{title:'create new post | Facegram'})
}

exports.create = function(req,res){
    let post = new Post(req.body,req.session.user._id)
    post.create().then((newId)=>{
        const msg = {
            to: req.session.user.email,
            from: "noreply.facegramsocial@gmail.com",
            subject: "Congrats on Creating a New Post!",
            text: "You did a great job of creating a post.",
            html: `You did a <strong>great</strong> job of creating a post. you can view your post at <a href="https://facegram-social.herokuapp.com/post/${newId}">Link</a>`,
          }
          sendgrid.send(msg).then(
            () => {
                console.log("successfully delivered")
            },
            (error) => {
              console.error(error)
              if (error.response) {
                console.error(error.response.body)
              }
            }
        )
        req.flash("success","New post successfully created.")
        req.session.save(()=>res.redirect(`/post/${newId}`))
    }).catch((errs)=>{
        errs.forEach(result=>req.flash("errors",result))
        req.session.save(()=>res.redirect("/create-post"))
    })
}

exports.viewSingle = async function(req,res){
    try{
        let post = await Post.findSingleById(req.params.id, req.visitorId)
        res.render('single-post-screen',{post: post,title:post.title+" | Facegram"})
    }catch{
        res.render('404')
    }
}

exports.apiCreate = function(req,res){
    let post = new Post(req.body,req.apiUser._id)
    post.create().then((newId)=>{
        res.json("Post successfully created")
    }).catch((errs)=>{
        res.json(errs)
    })
}

exports.viewEditScreen = async function(req,res){
    try{
        let post = await Post.findSingleById(req.params.id,req.visitorId)
        if(post.isVisitorOwner){
            res.render('edit-post', {post: post,title:'edit post | Facegram'})
        }else{
            req.flash("errors", "You do not have permission to perform that action")
            req.session.save(()=>res.redirect("/"))
        }
    }catch{
        res.render('404')
        // post.authorId == req.visitorId || req.visitorId == process.env.OWNER
    }
}



exports.edit = function(req,res){
    let post = new Post(req.body,req.visitorId,req.params.id)
    post.update().then((status)=>{
        // the post was successfully updated in the database
        // or user did have permission, but there were validation errors
        if(status == "success"){
            //post updated
            req.flash("success","Post successfully updated.")
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}`)
            })
        }else{
            post.errors.forEach(function(error){
                req.flash("errors",error)
            })
            req.session.save(function(){
                res.redirect(`/post/${req.params.id}/edit`)
            })
        }
    }).catch(()=>{
        req.flash("errors","You do not have permission to perform that action")
        req.session.save(function(){
            res.redirect("/")
        })
    })
}

exports.delete = function(req,res){
    Post.delete(req.params.id,req.visitorId).then(()=>{
        req.flash("success","Post successfully deleted.")
        req.session.save(()=>res.redirect(`/profile/${req.session.user.username}`))
    }).catch(()=>{
        req.flash("errors","You do not have permission to perform that action")
        req.session.save(()=>res.redirect("/"))
    })
}

exports.apiDelete = function(req,res){
    Post.delete(req.params.id,req.apiUser._id).then(()=>{
        res.json('Post successfully deleted')
    }).catch(()=>{
        res.json('You do not have permission to perform that action')
    })
}

exports.search = function(req,res){
    Post.search(req.body.searchTerm).then((posts)=>res.json(posts)).catch(()=>{
        res.json([])
    })
}