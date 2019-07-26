'use strict'
/*
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Implementation of [service broker API for CF](http://docs.cloudfoundry.org/services/api.html)
 *
 * @module
 */

var config = require('../helpers/config')
var express = require('express')
var router = express.Router()
var validate = require('express-jsonschema').validate
var bindingSchema = require('../schemas/service_binding')
var auth = require('../helpers/auth')(config)
var catalogData = require('../helpers/catalog_data')
var service_binding = require('../helpers/service_binding')
var logger = require('../helpers/logger')
var log = require('bunyan').createLogger({name: 'apigee', src: true})

router.use(auth)

function checkNonCoresidentPlan(params){
  var loggerError
  if (params.hasOwnProperty('target_app_route')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"target_app_route" parameter is invalid')
  }
  else if (params.hasOwnProperty('target_app_port')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"target_app_port" parameter is invalid')
  }
  else if (params.hasOwnProperty('edgemicro_key')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"edgemicro_key" parameter is invalid')
  }
  else if (params.hasOwnProperty('edgemicro_secret')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"edgemicro_secret" parameter is invalid')
  }
  return loggerError
}

function checkCoresidentPlan(params, bind_resource){
  var loggerError
  if (!params.hasOwnProperty('target_app_route')) {
    loggerError = logger.ERR_MISSING_MICRO_CORES_PARAMETER(null,null, '"target_app_route"')
  }
  else if (!params.hasOwnProperty('target_app_port')) {
    loggerError = logger.ERR_MISSING_MICRO_CORES_PARAMETER(null,null, '"target_app_port"')
  }
  else if (!params.hasOwnProperty('edgemicro_key')) {
    loggerError = logger.ERR_MISSING_MICRO_CORES_PARAMETER(null,null, '"edgemicro_key"')
  }
  else if (!params.hasOwnProperty('edgemicro_secret')) {
    loggerError = logger.ERR_MISSING_MICRO_CORES_PARAMETER(null,null, '"edgemicro_secret"')
  }
  else if (params.hasOwnProperty('micro')) {
    loggerError = logger.ERR_NOT_MICRO_PLAN()
  } 
  else if (bind_resource.hasOwnProperty('route')){
    loggerError = logger.ERR_BAD_BIND_COMMAND()
  }
  return loggerError
}

// C2C plan validation funtion

function checkC2CPlan(params, bind_resource){
  var loggerError
  if (!params.hasOwnProperty('target_app_route')) {
    loggerError = logger.ERR_MISSING_MICRO_C2C_PARAMETER(null,null, '"target_app_route"')
  }
  else if (!params.hasOwnProperty('target_app_port')) {
    loggerError = logger.ERR_MISSING_MICRO_C2C_PARAMETER(null,null, '"target_app_port"')
  }
  else if (params.hasOwnProperty('micro')) {
    loggerError = logger.ERR_NOT_MICRO_PLAN()
  }
  else if (params.hasOwnProperty('edgemicro_key')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"edgemicro_key" parameter is invalid')
  }
  else if (params.hasOwnProperty('edgemicro_secret')) {
    loggerError = logger.ERR_NOT_MICRO_CORES_PLAN(null, null, '"edgemicro_secret" parameter is invalid')
  }

  return loggerError	
}


// plan schema validation
function planValidate (req, res, next) {
  var loggerError
  if (req.body.plan_id === catalogData.guid.org) {
    //org plan
    loggerError = checkNonCoresidentPlan(req.body.parameters)
    if (loggerError){
      res.status(400)
      res.json(loggerError)
    }
    else if (req.body.parameters.hasOwnProperty('micro')) {
      res.status(400)
      loggerError = logger.ERR_NOT_MICRO_PLAN()
      res.json(loggerError)
    } else {
      next()
    }
  } 
  else if (req.body.plan_id === catalogData.guid.micro_coresident) {
    // micro coresident plan
    loggerError = checkCoresidentPlan(req.body.parameters, req.body.bind_resource)
    if (loggerError){
      res.status(400)
      res.json(loggerError)
    } else {
      next()
    }
  } 
  else if (req.body.plan_id === catalogData.guid.micro) {
    // micro plan
    loggerError = checkNonCoresidentPlan(req.body.parameters)
    if (loggerError){
      res.status(400)
      res.json(loggerError)
    }
    else if (!req.body.parameters.hasOwnProperty('micro')){
      res.status(400)
      loggerError = logger.ERR_MICRO_PLAN_REQUIRES_MICRO()
      res.json(loggerError)
    } else {
      next()
    }
  }	  
  else if (req.body.plan_id === catalogData.guid.micro_c2c) {
    // Micro C2C plan
    // Check C2C plan prameters placeholder
    loggerError = checkC2CPlan(req.body.parameters)
    console.log("c2c plan") //TODO: remove me
    
    next()
  } 
  else {
    // unknown plan
    res.status(400)
    loggerError = logger.ERR_INVALID_SERVICE_PLAN()
    res.json(loggerError)
  }
}

function authValidate (req, res, next) {
  const params = req.body.parameters;
  if (params.user && params.pass) {
    next()
  } else if (params.basic) {
    next()
  } else if (params.bearer) {
    next()
  } else {
    res.status(400)
    var loggerError = logger.ERR_MISSING_AUTH()
    res.json(loggerError)
  }
}

const verbs = ['proxy', 'bind']

function deriveAction (params) {
  const action = params.action ? params.action.toString() : ''
  const ret = {
    any: false,
    errors: []
  }
  verbs.forEach(function (verb) {
    ret[verb] = false
  })
  action.split(/[\s,]+/).forEach(function (value) {
    const lower = value.toLowerCase()
    if (verbs.indexOf(lower) >= 0) {
      ret.any = true
      ret[lower] = true
    }
    else if (value) {
      ret.errors.push(value)
    }
  })
  return ret
}

const quoteAction = (value) => '"' + value + '"'

function actionValidate(req, res, next) {
  const action = deriveAction(req.body.parameters)
  if (action.errors.length) {
    res.status(400)
    var loggerError = logger.ERR_SPECIFIED_UNSUPPORTED_ACTION(null, null, action.errors.map(quoteAction).join(', '))
    res.json(loggerError)
  }
  else if (action.any) {
    next()
  }
  else {
    res.status(400)
    var loggerError = logger.ERR_MISSING_SUPPORTED_ACTION(null, null, verbs.map(quoteAction).join(' or '))
    res.json(loggerError)
  }
}

function deriveProtocol(params){
  //default to https if no protocol is provided
  const proto = params.protocol ? params.protocol.toString().trim().toLowerCase() : 'https'
  const ret = {}
  if (proto === "http" || proto === "https"){
    ret.protocol = proto
  }
  else if (params.protocol){
    ret.error = params.protocol.toString()
  }
  return ret
}

function protocolValidate(req, res, next){
  const proto = deriveProtocol(req.body.parameters)
  if ("error" in proto) {
    res.status(400)
    var loggerError = logger.ERR_INVALID_TARGET_PROTOCOL(null, null, '"' + proto.error + '". A valid "protocol" is either "http" or "https".')
    res.json(loggerError)
  }
  else {
    next()
  }
 }

 function configValidate(req, res, next){
  var org = (req.body.parameters && req.body.parameters.org) ? req.body.parameters.org.toString().trim() : ''
  var env = (req.body.parameters && req.body.parameters.env) ? req.body.parameters.env.toString().trim() : ''
  var loggerError
  if (org && env) {
    config.getApigeeConfiguration(org, env, function(err, data){
      if (err){
        loggerError = err
      }
    })
    if (loggerError){
      res.status(400)
      res.json(loggerError)
    }
    else {
      next()
    }
  }
  else if (org){
    res.status(400)
    loggerError = logger.ERR_MISSING_ENV()
    res.json(loggerError)
  }
  else if (env){
    res.status(400)
    loggerError = logger.ERR_MISSING_ORG()
    res.json(loggerError)
  }
  else{
    res.status(400)
    loggerError = logger.ERR_MISSING_ENV_ORG()
    res.json(loggerError)
  }
}

function deriveMicroParams(params){
  const microParams = {
    target_app_port: params.target_app_port.toString().trim(),
    target_app_route: params.target_app_route.toString().trim(),
    edgemicro_key: params.edgemicro_key.toString().trim(),
    edgemicro_secret: params.edgemicro_secret.toString().trim()
  }
  return microParams
}

function deriveC2CParams(params) {
  const c2cParams = {
    target_app_port: params.target_app_port.toString().trim(),
    target_app_route: params.target_app_route.toString().trim()    
  }
  return c2cParams	
}

// provising a service instance
router.put('/:instance_id', configValidate, function (req, res) {
  var org = req.body.parameters.org.toString().trim()
  var env = req.body.parameters.env.toString().trim()
  var r = {
    dashboard_url: config.getApigeeConfiguration(org, env, function(err, data){  
      return data.get('APIGEE_DASHBOARD_URL')
    })
  }
  res.status(201).json(r)
})

// update a service instance
router.patch('/:instance_id', function (req, res) {
  res.status(422).json({description: 'Automatic plan changes are not supported today. Please contact Apigee Support.'})
})

// deprovision a service instance
router.delete('/:instance_id', function (req, res) {
  res.json({})
})

// create binding
// sample request to PUT /cf-apigee-broker/v2/service_instances/5a76d1c5-4bc3-455a-98b1-e3c079dc5cb2/service_bindings/7ed4c3d3-c3a4-41b6-9acc-72b3a7fa2f39
// payload {"service_id":"5E3F917B-9225-4BE4-802F-8F1491F714C0","plan_id":"D4D617E1-B4F9-49C7-91C8-52AB9DE8C18F","bind_resource":{"route":"rot13.apigee-cloudfoundry.com"}}
// response should be route_service_url	string	A URL to which Cloud Foundry should proxy requests for the bound route.
router.put('/:instance_id/service_bindings/:binding_id',
    validate({body: bindingSchema.bind}), planValidate, authValidate, actionValidate, protocolValidate, configValidate, function (req, res) {
  // use instance_id to retrieve org and environment for proxy
  var bindReq = {
    instance_id: req.params.instance_id,
    binding_id: req.params.binding_id,
    service_id: req.body.service_id,
    plan_id: req.body.plan_id,
    bind_resource: req.body.bind_resource,
    action: deriveAction(req.body.parameters),
    org: req.body.parameters.org,
    env: req.body.parameters.env,
    user: req.body.parameters.user,
    pass: req.body.parameters.pass,
    basic: req.body.parameters.basic,
    bearer: req.body.parameters.bearer,
    micro: req.body.parameters.micro,
    micro_coresident: (req.body.plan_id === catalogData.guid.micro_coresident) ? deriveMicroParams(req.body.parameters) : {},
    micro_c2c: (req.body.plan_id === catalogData.guid.micro_c2c) ? deriveC2CParams(req.body.parameters) : {},
    host: req.body.parameters.host,
    protocol: deriveProtocol(req.body.parameters).protocol,
    configuration: config.getApigeeConfiguration(req.body.parameters.org, req.body.parameters.env, function(err, data){return data})
  }
  // create proxy in org that handles the url (bind_resource.route) and dynamically sets target
  service_binding.create(bindReq, function (err, result) {
    if (err) {
      res.status(err.statusCode || 500).json(err)
    } else {
      var r = {credentials: result.credentials}
      // don't return a route_service_url on a cf bind-service
      if (bindReq.plan_id !== catalogData.guid.micro_coresident) {
        r.route_service_url = result.proxyURL
        log.info(r.route_service_url)
      }
      res.status(201).json(r)
    }
  })
})

// delete binding
router.delete('/:instance_id/service_bindings/:binding_id', function (req, res) {
  res.json({})
})

/**
 * Router for `/service_instances`
 * @type express.Router
 */
module.exports = router
