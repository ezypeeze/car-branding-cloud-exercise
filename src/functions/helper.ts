import { Context } from '@azure/functions'
import { BlobServiceClient } from '@azure/storage-blob'
import { odata, TableClient } from '@azure/data-tables'
import { v4 } from 'uuid'

interface CarBrand {
  partitionKey: string;
  rowKey: string;
  name: string;
  logoBlobName: string
}

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.STORAGE_CONNECTION_STRING
)
const containerClient = blobServiceClient.getContainerClient(
  process.env.STORAGE_BLOB_CONTAINER_NAME
)
const tableClient = TableClient.fromConnectionString(
  process.env.STORAGE_CONNECTION_STRING, 
  process.env.STORAGE_TABLE_NAME
)

export const badRequest = (ctx: Context, message: string) => {
  ctx.res = { status: 400, body: { message } }
}

export const getBlobUrl = (blobName: string) => 
  containerClient.getBlockBlobClient(blobName).url

export const uploadBlob = (blobName: string, data: Buffer, contentType: string) => {
  return containerClient.uploadBlockBlob(blobName, data, data.length, {
    blobHTTPHeaders: {
        blobContentType: contentType
    }
  })
}

export const brandExists = async (name: string) : Promise<boolean> => {
  name = name.toLowerCase();
  const listResults = tableClient
    .listEntities<CarBrand>({
      queryOptions: {
        filter: odata`PartitionKey eq ${name}`
      }
    })
    .byPage({ maxPageSize: 1 })

  for await (const page of listResults) {
    return page.findIndex(x => x.name.toLowerCase() === name.toLowerCase()) > -1
  }

  return false;
}

export const createBrand = (name: string, logoBlobName: string) => {
  return tableClient.createEntity<CarBrand>({
    partitionKey: name.toLowerCase(),
    rowKey: v4(),
    name,
    logoBlobName
  });
}

export const getBrands = async () : Promise<CarBrand[]> => {
  const listResults = tableClient.listEntities<CarBrand>()

  let result : CarBrand[] = []
  for await (const page of listResults) {
    result = result.concat(page)
  }

  return result;
}