import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { v4 } from 'uuid'
import { fromBuffer } from 'file-type'
import { badRequest, brandExists, createBrand, uploadBlob } from '../helper'

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if (req.headers['content-type'] !== 'application/octet-stream') {
        return badRequest(context, "content-type must be 'application/octet-stream'") 
    }

    if (!req.query.name || req.query.name.length === 0) {
        return badRequest(context, "name' is required'")
    }

    let buffer: Buffer | Uint8Array | ArrayBuffer
    try {
        buffer = Buffer.from(req.body, 'binary')
    } catch {
        return badRequest(context, 'valid binary data required')
    }

    try {
        const { ext, mime } = await fromBuffer(buffer)

        if (!mime.includes('image')) throw 'not valid'

        let exists = await brandExists(req.query.name)
        if (exists) {
            return badRequest(context, `Car brand ${req.query.name} already contains a logo`)
        } else {
            const blobName = `${v4()}.${ext}`
            await uploadBlob(blobName, Buffer.from(req.body), mime)
            await createBrand(req.query.name, blobName)
        }

        context.res = { status: 204 }
    } catch {
        return badRequest(context, 'binary data is not a valid image')
    }
}

export default httpTrigger