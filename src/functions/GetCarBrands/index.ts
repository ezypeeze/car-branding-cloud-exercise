import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { getBlobUrl, getBrands } from '../helper';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.')
    try {
        const carBrands = await getBrands()

        context.res = {
            body: carBrands.map(carBrand => ({
                name: carBrand.name,
                logoUrl: getBlobUrl(carBrand.logoBlobName)
            }))
        }
    } catch (err) {
        context.log.error(err)
    }
    
};

export default httpTrigger;