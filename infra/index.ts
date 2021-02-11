import * as pulumi from '@pulumi/pulumi'
import * as azure from '@pulumi/azure'
import * as random from '@pulumi/random'
import * as docker from '@pulumi/docker';

const stack = pulumi.getStack()
const config = new pulumi.Config()
const location = config.get('location') || 'westeurope'
const defaultTags = { stack }
const imageTag = stack

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup('resource-group', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-rg`,
    location
})

// Random string prefix for global unique names
const uniqueGloballyPrefix = new random.RandomString('storage-account-random', {
    length: 12,
    number: false,
    special: false,
    upper: false,
}).result

// Create an Azure Storage Account
const storageAccount = new azure.storage.Account('storage-account', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}${uniqueGloballyPrefix}sa`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountKind: 'StorageV2',
    accountTier: 'Standard',
    accountReplicationType: 'LRS',
    allowBlobPublicAccess: true
})

// Create Azure Container Registry
const registry = new azure.containerservice.Registry('acr', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}${uniqueGloballyPrefix}acr`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: 'Basic',
    adminEnabled: true,
});

// Logo images blob container
const logoImagesContainer = new azure.storage.Container('logos-container', {
    name: 'logos',
    storageAccountName: storageAccount.name,
    containerAccessType: 'blob'
})

// Code blob container
const codeContainer = new azure.storage.Container('code-container', {
    name: 'code',
    storageAccountName: storageAccount.name,
    containerAccessType: 'private',
})

// Table storage database (because is cheap hell!)
const tableStorage = new azure.storage.Table('table-storage', {
    name: 'carBrands',
    storageAccountName: storageAccount.name
})

// Service Plans
const basicLinuxServicePlan = new azure.appservice.Plan('basic-linux', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-basic-linux-asp`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    kind: 'linux',
    reserved: true,
    sku: {
        size: 'B1',
        tier: 'Basic',
    },
})
const basicWindowsServicePlan = new azure.appservice.Plan('basic-windows', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-basic-windows-asp`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        size: 'B1',
        tier: 'Basic',
    },
})

// Common Application Insights
const appInsights = new azure.appinsights.Insights(`ai`, {
    name: pulumi.interpolate`${stack}-${uniqueGloballyPrefix}-ia`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    applicationType: 'Node.JS',
})

// Function app to all functions
const functionsApp = new azure.appservice.ArchiveFunctionApp('functions-app', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-${uniqueGloballyPrefix}-fa`,
    resourceGroup: resourceGroup,
    location: resourceGroup.location,
    account: storageAccount,
    container: codeContainer,
    plan: basicWindowsServicePlan,
    enabled: true,
    httpsOnly: true,
    appSettings: {
        APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.instrumentationKey,
        APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.connectionString,
        STORAGE_CONNECTION_STRING: storageAccount.primaryConnectionString,
        STORAGE_BLOB_CONTAINER_NAME: logoImagesContainer.name,
        STORAGE_TABLE_NAME: tableStorage.name
    },
    archive: new pulumi.asset.FileArchive('../src/functions')
})

// Creating a new host key doesn't seem to be possible, we use the default one (not master!)
const functionAppHostKey = functionsApp.functionApp.getHostKeys()
    .functionKeys
    .apply(p => p.default)

// Create the API Management
const apiGatewayService = new azure.apimanagement.Service('apim', {
    tags: defaultTags,
    resourceGroupName: resourceGroup.name,
    name: pulumi.interpolate`${stack}-${uniqueGloballyPrefix}-apim`,
    skuName: 'Developer_1',
    publisherName: 'Pedro Pereira',
    publisherEmail: 'pedromdspereira.93@gmail.com',
})

const api = new azure.apimanagement.Api('apim', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    displayName: 'Car branding',
    path: 'car-branding',
    protocols: ['https'],
    revision: '1',
    serviceUrl: functionsApp.endpoint,
})

const getCarBrandsOperation = new azure.apimanagement.ApiOperation('apim-get-car-brands', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    urlTemplate: '/',
    method: 'GET',
    displayName: 'Get all card brands',
    operationId: 'getCarBrands',
})

const addCarBrandOperation = new azure.apimanagement.ApiOperation('apim-add-car-brand', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    urlTemplate: '/{name}',
    method: 'POST',
    displayName: 'Add car brand',
    operationId: 'addCarBrand',
    templateParameters: [{
        name: 'name',
        required: true,
        type: 'string',
    }],
})

new azure.apimanagement.ApiOperationPolicy('apim-get-car-brands-policy', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    operationId: getCarBrandsOperation.operationId,
    xmlContent: pulumi.interpolate`
        <policies>
            <inbound>
                <base />
                <set-header name='x-functions-key' exists-action='override'>
                    <value>${functionAppHostKey}</value>
                </set-header>
                <rewrite-uri template='/GetCarBrands' />
            </inbound>
            <backend>
                <base />
            </backend>
            <outbound>
                <base />
            </outbound>
            <on-error>
                <base />
            </on-error>
        </policies>
    `,
})

new azure.apimanagement.ApiOperationPolicy('apim-add-car-brand-policy', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    operationId: addCarBrandOperation.operationId,
    xmlContent: pulumi.interpolate`
        <policies>
            <inbound>
                <base />
                <set-header name='x-functions-key' exists-action='override'>
                    <value>${functionAppHostKey}</value>
                </set-header>
                <rewrite-uri template='/AddCarBrand?name={name}' />
            </inbound>
            <backend>
                <base />
            </backend>
            <outbound>
                <base />
            </outbound>
            <on-error>
                <base />
            </on-error>
        </policies>
    `,
})

const product = new azure.apimanagement.Product('apimp-car-branding', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    productId: 'car-branding',
    displayName: 'Product for Car branding',
    published: true,
    subscriptionRequired: true,
})

new azure.apimanagement.ProductApi('apimpa-car-branding', {
   resourceGroupName: resourceGroup.name,
   apiManagementName: apiGatewayService.name,
   apiName: api.name,
   productId: product.productId,
})

const user = new azure.apimanagement.User('apim-user', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    userId: 'bot',
    firstName: 'Robo',
    lastName: 'Bot',
    email: 'robobot@carbranding.com',
 })

const subscription = new azure.apimanagement.Subscription('apim-subscription', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    displayName: 'General',
    productId: product.id,
    userId: user.id,
    state: 'active',
 })

export const apimEndpoint = pulumi.interpolate`${apiGatewayService.gatewayUrl}/${api.path}`

const webAppImage = new docker.Image('web-app', {
    imageName: pulumi.interpolate`${registry.loginServer}/web-app:${imageTag}`,
    build: {
        context: '../src/web-app',
    },
    registry: {
        server: registry.loginServer,
        username: registry.adminUsername,
        password: registry.adminPassword,
    },
});

const appService = new azure.appservice.AppService('web-app', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-${uniqueGloballyPrefix}-wa`,
    resourceGroupName: resourceGroup.name,
    appServicePlanId: basicLinuxServicePlan.id,
    appSettings: {
        WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false',
        DOCKER_REGISTRY_SERVER_URL: pulumi.interpolate`https://${registry.loginServer}`,
        DOCKER_REGISTRY_SERVER_USERNAME: registry.adminUsername,
        DOCKER_REGISTRY_SERVER_PASSWORD: registry.adminPassword,
        WEBSITES_PORT: '3000',
        APIM_ENDPOINT: apiGatewayService.gatewayUrl,
        APIM_SUBSCRIPTION_KEY: subscription.primaryKey
    },
    siteConfig: {
        alwaysOn: false,
        linuxFxVersion: pulumi.interpolate`DOCKER|${webAppImage.imageName}`,
    },
    httpsOnly: true,
});

export const webAppEndpoint = pulumi.interpolate`https://${appService.defaultSiteHostname}`