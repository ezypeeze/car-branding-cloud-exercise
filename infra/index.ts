import * as pulumi from '@pulumi/pulumi'
import * as azure from '@pulumi/azure'
import * as random from '@pulumi/random'

const stack = pulumi.getStack()
const config = new pulumi.Config()
const location = config.get('location') || 'westeurope'
const defaultTags = { stack }

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup('resource-group', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-rg`,
    location
})

// Random string name for storage account (unique globally)
const storageAccountPrefix = new random.RandomString('storage-account-random', {
    length: 12,
    number: false,
    special: false,
    upper: false,
}).result

// Create an Azure Storage Account
const storageAccount = new azure.storage.Account('storage-account', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}${storageAccountPrefix}sa`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountKind: 'StorageV2',
    accountTier: 'Standard',
    accountReplicationType: 'LRS',
    allowBlobPublicAccess: true
})

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

// Define a Free plan
const servicesPlan = new azure.appservice.Plan('services-plan', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-plan`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    sku: {
        size: 'F1',
        tier: 'Free',
    },
})

// Random string name for functions app (unique globally)
const functionAppsPrefix = new random.RandomString('functions-app-random', {
    length: 12,
    number: false,
    special: false,
    upper: false,
}).result

const appInsights = new azure.appinsights.Insights(`ai`, {
    name: pulumi.interpolate`${stack}-${functionAppsPrefix}-ia`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    applicationType: "Node.JS",
});

// Function app to all functions
const functionsApp = new azure.appservice.ArchiveFunctionApp('functions-app', {
    tags: defaultTags,
    name: pulumi.interpolate`${stack}-${functionAppsPrefix}-fa`,
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    account: storageAccount,
    container: codeContainer,
    plan: servicesPlan,
    enabled: true,
    httpsOnly: true,
    version: '~3',
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
const apiGatewayService = new azure.apimanagement.Service('api-gateway', {
    tags: defaultTags,
    resourceGroupName: resourceGroup.name,
    name: pulumi.interpolate`${stack}-ag`,
    skuName: 'Developer_1',
    publisherName: 'Pedro Pereira',
    publisherEmail: 'pedromdspereira.93@gmail.com',
});

const api = new azure.apimanagement.Api('car-branding-api', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    displayName: 'Car branding',
    path: 'car-branding',
    protocols: ['https'],
    revision: '1',
    serviceUrl: functionsApp.endpoint,
});

const getCarBrandsOperation = new azure.apimanagement.ApiOperation('get-car-brands', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    urlTemplate: '/',
    method: 'GET',
    displayName: 'Get all card brands',
    operationId: 'getCarBrands',
});

const addCarBrandOperation = new azure.apimanagement.ApiOperation('add-car-brand', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    urlTemplate: '/{name}',
    method: 'POST',
    displayName: 'Add car brand',
    operationId: 'addCarBrand',
    templateParameters: [{
        name: "name",
        required: true,
        type: "string",
    }],
});

new azure.apimanagement.ApiOperationPolicy('get-car-brands-policy', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    operationId: getCarBrandsOperation.operationId,
    xmlContent: pulumi.interpolate`
        <policies>
            <inbound>
                <base />
                <set-header name="x-functions-key" exists-action="override">
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
});

new azure.apimanagement.ApiOperationPolicy('add-car-brand-policy', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    apiName: api.name,
    operationId: addCarBrandOperation.operationId,
    xmlContent: pulumi.interpolate`
        <policies>
            <inbound>
                <base />
                <set-header name="x-functions-key" exists-action="override">
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
});

const product = new azure.apimanagement.Product('car-branding', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    productId: 'car-branding',
    displayName: 'Product for Car branding',
    published: true,
    subscriptionRequired: true,
});

new azure.apimanagement.ProductApi('car-branding', {
   resourceGroupName: resourceGroup.name,
   apiManagementName: apiGatewayService.name,
   apiName: api.name,
   productId: product.productId,
});

const user = new azure.apimanagement.User('bot', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    userId: 'bot',
    firstName: 'Robo',
    lastName: 'Bot',
    email: 'robobot@carbranding.com',
 });

const subscription = new azure.apimanagement.Subscription('subscription', {
    resourceGroupName: resourceGroup.name,
    apiManagementName: apiGatewayService.name,
    displayName: 'General',
    productId: product.id,
    userId: user.id,
    state: 'active',
 });

const subscriptionKey = subscription.primaryKey
export const endpoint = pulumi.interpolate`${apiGatewayService.gatewayUrl}/${api.path}`