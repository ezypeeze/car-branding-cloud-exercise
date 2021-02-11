import React, { useState } from "react";
import { Button, Form } from "react-bootstrap";

type BrandFormProps = {
  disabled?: boolean
  onSubmit?: (values: FormData) => void
}

export default function BrandForm({ disabled, onSubmit }: BrandFormProps) {
  const [validated, setValidated] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault()
    event.stopPropagation()

    const form = event.currentTarget
    const isValid = form.checkValidity()

    setValidated(true);
    isValid && onSubmit && onSubmit(new FormData(form))
  }

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      <fieldset disabled={disabled}>
        <Form.Group>
          <Form.Label>Brand Name</Form.Label>
          <Form.Control name="name" type="text" placeholder="Enter brand name" required />
          <Form.Control.Feedback type="invalid">
            Please provide a valid name.
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group>
          <Form.File name="logo" label="Brand logo" required />
          <Form.Control.Feedback type="invalid">
            Please provide a valid name.
          </Form.Control.Feedback>
        </Form.Group>
        <Button type="submit" block>Add</Button>
      </fieldset>
    </Form>
  )
}