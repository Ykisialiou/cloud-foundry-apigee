## Manual cf operations

For now some manual steps can be executed for c2c plan to work properly

### Deploy service broker as an cloudfounry app and make it accessable

The same as for microgateway plan

### Deploy backend app without route, or remove public route from the app

`cf delete-route apps.pcf24.apigee.xyz --hostname sample-test`

### Deploy microgateway as Cloud Foundry application

the same, as for microgateway plan

### Create internal route and map it to backend application

`cf map-route sample-test apps.internal --hostname sample-test`

check the result with `cf a` command

### Open internal communication between microgateway -> backend app AND service-broker -> backend app

`cf add-network-policy edgemicro-app --destination-app sample-test --protocol tcp --port 8080`

and

`cf add-network-policy apigee-cf-service-broker --destination-app sample-test --protocol tcp --port 8080`


## Automated cf operations

c2c plan can be configured to automatically manage 
cf routes and routing bindings. 

To enable this the following steps should be done:


In this case CF LOGIN credentials should be provided
as well as CF API endpoint. Corresponding env variables 
should be set for service-broker application

`cf set-env apigee-cf-service-broker-test CF_LOGIN_PASSWORD somepass`

`cf set-env apigee-cf-service-broker-test CF_LOGIN somelogin`

`cf set-env apigee-cf-service-broker-test CF_API api.something.xyz`

then 

### Create service with c2c service plan

`cf create-service apigee-edge microgateway-c2c c2c-test  -c '{"org":"yauhenikisialiou-eval", "env":"test"}'`

### Bind route service TO microgateway application, and configure parameters properly

`cf bind-route-service apps.pcf24.apigee.xyz --hostname edgemicro-app --path sample-test.apps.pcf24.apigee.xyz c2c-test -c '{"org":"yauhenikisialiou-eval","env":"test", "bearer":"'$(cat ~/.sso-cli/valid_token.dat)'", "micro":"edgemicro-app.apps.pcf24.apigee.xyz", "target_app_route":"myroute.com","target_app_port":"11111" ,"action":"bind", "protocol":"http"}'`

`target_app_port` and `target_app_toute` are added params, internal route created in previous steps should be used here

### Access the app

App can now be accessable via microgateway application, and spetial HTTP route, created for a bakend app by service broker

`curl edgemicro-app.apps.pcf24.apigee.xyz/sample-test` 
