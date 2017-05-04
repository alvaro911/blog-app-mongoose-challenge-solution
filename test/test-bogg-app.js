const chai = require('chai')
const chaiHttp = require('chai-http')
const mongoose = require('mongoose')
const faker = require('faker')

const should = chai.should()

const {BlogPost} = require('../models')
const {TEST_DATABASE_URL} = require('../config')
const {runServer, app, closeServer} = require('../server')

chai.use(chaiHttp)

function seedBlogPostData() {
  console.info('seeding blog post data');
  const seedData = [];
  for (let i=1; i<=10; i++) {
    seedData.push({
      author: {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      },
      title: faker.lorem.sentence(),
      content: faker.lorem.text()
    });
  }
  // this will return a promise
  return BlogPost.insertMany(seedData)
}

function deleteDb(){
  return new Promise((resolve, reject) => {
    console.warn('Deleting database');
    mongoose.connection.dropDatabase()
      .then(result => resolve(result))
      .catch(err => reject(err))
  })
}

describe('Blog-posts API resource', function(){
  // the next methods will start the server, get the mock data, then it will delete the new
  // data generated and finally close the server for every http method
  //
  before(function(){
    return runServer(TEST_DATABASE_URL)
  })

  beforeEach(function(){
    return seedBlogPostData()
  })

  afterEach(function(){
    return deleteDb()
  })

  after(function(){
    return closeServer()
  })

  describe('GET endpoint', function(){
    it('should return all existing blog posts', function(){
      let res
      return chai.request(app)
        .get('/posts')
        .then(function(_res){
          res = _res
          res.should.have.status(200)
          res.body.should.have.length.of.at.least(1)
          return BlogPost.count()
        })
        .then(function(count){
          res.body.should.have.length.of(count)
        })
    })

    it('should return all posts fields', function(){
      let resPost
      return chai.request(app)
        .get('/posts')
        .then(function(res){
          res.should.have.status(200)
          res.should.be.json
          res.body.should.be.a('array')
          res.body.should.have.length.of.at.least(1)
          res.body.forEach(function(post){
            post.should.be.a('object')
            post.should.include.keys('id', 'title', 'author', 'content', 'created')
          })
          resPost = res.body[0]
          return BlogPost.findById(resPost.id).exec()
        })
        .then(function(post){
          resPost.id.should.equal(post.id)
          resPost.title.should.equal(post.title)
          resPost.content.should.equal(post.content)
        })
    })
  })

  describe('POST end point', function(){
    it('should be able to add a new post', function(){
      const newPost = {
        title:faker.lorem.sentence(),
        author:{
          firstName:faker.name.firstName(),
          lastName:faker.name.lastName()
        },
        content:faker.lorem.text()
      }

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res){
          res.should.have.status(201)
          res.should.be.json
          res.body.should.be.a('object')
          res.body.should.include.keys('id', 'title', 'content', 'author', 'created')
          res.body.title.should.equal(newPost.title)
          res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`)
          res.body.content.should.equal(newPost.content)
          return BlogPost.findById(res.body.id).exec()
        })
        .then(function(post){
          post.title.should.equal(newPost.title)
          post.content.should.equal(newPost.content)
          post.author.firstName.should.equal(newPost.author.firstName)
          post.author.lastName.should.equal(newPost.author.lastName)
        })
    })
  })

  describe('PUT endpoint', function(){
    it('should update a post', function(){
      const updatePost = {
        title:'United Stand',
        author:{
          firstName:'Mark',
          lastName:'Redford'
        },
        content:'Very happy with Manchester United performance against Celta de Vigo'
      }

      return BlogPost
        .findOne()
        .exec()
        .then(function(post){
          updatePost.id = post.id

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updatePost)
        })
        .then(function(res){
          res.should.have.status(201)
          res.should.be.json
          res.body.should.be.a('object')
          res.body.title.should.equal(updatePost.title)
          res.body.author.should.equal(`${updatePost.author.firstName} ${updatePost.author.lastName}`)
          res.body.content.should.equal(updatePost.content)

          return BlogPost.findById(res.body.id).exec()
        })
        .then(function(post){
          post.title.should.equal(updatePost.title)
          post.content.should.equal(updatePost.content)
          post.author.firstName.should.equal(updatePost.author.firstName)
          post.author.lastName.should.equal(updatePost.author.lastName)
        })
    })
  })

  describe('DELETE end point', function(){
    it('should delete a post', function(){
      let post
      return BlogPost
        .findOne()
        .exec()
        .then(function(_post){
          post = _post
          return chai.request(app)
            .delete(`/posts/${post.id}`)
        })
        .then(function(res){
          res.should.have.status(204)
          return BlogPost.findById(post.id)
        })
        .then(function(_post){
          should.not.exist(_post)
        })
    })
  })
})
