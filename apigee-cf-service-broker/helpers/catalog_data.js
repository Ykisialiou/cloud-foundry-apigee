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
 * Catalog data and GUIDs
 * @module
 */

var config = require('../helpers/config')
const uuidv4 = require('uuid/v4')


//const ORG_GUID = 'A98CCB00-549B-458F-A627-D54C5E860519';
//const MICRO_GUID = 'D4D617E1-B4F9-49C7-91C8-52AB9DE8C18F';
//const MICRO_CORESIDENT_GUID = 'BF677Y2P-H01Y-99SZ-0YU8-FG7A04B5CVW3';
//const MICRO_C2C_GUID = '9abe3bef-557d-4aa3-9244-c85ecea62bf1';

// Generate GUID for Org  Service Plan
const ORG_GUID = uuidv4().toUpperCase();

// Generate GUID for Micro Service Plan
const MICRO_GUID = uuidv4().toUpperCase();

// Generate GUID for Micro Coresident Service Plan
const MICRO_CORESIDENT_GUID = uuidv4().toUpperCase();

// Generate GUID for C2C Service Plan
const MICRO_C2C_GUID = uuidv4().toUpperCase();

// service catalog - TODO: this should be configurable
function getServiceCatalog () {
  return [
    {
      id: '5E3F917B-9225-4BE4-802F-8F1491F714C0',
      name: 'apigee-edge',
      description: 'Apigee Edge API Platform',
      bindable: true,
      tags: ['api', 'api management', 'api platform'],
      metadata: {
        displayName: 'Apigee Edge API Platform',
        imageUrl: 'http://apigee.com/about/sites/all/themes/apigee_themes/apigee_bootstrap/ApigeeLogo@2x.png',
        longDescription: 'Apigee Edge enables digital business acceleration with a unified and complete platform, purpose-built for the digital economy. Edge simplifies managing the entire digital value chain with API Services, Developer Services, and Analytics Services.',
        providerDisplayName: 'Apigee',
        documentationUrl: 'http://apigee.com/docs/',
        supportUrl: 'http://community.apigee.com/'
      },
      requires: ['route_forwarding'],
      plan_updateable: true,
      plans: [
        {
          id: ORG_GUID,
          name: 'org',
          description: 'Apigee Edge for Route Services',
          metadata: {
            displayName: 'Apigee Edge for Route Services'
          },
          free: true
        },
        {
          id: MICRO_GUID,
          name: 'microgateway',
          description: 'Apigee Edge Microgateway for Route Services. This plan requires launching Microgateway as a separate Cloud Foundry application',
          metadata: {
            displayName: 'Apigee Edge Microgateway for Route Services as its own Cloud Foundry application'
          },
          free: true
        },
        {
          id: MICRO_CORESIDENT_GUID,
          name: 'microgateway-coresident',
          description: 'Apigee Edge Microgateway coresident plan. Coresident means Microgateway will be on the same container as the target application',
          metadata: {
            displayName: 'Apigee Edge Microgateway coresident plan for running Microgateway on the same container as the target application'
          },
          free: true
        },
	{
	  id: MICRO_C2C_GUID,
	  name: 'microgateway-c2c',
          description: 'Apigee Edge Microgateway C2C plan. C2C means Microgateway will use CloudFounry container to container networking to access backend APP. Backend app will not have a route',
          metadata: {
            displayName: 'Apigee Edge Microgateway C2C plan for running Microgateway and backend app in the same CloudFounry internal domain'
          },
          free: true
	}
      ],
      dashboard_client: {
        id: 'apigee-dashboard-client-id',
        secret: 'secret code phrase',
        redirect_uri: 'https://enterprise.apigee.com'
      }
    }
  ]
}

module.exports = {
  guid: Object.freeze({
    org: ORG_GUID,
    micro: MICRO_GUID,
    micro_coresident: MICRO_CORESIDENT_GUID,
    micro_c2c: MICRO_C2C_GUID	  
  }),
  getServiceCatalog: getServiceCatalog
}
