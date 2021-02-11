import { NextApiRequest, NextApiResponse } from 'next'
import formidable  from 'formidable';
import fs from 'fs'
import { addBrand, getBrands } from '../../../services/api'

const form = formidable({ multiples:  true });

const getMultipartInput = (req: NextApiRequest) : Promise<any> => new Promise((resolve, reject) => {
  form.parse(req, (err, fields, files) => {
    if (err) return reject(err)

    return resolve({ fields, files })
  })
})

const getFileContent = (path: string) : Promise<Buffer> => new Promise((resolve, reject) => {
  fs.readFile(path, (err, data) => {
    if (err) return reject(err)
    resolve(data)
  })
})

export const config = {
  api: {
    bodyParser: false
  }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    return res.json(await getBrands())
  } else if (req.method === 'POST') {
    const contentType = req.headers['content-type']
    if (!contentType || contentType.indexOf('multipart/form-data') === -1) {
      return res.status(400).json({ message: 'content-type must be multipart/form-data'})
    }
    
    const { fields: { name }, files: { logo } } = await getMultipartInput(req)
    if (!name) {
      return res.status(400).json({ message: "field named 'name' is required"})
    }

    if (!logo) {
      return res.status(400).json({ message: "file named 'logo' is required"})
    }

    const result = await addBrand(name, await getFileContent(logo.path))
    if (result) {
      return res.status(200).json({ message: 'success' })
    } else {
      return res.status(400).json({ message: 'error occured' })
    }
  }

  return res.status(405).json({ message: 'method not allowed'})
}
