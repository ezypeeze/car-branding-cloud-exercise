import fetch from 'node-fetch'
import { CarBrand } from '../types'

const { APIM_ENDPOINT, APIM_SUBSCRIPTION_KEY } = process.env

export async function getBrands() : Promise<CarBrand[]> {
  const res = await fetch(`${APIM_ENDPOINT}/car-branding`, {
    method: 'get',
    headers: {
      'Ocp-Apim-Subscription-Key': APIM_SUBSCRIPTION_KEY
    }
  })

  return res.json()
}

export async function addBrand(name: string, fileData: Buffer) : Promise<boolean> {
  const res = await fetch(`${APIM_ENDPOINT}/car-branding/${name}`, {
    method: 'post',
    body: fileData,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': APIM_SUBSCRIPTION_KEY
    }
  })

  return res.status === 204
}