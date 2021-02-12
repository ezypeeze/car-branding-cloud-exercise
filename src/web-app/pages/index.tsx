import React, { useEffect, useState } from 'react'
import BrandForm from '../components/BrandForm'
import BrandList from '../components/BrandList'
import Loading from '../components/Loading'
import { CarBrand } from '../types'

const parseResponse = async (res: Response) => {
  if (res.status !== 200 && res.status !== 400) {
    throw new Error('Cannot fetch brands')
  }

  if (res.status === 400) {
    const { message } = await res.json()
    throw new Error(message)
  }

  return res.json();
}

const createBrand = async (formData: FormData) => {
  return parseResponse(await fetch('/api/brands', { 
    method: 'post',
    body: formData
  }))
}

const fetchBrands = async () => {
  return parseResponse(await fetch('/api/brands', { method: 'get' }))
}

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string>()
  const [formError, setFormError] = useState<string>()
  const [brands, setBrands] = useState<CarBrand[]>([])

  const fetch = async () => {
    try {
      setLoading(true)
      setBrands(await fetchBrands())
    } catch (err) {
      setListError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const create = async (formData: FormData) => {
    try {
      setLoading(true)
      await createBrand(formData)
      fetch()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  return (
    <>
      <h3>Add brand logo</h3>
      <hr />
      <BrandForm onSubmit={create} disabled={loading} />
      {formError && (
        <div className="text-center">{formError}</div>
      )}

      <h3 className="mt-3">Brand List</h3>
      <hr />
      {loading ? <Loading /> : <BrandList items={brands} />}
      {listError && (
        <div className="text-center">{listError}</div>
      )}
    </>
  )
}
