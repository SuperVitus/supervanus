const express = require('express')
const next = require('next')
const { createServer } = require('http')
const { graphqlExpress, graphiqlExpress } = require('graphql-server-express')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const bodyParser = require('body-parser')
const { execute, subscribe } = require('graphql')
const  schema = require('./schema')

const dev = process.env.NODE_ENV !== 'production'
const app = next({dev})
const handle = app.getRequestHandler()

const graphqlPath = '/graphql'
const graphiqlPath = '/graphiql'
const graphqlOptions = {schema}
const subscriptionsPath = '/subscriptions'

const graphiqlOptions = {
  endpointURL: graphqlPath,
  subscriptionsEndpoint: 'ws://localhost:3000' + subscriptionsPath
}

app.prepare()
.then(() => {
  const server = express()
  const httpServer = createServer(server)

  server.use(graphqlPath, bodyParser.json(), graphqlExpress(req => {
    const query = req.query.query || req.body.query
    if (query && query.length > 2000) {
      throw new Error('Query too large.')
    }

    return Object.assign({}, graphqlOptions)
  }))

  server.use(graphiqlPath, graphiqlExpress(graphiqlOptions))

  server.get('*', (req, res) => {
    return handle(req, res)
  })

  httpServer.listen(3000, '0.0.0.0', (err) => {
    if (err) throw err
    console.log('> ready on localhost:3000')
  })

  new SubscriptionServer(
    {
      schema,
      execute,
      subscribe,
      onDisconnect () {
        console.log('Client disconnected')
      }
    },
    {
      server: httpServer, 
      path: subscriptionsPath
    }
  )
})