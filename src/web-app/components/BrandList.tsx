import React, { useState } from "react";
import { Col, Row, Image, Form } from "react-bootstrap";
import { CarBrand } from "../types";

type BrandListProps = {
  items: CarBrand[]
}

export default function BrandList({ items }: BrandListProps) {
  const [selectedItem, setSelectedItem] = useState<CarBrand>()

  const handleChange = ({target: { value }}) => {
    setSelectedItem(items.find(item => item.name === value))
  }

  return (
    <>
      <Form.Group controlId="exampleForm.ControlSelect1">
        <Form.Label>Pick the car brand</Form.Label>
        <Form.Control 
          as="select" 
          value={selectedItem && selectedItem.name} 
          onChange={handleChange}
        >
          <option key="none" value={null}></option>
          {items.map(item => (
            <option 
              key={item.name}
              selected={selectedItem && item.name === selectedItem.name} 
              value={item.name}
            >
              {item.name}
            </option>
          ))}
        </Form.Control>
      </Form.Group>
      {selectedItem && (
        <Row style={{ borderBottom: '1px solid #000', padding: '15px 0' }}>
          <Col className="d-flex justify-content-center align-items-center">
            <h4>{selectedItem.name}</h4>
          </Col>
          <Col className="d-flex justify-content-center align-items-center">
            <Image src={selectedItem.logoUrl} height="150px" width="150px" />
          </Col>
        </Row>
      )}
    </>

  )
}